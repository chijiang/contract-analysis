import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createProcessingLog } from "@/lib/processing-logs"
import {
  extractAndPersistServiceInfo,
  parseServiceInfoSnapshotPayload,
} from "@/app/api/contracts/_helpers/service-info"

type RouteContext = { params: Promise<{ contractId: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { contractId } = await params
  if (!contractId) {
    return NextResponse.json({ message: "缺少合同ID" }, { status: 400 })
  }

  const snapshot = await prisma.contractServiceInfoSnapshot.findUnique({ where: { contractId } })
  const payload = parseServiceInfoSnapshotPayload(snapshot?.payload)

  return NextResponse.json({
    source: snapshot ? "cached" : "empty",
    snapshot: payload,
  })
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { contractId } = await params
  
  if (!contractId) {
    return NextResponse.json({ message: "缺少合同ID" }, { status: 400 })
  }

  const payload = (await req.json().catch(() => null)) as { markdown?: string } | null
  const markdown = payload?.markdown

  const startedAt = Date.now()
  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  const content = typeof markdown === "string" && markdown.length > 0 ? markdown : contract?.markdown || ""

  if (!content) {
    return NextResponse.json({ message: "缺少合同Markdown内容" }, { status: 400 })
  }

  try {
    const snapshot = await extractAndPersistServiceInfo(contractId, content, { suppressErrors: false })

    await createProcessingLog({
      contractId,
      action: "SERVICE_INFO_EXTRACTION",
      description: "触发服务信息分析并入库",
      source: "AI",
      status: "SUCCESS",
      durationMs: Date.now() - startedAt,
    })

    // 更新合同处理状态为完成（如果当前处于失败状态）
    const currentContract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { processingStatus: true },
    })
    
    if (currentContract?.processingStatus === "FAILED" || currentContract?.processingStatus === "PROCESSING_SERVICE_INFO") {
      await prisma.contract.update({
        where: { id: contractId },
        data: { 
          processingStatus: "COMPLETED",
          processingError: null,
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      source: "fresh",
      snapshot,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    
    await createProcessingLog({
      contractId,
      action: "SERVICE_INFO_EXTRACTION",
      description: "服务信息分析失败",
      source: "AI",
      status: "ERROR",
      durationMs: Date.now() - startedAt,
      metadata: { error: message },
    })
    return NextResponse.json({ message }, { status: 500 })
  }
}


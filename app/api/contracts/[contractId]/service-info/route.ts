import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createProcessingLog } from "@/lib/processing-logs"
import { extractAndPersistServiceInfo } from "@/app/api/contracts/_helpers/service-info"

type RouteContext = { params: { contractId: string } }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { contractId } = params
  if (!contractId) {
    return NextResponse.json({ message: "缺少合同ID" }, { status: 400 })
  }

  const [devices, maints, digitals, trainings, compliance, afterSales] = await Promise.all([
    prisma.contractDeviceInfo.findMany({ where: { contractId }, orderBy: { createdAt: "asc" } }),
    prisma.contractMaintenanceServiceInfo.findMany({ where: { contractId }, orderBy: { createdAt: "asc" } }),
    prisma.contractDigitalSolutionInfo.findMany({ where: { contractId }, orderBy: { createdAt: "asc" } }),
    prisma.contractTrainingSupportInfo.findMany({ where: { contractId }, orderBy: { createdAt: "asc" } }),
    prisma.contractComplianceInfo.findUnique({ where: { contractId } }),
    prisma.contractAfterSalesSupportInfo.findUnique({ where: { contractId } }),
  ])

  return NextResponse.json({
    devices,
    maintenanceServices: maints,
    digitalSolutions: digitals,
    trainingSupports: trainings,
    complianceInfo: compliance,
    afterSalesSupport: afterSales,
  })
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { contractId } = params
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
    await extractAndPersistServiceInfo(contractId, content, { suppressErrors: false })

    await createProcessingLog({
      contractId,
      action: "SERVICE_INFO_EXTRACTION",
      description: "触发服务信息分析并入库",
      source: "AI",
      status: "SUCCESS",
      durationMs: Date.now() - startedAt,
    })

    const data = await prisma.$transaction([
      prisma.contractDeviceInfo.findMany({ where: { contractId }, orderBy: { createdAt: "asc" } }),
      prisma.contractMaintenanceServiceInfo.findMany({ where: { contractId }, orderBy: { createdAt: "asc" } }),
      prisma.contractDigitalSolutionInfo.findMany({ where: { contractId }, orderBy: { createdAt: "asc" } }),
      prisma.contractTrainingSupportInfo.findMany({ where: { contractId }, orderBy: { createdAt: "asc" } }),
      prisma.contractComplianceInfo.findUnique({ where: { contractId } }),
      prisma.contractAfterSalesSupportInfo.findUnique({ where: { contractId } }),
    ])

    return NextResponse.json({
      source: "fresh",
      devices: data[0],
      maintenanceServices: data[1],
      digitalSolutions: data[2],
      trainingSupports: data[3],
      complianceInfo: data[4],
      afterSalesSupport: data[5],
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



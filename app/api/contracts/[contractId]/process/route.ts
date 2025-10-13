import { NextRequest, NextResponse } from "next/server"
import { handleContractNotificationTriggers } from "@/app/api/contracts/_helpers/notification-runner"
import { prisma } from "@/lib/prisma"
import { createProcessingLog } from "@/lib/processing-logs"

type RouteContext = {
  params: Promise<{ contractId: string }>
}

/**
 * 后台处理合同分析和服务信息提取
 * 这个端点会在后台异步执行，不会阻塞前端
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { contractId } = await params
  const body = await req.json()
  const { templateIds } = body as { templateIds?: string[] }

  try {
    // 获取合同信息
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { 
        id: true, 
        markdown: true,
        processingStatus: true,
      },
    })

    if (!contract) {
      return NextResponse.json(
        { message: "合同不存在" },
        { status: 404 }
      )
    }

    if (!contract.markdown) {
      return NextResponse.json(
        { message: "合同缺少Markdown内容" },
        { status: 400 }
      )
    }

    // 如果已经在处理中或已完成，不重复处理
    if (contract.processingStatus === "PROCESSING_ANALYSIS" || 
        contract.processingStatus === "PROCESSING_SERVICE_INFO") {
      return NextResponse.json(
        { message: "合同正在处理中", processingStatus: contract.processingStatus },
        { status: 200 }
      )
    }

    // 启动异步处理（不等待完成）
    processContractInBackground(contractId, contract.markdown, templateIds).catch((error) => {
      console.error(`Background processing failed for contract ${contractId}:`, error)
    })

    return NextResponse.json({ 
      message: "后台处理已启动",
      contractId,
    }, { status: 202 }) // 202 Accepted
  } catch (error) {
    console.error("Failed to start background processing:", error)
    return NextResponse.json(
      { message: "启动后台处理失败" },
      { status: 500 }
    )
  }
}

/**
 * 后台处理函数，执行分析和服务信息提取
 */
async function processContractInBackground(
  contractId: string,
  markdown: string,
  templateIds?: string[]
) {
  try {
    // 1. 执行合同分析
    await updateContractStatus(contractId, "PROCESSING_ANALYSIS")
    
    if (templateIds && templateIds.length > 0) {
      const analysisStartTime = Date.now()
      
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/contracts/${contractId}/analysis`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              markdown,
              template_ids: templateIds,
              force: false,
            }),
          }
        )

        if (!response.ok) {
          throw new Error(`Analysis request failed: ${response.status}`)
        }

        await createProcessingLog({
          contractId,
          action: "CONTRACT_ANALYSIS",
          description: "后台合同分析完成",
          source: "BACKGROUND",
          status: "SUCCESS",
          durationMs: Date.now() - analysisStartTime,
        })
      } catch (error) {
        await createProcessingLog({
          contractId,
          action: "CONTRACT_ANALYSIS",
          description: "后台合同分析失败",
          source: "BACKGROUND",
          status: "ERROR",
          durationMs: Date.now() - analysisStartTime,
          metadata: { error: error instanceof Error ? error.message : String(error) },
        })
        throw error
      }
    }

    // 2. 提取服务信息
    await updateContractStatus(contractId, "PROCESSING_SERVICE_INFO")
    
    const serviceInfoStartTime = Date.now()
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/contracts/${contractId}/service-info`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown }),
        }
      )

      if (!response.ok) {
        throw new Error(`Service info request failed: ${response.status}`)
      }

      await createProcessingLog({
        contractId,
        action: "SERVICE_INFO_EXTRACTION",
        description: "后台服务信息提取完成",
        source: "BACKGROUND",
        status: "SUCCESS",
        durationMs: Date.now() - serviceInfoStartTime,
      })
    } catch (error) {
      await createProcessingLog({
        contractId,
        action: "SERVICE_INFO_EXTRACTION",
        description: "后台服务信息提取失败",
        source: "BACKGROUND",
        status: "ERROR",
        durationMs: Date.now() - serviceInfoStartTime,
        metadata: { error: error instanceof Error ? error.message : String(error) },
      })
      // 服务信息提取失败不阻止完成状态
      console.error("Service info extraction failed:", error)
    }

    // 3. 标记为完成
    await updateContractStatus(contractId, "COMPLETED")
  } catch (error) {
    // 处理失败，记录错误
    await updateContractStatus(
      contractId, 
      "FAILED", 
      error instanceof Error ? error.message : String(error)
    )
  }
}

/**
 * 更新合同处理状态
 */
async function updateContractStatus(
  contractId: string,
  status: string,
  error?: string
) {
  await prisma.contract.update({
    where: { id: contractId },
    data: {
      processingStatus: status,
      processingError: error || null,
      updatedAt: new Date(),
    },
  })

  if (status === "COMPLETED" || status === "FAILED") {
    handleContractNotificationTriggers(contractId).catch((notificationError) => {
      console.error("Failed to process notification triggers:", notificationError)
    })
  }
}

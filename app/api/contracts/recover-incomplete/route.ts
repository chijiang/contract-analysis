import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * 恢复未完成的合同处理任务
 * 查找所有处于处理中状态但长时间未更新的合同，并重新触发处理
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { templateIds } = body as { templateIds?: string[] }

    // 查找所有处于处理中状态的合同（超过5分钟未更新的）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const incompleteContracts = await prisma.contract.findMany({
      where: {
        OR: [
          { processingStatus: "PENDING" },
          { processingStatus: "PROCESSING_BASIC_INFO" },
          { processingStatus: "PROCESSING_ANALYSIS" },
          { processingStatus: "PROCESSING_SERVICE_INFO" },
        ],
        updatedAt: {
          lt: fiveMinutesAgo,
        },
      },
      select: {
        id: true,
        processingStatus: true,
        updatedAt: true,
        markdown: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 10, // 一次最多恢复10个任务
    })

    if (incompleteContracts.length === 0) {
      return NextResponse.json({
        message: "没有需要恢复的任务",
        count: 0,
      })
    }

    // 为每个未完成的合同重新触发处理
    const recoveryPromises = incompleteContracts.map(async (contract) => {
      try {
        // 重置状态为PENDING
        await prisma.contract.update({
          where: { id: contract.id },
          data: {
            processingStatus: "PENDING",
            processingError: null,
            updatedAt: new Date(),
          },
        })

        // 触发后台处理
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        const response = await fetch(
          `${baseUrl}/api/contracts/${contract.id}/process`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ templateIds }),
          }
        )

        if (!response.ok) {
          console.error(`Failed to recover contract ${contract.id}: ${response.status}`)
          return { id: contract.id, status: "failed" }
        }

        return { id: contract.id, status: "recovered" }
      } catch (error) {
        console.error(`Error recovering contract ${contract.id}:`, error)
        return { id: contract.id, status: "error" }
      }
    })

    const results = await Promise.all(recoveryPromises)

    return NextResponse.json({
      message: "任务恢复已启动",
      count: incompleteContracts.length,
      results,
    })
  } catch (error) {
    console.error("Failed to recover incomplete contracts:", error)
    return NextResponse.json(
      { message: "恢复任务失败" },
      { status: 500 }
    )
  }
}

/**
 * 获取所有未完成的合同列表
 */
export async function GET() {
  try {
    // 查找所有处于处理中状态的合同
    const incompleteContracts = await prisma.contract.findMany({
      where: {
        OR: [
          { processingStatus: "PENDING" },
          { processingStatus: "PROCESSING_BASIC_INFO" },
          { processingStatus: "PROCESSING_ANALYSIS" },
          { processingStatus: "PROCESSING_SERVICE_INFO" },
        ],
      },
      select: {
        id: true,
        originalFileName: true,
        processingStatus: true,
        processingError: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    return NextResponse.json({
      count: incompleteContracts.length,
      contracts: incompleteContracts,
    })
  } catch (error) {
    console.error("Failed to fetch incomplete contracts:", error)
    return NextResponse.json(
      { message: "获取未完成任务失败" },
      { status: 500 }
    )
  }
}


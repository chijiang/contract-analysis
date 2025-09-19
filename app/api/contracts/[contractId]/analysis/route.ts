import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import type { ContractAnalysis as ContractAnalysisModel } from "@prisma/client"

type RouteContext = {
  params: {
    contractId: string
  }
}

const nonStandardApiBaseUrl =
  process.env.NON_STANDARD_ANALYSIS_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""

const getRemoteApiUrl = () => {
  if (!nonStandardApiBaseUrl) {
    throw new Error("未配置后端分析服务地址")
  }
  return `${nonStandardApiBaseUrl.replace(/\/?$/, "")}/api/v1/non_standard_detection`
}

const serializeAnalysis = (analysis: ContractAnalysisModel) => {
  let parsedResult: unknown = null
  let parsedStandardClauses: unknown = null

  try {
    parsedResult = JSON.parse(analysis.result)
  } catch (error) {
    console.error(`Failed to parse stored analysis result for contract ${analysis.contractId}`, error)
  }

  if (analysis.standardClauses) {
    try {
      parsedStandardClauses = JSON.parse(analysis.standardClauses)
    } catch (error) {
      console.error(`Failed to parse stored standard clauses for contract ${analysis.contractId}`, error)
    }
  }

  return {
    id: analysis.id,
    contractId: analysis.contractId,
    result: parsedResult,
    standardClauses: parsedStandardClauses,
    createdAt: analysis.createdAt,
    updatedAt: analysis.updatedAt,
  }
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { contractId } = params

  if (!contractId) {
    return NextResponse.json({ message: "缺少合同ID" }, { status: 400 })
  }

  const analysis = await prisma.contractAnalysis.findUnique({ where: { contractId } })
  if (!analysis) {
    return NextResponse.json({ message: "未找到合同分析结果" }, { status: 404 })
  }

  return NextResponse.json({ source: "cache", analysis: serializeAnalysis(analysis) })
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { contractId } = params

  if (!contractId) {
    return NextResponse.json({ message: "缺少合同ID" }, { status: 400 })
  }

  let payload: {
    markdown?: unknown
    standard_clauses?: unknown
    force?: unknown
  }

  try {
    payload = (await req.json()) as typeof payload
  } catch (error) {
    console.error("Failed to parse analysis request payload", error)
    return NextResponse.json({ message: "请求格式不正确" }, { status: 400 })
  }

  const markdown = typeof payload.markdown === "string" ? payload.markdown : null
  const standardClauses = payload.standard_clauses ?? null
  const forceRefresh = payload.force === true

  if (!markdown) {
    return NextResponse.json({ message: "缺少合同Markdown内容" }, { status: 400 })
  }

  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract) {
    return NextResponse.json({ message: "合同不存在" }, { status: 404 })
  }

  if (!forceRefresh) {
    const existingAnalysis = await prisma.contractAnalysis.findUnique({ where: { contractId } })
    if (existingAnalysis) {
      return NextResponse.json({ source: "cache", analysis: serializeAnalysis(existingAnalysis) })
    }
  }

  let remoteApiUrl: string
  try {
    remoteApiUrl = getRemoteApiUrl()
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }

  try {
    const response = await fetch(remoteApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: markdown,
        standard_clauses: standardClauses,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(300000), // 5分钟超时
    })

    if (!response.ok) {
      const message = `分析服务调用失败，状态码 ${response.status}`
      console.error(message)
      return NextResponse.json({ message }, { status: 502 })
    }

    const resultPayload = await response.json()

    const resultString = JSON.stringify(resultPayload)
    const standardClausesString = standardClauses == null ? null : JSON.stringify(standardClauses)

    const savedAnalysis = await prisma.contractAnalysis.upsert({
      where: { contractId },
      update: {
        result: resultString,
        standardClauses: standardClausesString,
      },
      create: {
        contractId,
        result: resultString,
        standardClauses: standardClausesString,
      },
    })

    return NextResponse.json({ source: "fresh", analysis: serializeAnalysis(savedAnalysis) })
  } catch (error) {
    console.error("Failed to perform contract analysis", error)
    
    // 处理超时错误
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json({ 
        message: "分析请求超时，合同内容可能较复杂，请稍后重试或联系管理员" 
      }, { status: 504 })
    }
    
    // 处理网络中断错误
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ 
        message: "分析请求被中断，请检查网络连接后重试" 
      }, { status: 408 })
    }
    
    return NextResponse.json({ message: "合同分析失败，请稍后重试" }, { status: 500 })
  }
}

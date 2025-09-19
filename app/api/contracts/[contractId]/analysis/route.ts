import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { defaultStandardClauses } from "@/lib/default-standard-clauses"
import { DEFAULT_TEMPLATE_SLUG, resolveTemplateSelection } from "@/lib/standard-templates"
import type { ContractAnalysis as ContractAnalysisModel, ContractTemplate as ContractTemplateModel } from "@prisma/client"

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

type StandardClausePayload = {
  category: string
  item: string
  standard_text: string
  risk_level: string | null
}

type StoredResultPayload = {
  version: 2
  resultsByTemplate: Record<string, unknown>
}

type StoredClausesPayload = {
  version: 2
  clausesByTemplate: Record<string, StandardClausePayload[]>
}

const serializeAnalysis = (analysis: ContractAnalysisModel) => {
  let parsedResult: StoredResultPayload | null = null
  let parsedStandardClauses: StoredClausesPayload | null = null
  let parsedTemplateIds: string[] | null = null

  try {
    const raw = JSON.parse(analysis.result) as unknown
    if (raw && typeof raw === "object" && "resultsByTemplate" in raw) {
      parsedResult = Object.assign({}, raw as StoredResultPayload, { version: 2 })
    } else {
      parsedResult = {
        version: 2,
        resultsByTemplate: { default: raw },
      }
    }
  } catch (error) {
    console.error(`Failed to parse stored analysis result for contract ${analysis.contractId}`, error)
  }

  if (analysis.standardClauses) {
    try {
      const raw = JSON.parse(analysis.standardClauses) as unknown
      if (raw && typeof raw === "object" && "clausesByTemplate" in raw) {
        parsedStandardClauses = Object.assign({}, raw as StoredClausesPayload, { version: 2 })
      } else {
        parsedStandardClauses = {
          version: 2,
          clausesByTemplate: raw && typeof raw === "object"
            ? (raw as Record<string, StandardClausePayload[]>)
            : {},
        }
      }
    } catch (error) {
      console.error(`Failed to parse stored standard clauses for contract ${analysis.contractId}`, error)
    }
  }

  if (analysis.selectedTemplateIds) {
    try {
      const parsed = JSON.parse(analysis.selectedTemplateIds)
      if (Array.isArray(parsed)) {
        parsedTemplateIds = parsed.filter((value): value is string => typeof value === "string" && value.length > 0)
      }
    } catch (error) {
      console.error(`Failed to parse stored template ids for contract ${analysis.contractId}`, error)
    }
  }

  return {
    id: analysis.id,
    contractId: analysis.contractId,
    result: parsedResult,
    standardClauses: parsedStandardClauses,
    selectedTemplateIds: parsedTemplateIds,
    createdAt: analysis.createdAt,
    updatedAt: analysis.updatedAt,
  }
}

const loadStandardClausesForTemplate = async (template: ContractTemplateModel) => {
  let clauses = await prisma.standardClause.findMany({
    where: { templateId: template.id },
    orderBy: [{ category: "asc" }, { clauseItem: "asc" }],
  })

  if (clauses.length === 0 && template.slug === DEFAULT_TEMPLATE_SLUG) {
    await prisma.standardClause.createMany({
      data: defaultStandardClauses.map((clause) => ({
        ...clause,
        templateId: template.id,
      })),
    })

    clauses = await prisma.standardClause.findMany({
      where: { templateId: template.id },
      orderBy: [{ category: "asc" }, { clauseItem: "asc" }],
    })
  }

  return clauses
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
    template_ids?: unknown
    force?: unknown
  }

  try {
    payload = (await req.json()) as typeof payload
  } catch (error) {
    console.error("Failed to parse analysis request payload", error)
    return NextResponse.json({ message: "请求格式不正确" }, { status: 400 })
  }

  const markdown = typeof payload.markdown === "string" ? payload.markdown : null
  const templateIds = Array.isArray(payload.template_ids)
    ? payload.template_ids.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : []
  const forceRefresh = payload.force === true

  if (!markdown) {
    return NextResponse.json({ message: "缺少合同Markdown内容" }, { status: 400 })
  }

  if (templateIds.length === 0) {
    return NextResponse.json({ message: "请至少提供一个产品合同模板" }, { status: 400 })
  }

  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract) {
    return NextResponse.json({ message: "合同不存在" }, { status: 404 })
  }

  const selection = await resolveTemplateSelection(templateIds)
  if (!selection) {
    return NextResponse.json({ message: "选择的产品合同模板无效" }, { status: 400 })
  }

  const requestedTemplateIds = selection.templateIds

  if (!forceRefresh) {
    const existingAnalysis = await prisma.contractAnalysis.findUnique({ where: { contractId } })
    if (existingAnalysis) {
      try {
        const storedTemplateIds = existingAnalysis.selectedTemplateIds
          ? (JSON.parse(existingAnalysis.selectedTemplateIds) as unknown[])
          : []

        const normalizedStored = Array.isArray(storedTemplateIds)
          ? storedTemplateIds
              .filter((value): value is string => typeof value === "string" && value.length > 0)
              .sort()
          : []
        const normalizedRequested = [...requestedTemplateIds].sort()
        const sameTemplates =
          normalizedStored.length === normalizedRequested.length &&
          normalizedStored.every((value, index) => value === normalizedRequested[index])

        if (sameTemplates) {
          return NextResponse.json({ source: "cache", analysis: serializeAnalysis(existingAnalysis) })
        }
      } catch (error) {
        console.warn("Failed to compare cached analysis templates", error)
      }
    }
  }

  const templatesById = new Map(selection.templates.map((template) => [template.id, template]))

  const clausesByTemplate: Record<string, StandardClausePayload[]> = {}

  for (const templateId of requestedTemplateIds) {
    const template = templatesById.get(templateId)
    if (!template) {
      continue
    }

    const clauses = await loadStandardClausesForTemplate(template)
    if (!clauses.length) {
      const message = template.description
        ? `${template.name}（${template.description}）下暂无标准条款，无法执行分析`
        : `${template.name} 模板下暂无标准条款，无法执行分析`
      return NextResponse.json({ message }, { status: 400 })
    }

    clausesByTemplate[templateId] = clauses.map((clause) => ({
      category: clause.category,
      item: clause.clauseItem,
      standard_text: clause.standard,
      risk_level: clause.riskLevel,
    }))
  }

  let remoteApiUrl: string
  try {
    remoteApiUrl = getRemoteApiUrl()
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }

  try {
    const analysisEntries = await Promise.all(
      requestedTemplateIds.map(async (templateId) => {
        const clauses = clausesByTemplate[templateId]
        if (!clauses || clauses.length === 0) {
          return { templateId, result: null }
        }

        const response = await fetch(remoteApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: markdown,
            standard_clauses: clauses,
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(300000), // 5分钟超时
        })

        if (!response.ok) {
          const message = `分析服务调用失败，状态码 ${response.status}`
          console.error(message)
          throw new Error(message)
        }

        const resultPayload = await response.json()
        return { templateId, result: resultPayload as unknown }
      }),
    )

    const resultsByTemplate = Object.fromEntries(
      analysisEntries.map(({ templateId, result }) => [templateId, result]),
    )

    const storedResult: StoredResultPayload = {
      version: 2,
      resultsByTemplate,
    }

    const storedClauses: StoredClausesPayload = {
      version: 2,
      clausesByTemplate,
    }

    const templateIdsString = JSON.stringify(requestedTemplateIds)

    const savedAnalysis = await prisma.contractAnalysis.upsert({
      where: { contractId },
      update: {
        result: JSON.stringify(storedResult),
        standardClauses: JSON.stringify(storedClauses),
        selectedTemplateIds: templateIdsString,
      },
      create: {
        contractId,
        result: JSON.stringify(storedResult),
        standardClauses: JSON.stringify(storedClauses),
        selectedTemplateIds: templateIdsString,
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
    if (error instanceof Error && error.message.includes("分析服务调用失败")) {
      return NextResponse.json({ message: error.message }, { status: 502 })
    }

    return NextResponse.json({ message: "合同分析失败，请稍后重试" }, { status: 500 })
  }
}

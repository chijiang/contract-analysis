import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { defaultStandardClauses } from "@/lib/default-standard-clauses"
import { DEFAULT_TEMPLATE_SLUG, resolveTemplateSelection } from "@/lib/standard-templates"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const category = url.searchParams.get("category") || undefined

  const selection = await resolveTemplateSelection(url.searchParams.getAll("templateId"))
  if (!selection) {
    return NextResponse.json({ message: "未找到对应的审核模板" }, { status: 404 })
  }
  const { templateIds, templates } = selection

  let clauses = await prisma.standardClause.findMany({
    where: {
      templateId: { in: templateIds },
      ...(category ? { category } : {}),
    },
    orderBy: [{ category: "asc" }, { clauseItem: "asc" }],
  })

  if (clauses.length === 0 && templateIds.length === 1) {
    const template = templates[0]
    if (template?.slug === DEFAULT_TEMPLATE_SLUG) {
      await prisma.standardClause.createMany({
        data: defaultStandardClauses.map((clause) => ({
          ...clause,
          templateId: template.id,
        })),
      })

      clauses = await prisma.standardClause.findMany({
        where: {
          templateId: template.id,
          ...(category ? { category } : {}),
        },
        orderBy: [{ category: "asc" }, { clauseItem: "asc" }],
      })
    }
  }

  return NextResponse.json(clauses)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "请求体格式错误" }, { status: 400 })
  }

  const { templateId, category, clauseItem, standard, riskLevel } = body as {
    templateId?: string
    category?: string
    clauseItem?: string
    standard?: string
    riskLevel?: string | null
  }

  const normalizedTemplateId = typeof templateId === "string" ? templateId.trim() : ""
  const normalizedCategory = typeof category === "string" ? category.trim() : ""
  const normalizedClauseItem = typeof clauseItem === "string" ? clauseItem.trim() : ""
  const normalizedStandard = typeof standard === "string" ? standard.trim() : ""

  if (!normalizedTemplateId || !normalizedCategory || !normalizedClauseItem || !normalizedStandard) {
    return NextResponse.json({ message: "templateId、category、clauseItem、standard 均为必填" }, { status: 400 })
  }

  const template = await prisma.contractTemplate.findUnique({ where: { id: normalizedTemplateId } })
  if (!template) {
    return NextResponse.json({ message: "审核模板不存在" }, { status: 404 })
  }

  try {
    const clause = await prisma.standardClause.create({
      data: {
        templateId: normalizedTemplateId,
        category: normalizedCategory,
        clauseItem: normalizedClauseItem,
        standard: normalizedStandard,
        riskLevel: typeof riskLevel === "string" && riskLevel.trim() ? riskLevel.trim() : null,
      },
    })
    return NextResponse.json(clause, { status: 201 })
  } catch (error) {
    console.error("Failed to create standard clause", error)
    return NextResponse.json({ message: "创建标准条款失败" }, { status: 500 })
  }
}

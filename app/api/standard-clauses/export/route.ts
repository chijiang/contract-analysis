import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { standardClausesToWorkbook } from "@/lib/excel"
import { defaultStandardClauses } from "@/lib/default-standard-clauses"
import { DEFAULT_TEMPLATE_SLUG, resolveTemplateSelection } from "@/lib/standard-templates"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const selection = await resolveTemplateSelection(url.searchParams.getAll("templateId"))
  if (!selection) {
    return NextResponse.json({ message: "未找到对应的产品合同模板" }, { status: 404 })
  }

  const { templateIds, templates } = selection
  if (templateIds.length !== 1) {
    return NextResponse.json({ message: "导出操作仅支持单个产品合同模板" }, { status: 400 })
  }

  const template = templates[0]

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

  const buffer = standardClausesToWorkbook(
    clauses.map((clause) => ({
      category: clause.category,
      clauseItem: clause.clauseItem,
      standard: clause.standard,
      riskLevel: clause.riskLevel ?? undefined,
    })),
  )
  const suffix = template.slug || template.id
  const fileName = `standard-clauses-${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  })
}

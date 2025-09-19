import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

interface RouteContext {
  params: {
    clauseId: string
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { clauseId } = params

  if (!clauseId) {
    return NextResponse.json({ message: "缺少条款ID" }, { status: 400 })
  }

  const existing = await prisma.standardClause.findUnique({ where: { id: clauseId } })
  if (!existing) {
    return NextResponse.json({ message: "条款不存在" }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "请求体格式错误" }, { status: 400 })
  }

  const { category, clauseItem, standard, riskLevel } = body as {
    category?: string
    clauseItem?: string
    standard?: string
    riskLevel?: string | null
  }

  const normalizedCategory = typeof category === "string" ? category.trim() : ""
  const normalizedClauseItem = typeof clauseItem === "string" ? clauseItem.trim() : ""
  const normalizedStandard = typeof standard === "string" ? standard.trim() : ""

  if (!normalizedCategory || !normalizedClauseItem || !normalizedStandard) {
    return NextResponse.json({ message: "category、clauseItem、standard 均为必填" }, { status: 400 })
  }

  try {
    const clause = await prisma.standardClause.update({
      where: { id: clauseId },
      data: {
        category: normalizedCategory,
        clauseItem: normalizedClauseItem,
        standard: normalizedStandard,
        riskLevel: typeof riskLevel === "string" && riskLevel.trim() ? riskLevel.trim() : null,
      },
    })

    return NextResponse.json(clause)
  } catch (error) {
    console.error(`Failed to update standard clause ${clauseId}`, error)
    return NextResponse.json({ message: "更新标准条款失败" }, { status: 500 })
  }
}

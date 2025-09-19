import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { defaultStandardClauses } from "@/lib/default-standard-clauses"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const category = url.searchParams.get("category") || undefined

  let clauses = await prisma.standardClause.findMany({
    where: category ? { category } : undefined,
    orderBy: [{ category: "asc" }, { clauseItem: "asc" }],
  })

  if (clauses.length === 0) {
    await prisma.standardClause.createMany({ data: defaultStandardClauses })
    clauses = await prisma.standardClause.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: "asc" }, { clauseItem: "asc" }],
    })
  }

  return NextResponse.json(clauses)
}

export async function POST(req: NextRequest) {
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

  if (!category || !clauseItem || !standard) {
    return NextResponse.json({ message: "category、clauseItem、standard 均为必填" }, { status: 400 })
  }

  try {
    const clause = await prisma.standardClause.create({
      data: {
        category,
        clauseItem,
        standard,
        riskLevel: typeof riskLevel === "string" && riskLevel.trim() ? riskLevel.trim() : null,
      },
    })
    return NextResponse.json(clause, { status: 201 })
  } catch (error) {
    console.error("Failed to create standard clause", error)
    return NextResponse.json({ message: "创建标准条款失败" }, { status: 500 })
  }
}

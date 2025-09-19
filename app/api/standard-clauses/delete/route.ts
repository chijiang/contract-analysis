import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "请求体格式错误" }, { status: 400 })
  }

  const { clauseIds } = body as { clauseIds?: string[] }

  if (!Array.isArray(clauseIds) || clauseIds.length === 0) {
    return NextResponse.json({ message: "缺少需要删除的条款" }, { status: 400 })
  }

  const normalized = clauseIds
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0)

  if (normalized.length === 0) {
    return NextResponse.json({ message: "缺少需要删除的条款" }, { status: 400 })
  }

  try {
    const result = await prisma.standardClause.deleteMany({
      where: { id: { in: normalized } },
    })

    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    console.error("Failed to delete standard clauses", error)
    return NextResponse.json({ message: "删除标准条款失败" }, { status: 500 })
  }
}

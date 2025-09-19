import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { parseStandardClausesWorkbook } from "@/lib/excel"

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file")
  const templateId = formData.get("templateId")

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "请上传Excel文件" }, { status: 400 })
  }

  if (typeof templateId !== "string" || !templateId.trim()) {
    return NextResponse.json({ message: "缺少产品合同模板信息" }, { status: 400 })
  }

  const template = await prisma.contractTemplate.findUnique({ where: { id: templateId } })
  if (!template) {
    return NextResponse.json({ message: "产品合同模板不存在" }, { status: 404 })
  }

  try {
    const buffer = await file.arrayBuffer()
    const rows = parseStandardClausesWorkbook(buffer)

    if (rows.length === 0) {
      return NextResponse.json({ message: "Excel中未找到有效数据" }, { status: 400 })
    }

    const keys = rows.map((row) => ({ category: row.category, clauseItem: row.clauseItem }))
    const existing = await prisma.standardClause.findMany({
      where: {
        templateId,
        OR: keys,
      },
    })

    const existingMap = new Map(existing.map((row) => [`${row.category}::${row.clauseItem}`, row]))

    let created = 0
    let updated = 0

    const normalizeRiskLevel = (value: string | undefined) => {
      if (value === undefined) return undefined
      const trimmed = value.trim()
      return trimmed ? trimmed : null
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const key = `${row.category}::${row.clauseItem}`
        const match = existingMap.get(key)
        const normalizedRiskLevel = normalizeRiskLevel(row.riskLevel)

        if (match) {
          await tx.standardClause.update({
            where: { id: match.id },
            data: {
              standard: row.standard,
              ...(normalizedRiskLevel !== undefined ? { riskLevel: normalizedRiskLevel } : {}),
            },
          })
          updated += 1
        } else {
          await tx.standardClause.create({
            data: {
              templateId,
              category: row.category,
              clauseItem: row.clauseItem,
              standard: row.standard,
              riskLevel: normalizedRiskLevel ?? null,
            },
          })
          created += 1
        }
      }
    })

    return NextResponse.json({ message: "导入成功", created, updated, total: rows.length })
  } catch (error) {
    console.error("Failed to import standard clauses", error)
    return NextResponse.json({ message: "导入标准条款失败" }, { status: 500 })
  }
}

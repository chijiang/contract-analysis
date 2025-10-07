import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { parseServicePlanWorkbook } from "@/lib/service-plans-excel"
import { buildPlanCreateData, buildPlanUpdateData, mapClausesForCreateMany } from "@/lib/service-plans"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "缺少 Excel 文件" }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const { entries, errors: parseErrors } = parseServicePlanWorkbook(buffer)

  if (entries.length === 0) {
    return NextResponse.json(
      {
        message: "未解析到有效的服务计划数据",
        errors: parseErrors,
      },
      { status: 400 },
    )
  }

  let created = 0
  let updated = 0
  const errors: string[] = [...parseErrors]

  for (const entry of entries) {
    const payload = entry.payload
    try {
      if (entry.id) {
        const exists = await prisma.servicePlan.findUnique({ where: { id: entry.id } })
        if (!exists) {
          errors.push(`ID 为 ${entry.id} 的服务计划不存在，已跳过`)
          continue
        }

        await prisma.$transaction(async (tx) => {
          const updateData = buildPlanUpdateData(payload)
          await tx.servicePlan.update({ where: { id: entry.id! }, data: updateData })

          if (payload.clauses !== undefined) {
            await tx.servicePlanClause.deleteMany({ where: { planId: entry.id! } })
            if (payload.clauses.length > 0) {
              await tx.servicePlanClause.createMany({
                data: mapClausesForCreateMany(payload.clauses, entry.id!),
              })
            }
          }
        })

        updated += 1
      } else {
        await prisma.servicePlan.create({
          data: buildPlanCreateData(payload),
        })
        created += 1
      }
    } catch (error) {
      errors.push(
        error instanceof Error
          ? `服务计划 ${payload.name} 导入失败：${error.message}`
          : `服务计划 ${payload.name} 导入失败`,
      )
    }
  }

  return NextResponse.json({
    total: entries.length,
    created,
    updated,
    errors,
  })
}

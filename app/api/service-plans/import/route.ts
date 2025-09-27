import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { parseServicePlanWorkbook } from "@/lib/service-plans-excel"
import { buildPlanCreateData, buildPlanUpdateData } from "@/lib/service-plans"
import { buildPlanModuleInputs, replacePlanModules } from "@/lib/service-plan-modules"

import type { ServiceModuleTemplate } from "@prisma/client"

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
  const templateCache = new Map<string, Awaited<ReturnType<typeof prisma.serviceModuleTemplate.findUnique>>>()

  const loadTemplates = async (ids: string[]) => {
    const missing = ids.filter((id) => !templateCache.has(id))
    if (missing.length === 0) {
      return
    }
    const templates = await prisma.serviceModuleTemplate.findMany({ where: { id: { in: missing } } })
    templates.forEach((template) => templateCache.set(template.id, template))
  }

  for (const entry of entries) {
    const payload = entry.payload
    try {
      const moduleSelections = payload.modules ?? []
      const templateIds = Array.from(new Set(moduleSelections.map((selection) => selection.templateId)))
      await loadTemplates(templateIds)

      const templatesMap: Record<string, ServiceModuleTemplate> = {}
      let missingTemplate = false
      for (const id of templateIds) {
        const template = templateCache.get(id)
        if (!template) {
          errors.push(`服务计划 ${payload.name} 导入失败：缺少模板 ${id}`)
          missingTemplate = true
          continue
        }
        templatesMap[id] = template
      }

      if (missingTemplate) {
        continue
      }

      const modules = buildPlanModuleInputs(moduleSelections, templatesMap)

      if (entry.id) {
        const exists = await prisma.servicePlan.findUnique({ where: { id: entry.id } })
        if (!exists) {
          errors.push(`ID 为 ${entry.id} 的服务计划不存在，已跳过`)
          continue
        }

        await prisma.$transaction(async (tx) => {
          const updateData = buildPlanUpdateData(payload)
          await tx.servicePlan.update({ where: { id: entry.id! }, data: updateData })

          if (payload.modalities !== undefined) {
            const modalitySet = Array.from(new Set(payload.modalities))
            await tx.planModality.deleteMany({ where: { planId: entry.id! } })
            if (modalitySet.length > 0) {
              await tx.planModality.createMany({
                data: modalitySet.map((modality) => ({ planId: entry.id!, modality })),
              })
            }
          }

          await replacePlanModules({
            tx,
            planId: entry.id!,
            selections: moduleSelections,
            templatesMap,
          })
        })

        updated += 1
      } else {
        await prisma.servicePlan.create({
          data: buildPlanCreateData(payload, modules),
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

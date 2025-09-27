import { Prisma, ServiceModuleTemplate } from "@prisma/client"
import { z } from "zod"

import {
  SERVICE_MODULE_TYPES,
  ServicePlanModuleInput,
  type ServicePlanModuleSelection,
  stringifyOptionalJson,
  type ServiceModuleType,
} from "@/lib/service-plans"

export const planModuleSelectionSchema = z.object({
  templateId: z.string().cuid(),
  isDefault: z.boolean().optional().default(false),
  status: z.string().trim().optional().nullable(),
  overrides: z.unknown().optional(),
  orderIndex: z.number().int().nonnegative().optional(),
})

export type PlanModuleSelection = z.infer<typeof planModuleSelectionSchema>

export async function fetchTemplatesByIds(tx: Prisma.TransactionClient | PrismaClientLike, ids: string[]) {
  const templates = await tx.serviceModuleTemplate.findMany({
    where: { id: { in: ids } },
  })
  return Object.fromEntries(templates.map((template) => [template.id, template]))
}

type PrismaClientLike = { serviceModuleTemplate: { findMany(args: Prisma.ServiceModuleTemplateFindManyArgs): Promise<ServiceModuleTemplate[]> } }

export function buildPlanModuleInputs(
  selections: ServicePlanModuleSelection[] | undefined,
  templatesMap: Record<string, ServiceModuleTemplate>,
): ServicePlanModuleInput[] {
  if (!selections || selections.length === 0) {
    return []
  }

  return selections.map((selection, index) => {
    const template = templatesMap[selection.templateId]
    if (!template) {
      throw new Error(`未找到服务模块模板：${selection.templateId}`)
    }

    if (!SERVICE_MODULE_TYPES.includes(template.type as ServiceModuleType)) {
      throw new Error(`模板 ${template.name} 的类型 ${template.type} 不被支持`)
    }

    return {
      template,
      isDefault: selection.isDefault ?? false,
      status: selection.status ?? null,
      overrides: selection.overrides ?? null,
      orderIndex: selection.orderIndex ?? index,
    }
  })
}

type UpsertArgs = {
  tx: Prisma.TransactionClient
  planId: string
  selections: ServicePlanModuleSelection[] | undefined
  templatesMap: Record<string, ServiceModuleTemplate>
}

export async function replacePlanModules({ tx, planId, selections, templatesMap }: UpsertArgs) {
  if (!selections) {
    await tx.servicePlanModule.deleteMany({ where: { planId } })
    return
  }

  await tx.servicePlanModule.deleteMany({ where: { planId } })

  if (selections.length === 0) {
    return
  }

  await tx.servicePlanModule.createMany({
    data: selections.map((selection, index) => {
      const template = templatesMap[selection.templateId]
      if (!template) {
        throw new Error(`未找到服务模块模板：${selection.templateId}`)
      }
      return {
        planId,
        templateId: template.id,
        type: template.type,
        status: selection.status ?? template.status,
        isDefault: selection.isDefault ?? false,
        overrides: stringifyOptionalJson(selection.overrides, `modules[${index}].overrides`),
        orderIndex: selection.orderIndex ?? index,
      }
    }),
  })
}

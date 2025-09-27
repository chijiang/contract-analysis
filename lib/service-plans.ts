import { Prisma, ServiceModuleTemplate, ServicePlan } from "@prisma/client"
import { z } from "zod"

export const MODALITY_OPTIONS = ["CT", "MR", "IGS", "DR", "Mammo", "MobileDR", "BoneDensity", "US", "Other"] as const
export type Modality = (typeof MODALITY_OPTIONS)[number]

export const SERVICE_MODULE_TYPES = [
  "responseArrival",
  "yearlyMaintenance",
  "remoteMaintenance",
  "detectorEcg",
  "training",
  "uptime",
] as const
export type ServiceModuleType = (typeof SERVICE_MODULE_TYPES)[number]

export const MODULE_STATUS_OPTIONS = ["included", "optional", "excluded"] as const

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(jsonValueSchema)]),
)

export const serviceModuleTemplatePayloadSchema = z.object({
  type: z.enum(SERVICE_MODULE_TYPES),
  name: z.string().trim().min(1),
  status: z.string().trim().min(1).default("included"),
  payload: jsonValueSchema,
  notes: z.string().trim().optional().nullable(),
})

export type ServiceModuleTemplatePayload = z.infer<typeof serviceModuleTemplatePayloadSchema>

export const servicePlanModuleSelectionSchema = z.object({
  templateId: z.string().cuid(),
  isDefault: z.boolean().optional().default(false),
  status: z.string().trim().optional().nullable(),
  overrides: jsonValueSchema.optional(),
  orderIndex: z.number().int().nonnegative().optional(),
})

export type ServicePlanModuleSelection = z.infer<typeof servicePlanModuleSelectionSchema>

export const servicePlanPayloadSchema = z.object({
  name: z.string().trim().min(1),
  termMonths: z.number().int().positive().optional().nullable(),
  sites: z.array(z.string().trim().min(1)).optional(),
  modalities: z.array(z.string().trim().min(1)).optional(),
  metadata: jsonValueSchema.optional(),
  modules: z.array(servicePlanModuleSelectionSchema).min(1, "至少选择一个服务模块").optional(),
})

export type ServicePlanPayload = z.infer<typeof servicePlanPayloadSchema>

export const servicePlanDetailInclude = {
  modalities: true,
  modules: {
    include: { template: true },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.ServicePlanInclude

export const servicePlanWithDetails = Prisma.validator<Prisma.ServicePlanDefaultArgs>()({
  include: servicePlanDetailInclude,
})

export type ServicePlanWithDetails = Prisma.ServicePlanGetPayload<typeof servicePlanWithDetails>

export type SerializedServicePlanModule = {
  id: string
  type: ServiceModuleType
  templateId: string
  templateName: string
  status: string | null
  templateStatus: string
  payload: unknown
  overrides: unknown | null
  isDefault: boolean
  orderIndex: number
  createdAt: string
  updatedAt: string
}

export type SerializedServicePlan = {
  id: string
  name: string
  termMonths: number | null
  sites: string[]
  modalities: string[]
  metadata: unknown | null
  modules: SerializedServicePlanModule[]
  createdAt: string
  updatedAt: string
}

export function stringifyOptionalJson(value: unknown | undefined, fieldName: string): string | null {
  if (value === undefined) {
    return null
  }
  try {
    return JSON.stringify(value)
  } catch (error) {
    throw new Error(`无法序列化字段 ${fieldName}`)
  }
}

export function stringifyRequiredJson(value: unknown, fieldName: string): string {
  try {
    return JSON.stringify(value)
  } catch (error) {
    throw new Error(`无法序列化字段 ${fieldName}`)
  }
}

export function parseJsonField<T = unknown>(value: string | null | undefined): T | null {
  if (!value) {
    return null
  }
  try {
    return JSON.parse(value) as T
  } catch (error) {
    return value as unknown as T
  }
}

export function parseStringArray(value: string | null | undefined): string[] {
  const parsed = parseJsonField(value)
  if (Array.isArray(parsed)) {
    return parsed.filter((item): item is string => typeof item === "string")
  }
  return []
}

export const serviceModuleTemplateWithRelations = Prisma.validator<Prisma.ServiceModuleTemplateArgs>()({
  include: { versions: { orderBy: { createdAt: "desc" } }, usages: true },
})

export type ServiceModuleTemplateWithRelations = Prisma.ServiceModuleTemplateGetPayload<
  typeof serviceModuleTemplateWithRelations
>

export type SerializedServiceModuleTemplate = {
  id: string
  type: ServiceModuleType
  name: string
  status: string
  payload: unknown
  notes: string | null
  versionCount: number
  usageCount: number
  createdAt: string
  updatedAt: string
}

export function serializeServiceModuleTemplate(template: ServiceModuleTemplateWithRelations): SerializedServiceModuleTemplate {
  return {
    id: template.id,
    type: template.type as ServiceModuleType,
    name: template.name,
    status: template.status,
    payload: parseJsonField(template.payload),
    notes: template.notes ?? null,
    versionCount: template.versions.length,
    usageCount: template.usages.length,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }
}

export function serializeServicePlan(plan: ServicePlanWithDetails): SerializedServicePlan {
  return {
    id: plan.id,
    name: plan.name,
    termMonths: plan.termMonths ?? null,
    sites: parseStringArray(plan.sites),
    modalities: plan.modalities.map((item) => item.modality),
    metadata: parseJsonField(plan.metadata),
    modules: plan.modules.map((module) => ({
      id: module.id,
      type: module.type as ServiceModuleType,
      templateId: module.templateId,
      templateName: module.template.name,
      status: module.status ?? null,
      templateStatus: module.template.status,
      payload: parseJsonField(module.template.payload),
      overrides: parseJsonField(module.overrides),
      isDefault: module.isDefault,
      orderIndex: module.orderIndex,
      createdAt: module.createdAt.toISOString(),
      updatedAt: module.updatedAt.toISOString(),
    })),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  }
}

export const servicePlanListInclude = Prisma.validator<Prisma.ServicePlanInclude>()({
  modules: { include: { template: true } },
  modalities: true,
})

export type ServicePlanWithModules = Prisma.ServicePlanGetPayload<{
  include: typeof servicePlanListInclude
}>

export type ServicePlanModuleInput = {
  template: ServiceModuleTemplate
  isDefault: boolean
  status: string | null
  overrides: unknown | null
  orderIndex: number
}

export function buildPlanCreateData(
  payload: ServicePlanPayload,
  modules: ServicePlanModuleInput[],
): Prisma.ServicePlanCreateInput {
  const modalitySet = payload.modalities ? Array.from(new Set(payload.modalities)) : []

  return {
    name: payload.name.trim(),
    termMonths: payload.termMonths ?? null,
    sites: payload.sites ? stringifyRequiredJson(payload.sites, "sites") : null,
    metadata: stringifyOptionalJson(payload.metadata, "metadata"),
    modalities: modalitySet.length
      ? { create: modalitySet.map((modality) => ({ modality })) }
      : { create: [] },
    modules: {
      create: modules.map((module) => ({
        templateId: module.template.id,
        type: module.template.type,
        status: module.status ?? module.template.status,
        isDefault: module.isDefault,
        overrides: stringifyOptionalJson(module.overrides, "module.overrides"),
        orderIndex: module.orderIndex,
      })),
    },
  }
}

export function buildPlanUpdateData(
  payload: ServicePlanPayload,
): Prisma.ServicePlanUpdateInput {
  const data: Prisma.ServicePlanUpdateInput = {
    name: payload.name.trim(),
  }

  if (payload.termMonths !== undefined) {
    data.termMonths = payload.termMonths ?? null
  }

  if (payload.sites !== undefined) {
    data.sites = stringifyRequiredJson(payload.sites, "sites")
  }

  if (payload.metadata !== undefined) {
    data.metadata = stringifyOptionalJson(payload.metadata, "metadata")
  }

  return data
}

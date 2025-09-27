import { Prisma } from "@prisma/client"
import { z } from "zod"

import {
  SERVICE_MODULE_TYPES,
  serviceModuleTemplatePayloadSchema,
  serializeServiceModuleTemplate,
  serviceModuleTemplateWithRelations,
  type SerializedServiceModuleTemplate,
} from "@/lib/service-plans"

export const moduleUpsertSchema = serviceModuleTemplatePayloadSchema.extend({
  payload: z.unknown(),
})

export type ModuleUpsertPayload = z.infer<typeof moduleUpsertSchema>

export const moduleListInclude = Prisma.validator<Prisma.ServiceModuleTemplateInclude>()({
  versions: { orderBy: { createdAt: "desc" }, take: 1 },
  usages: true,
})

export type ModuleListEntry = Prisma.ServiceModuleTemplateGetPayload<{
  include: typeof moduleListInclude
}>

export function buildTemplateCreateInput(payload: ModuleUpsertPayload): Prisma.ServiceModuleTemplateCreateInput {
  const parsed = moduleUpsertSchema.parse(payload)
  return {
    type: parsed.type,
    name: parsed.name.trim(),
    status: parsed.status,
    payload: JSON.stringify(parsed.payload),
    notes: parsed.notes?.trim() || null,
    versions: {
      create: {
        payload: JSON.stringify(parsed.payload),
        metadata: "initial",
      },
    },
  }
}

export function buildTemplateUpdateInput(payload: ModuleUpsertPayload): Prisma.ServiceModuleTemplateUpdateInput {
  const parsed = moduleUpsertSchema.parse(payload)
  return {
    type: parsed.type,
    name: parsed.name.trim(),
    status: parsed.status,
    payload: JSON.stringify(parsed.payload),
    notes: parsed.notes?.trim() || null,
    versions: {
      create: {
        payload: JSON.stringify(parsed.payload),
        metadata: "update",
      },
    },
  }
}

export function serializeTemplateList(entries: ModuleListEntry[]): SerializedServiceModuleTemplate[] {
  return entries.map((entry) =>
    serializeServiceModuleTemplate({
      ...entry,
      versions: entry.versions,
      usages: entry.usages,
    }),
  )
}

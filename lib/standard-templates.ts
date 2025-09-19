import { prisma } from "@/lib/prisma"
import type { ContractTemplate } from "@prisma/client"

export const DEFAULT_TEMPLATE_SLUG = "default"

export async function ensureDefaultTemplate(): Promise<ContractTemplate> {
  return prisma.contractTemplate.upsert({
    where: { slug: DEFAULT_TEMPLATE_SLUG },
    update: {},
    create: {
      name: "通用模板",
      slug: DEFAULT_TEMPLATE_SLUG,
    },
  })
}

export async function resolveTemplateSelection(
  rawTemplateIds: string[],
): Promise<
  | {
      templateIds: string[]
      templates: ContractTemplate[]
      fallbackToDefault: boolean
    }
  | null
> {
  const normalizedIds = rawTemplateIds.map((value) => value.trim()).filter((value) => value.length > 0)

  if (normalizedIds.length === 0) {
    const template = await ensureDefaultTemplate()
    return {
      templateIds: [template.id],
      templates: [template],
      fallbackToDefault: true,
    }
  }

  const templates = await prisma.contractTemplate.findMany({
    where: { id: { in: normalizedIds } },
  })

  if (templates.length !== normalizedIds.length) {
    return null
  }

  return {
    templateIds: normalizedIds,
    templates,
    fallbackToDefault: false,
  }
}

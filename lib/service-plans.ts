import { Prisma } from "@prisma/client"
import { z } from "zod"

export const servicePlanClausePayloadSchema = z.object({
  category: z.string().trim().optional().nullable(),
  clauseItem: z.string().trim().min(1, "条款名称不能为空"),
  requirement: z.string().trim().min(1, "条款内容不能为空"),
  notes: z.string().trim().optional().nullable(),
  orderIndex: z.number().int().nonnegative().optional(),
})

export type ServicePlanClausePayload = z.infer<typeof servicePlanClausePayloadSchema>

export const servicePlanPayloadSchema = z.object({
  name: z.string().trim().min(1, "服务计划名称不能为空"),
  description: z.string().trim().optional().nullable(),
  clauses: z.array(servicePlanClausePayloadSchema).min(1, "至少添加一个服务条款").optional(),
})

export type ServicePlanPayload = z.infer<typeof servicePlanPayloadSchema>

export const servicePlanDetailInclude = {
  clauses: { orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }] },
} satisfies Prisma.ServicePlanInclude

export const servicePlanWithDetails = Prisma.validator<Prisma.ServicePlanDefaultArgs>()({
  include: servicePlanDetailInclude,
})

export type ServicePlanWithDetails = Prisma.ServicePlanGetPayload<typeof servicePlanWithDetails>

export type SerializedServicePlanClause = {
  id: string
  category: string | null
  clauseItem: string
  requirement: string
  notes: string | null
  orderIndex: number
  createdAt: string
  updatedAt: string
}

export type SerializedServicePlan = {
  id: string
  name: string
  description: string | null
  clauses: SerializedServicePlanClause[]
  createdAt: string
  updatedAt: string
}

export function serializeServicePlanClause(clause: ServicePlanWithDetails["clauses"][number]): SerializedServicePlanClause {
  return {
    id: clause.id,
    category: clause.category ?? null,
    clauseItem: clause.clauseItem,
    requirement: clause.requirement,
    notes: clause.notes ?? null,
    orderIndex: clause.orderIndex,
    createdAt: clause.createdAt.toISOString(),
    updatedAt: clause.updatedAt.toISOString(),
  }
}

export function serializeServicePlan(plan: ServicePlanWithDetails): SerializedServicePlan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description ?? null,
    clauses: plan.clauses.map(serializeServicePlanClause),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  }
}

function normalizeClauseInput(clause: ServicePlanClausePayload, index: number) {
  return {
    category: clause.category?.trim() || null,
    clauseItem: clause.clauseItem.trim(),
    requirement: clause.requirement.trim(),
    notes: clause.notes?.trim() || null,
    orderIndex: clause.orderIndex ?? index,
  }
}

export function buildPlanCreateData(payload: ServicePlanPayload) {
  const clauses = (payload.clauses ?? []).map(normalizeClauseInput)
  return {
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
    clauses: clauses.length
      ? {
          create: clauses,
        }
      : undefined,
  }
}

export function buildPlanUpdateData(payload: ServicePlanPayload) {
  return {
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
  }
}

export function mapClausesForCreateMany(clauses: ServicePlanClausePayload[], planId: string) {
  return clauses.map((clause, index) => ({
    planId,
    ...normalizeClauseInput(clause, index),
  }))
}

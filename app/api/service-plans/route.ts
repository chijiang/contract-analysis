import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import {
  SerializedServicePlan,
  servicePlanDetailInclude,
  servicePlanPayloadSchema,
  serializeServicePlan,
} from "@/lib/service-plans"

import { buildPlanCreateData } from "@/lib/service-plans"
import { buildPlanModuleInputs as resolveModuleInputs } from "@/lib/service-plan-modules"

async function resolveTemplates(templateIds: string[]) {
  const templates = await prisma.serviceModuleTemplate.findMany({
    where: { id: { in: templateIds } },
  })
  return Object.fromEntries(templates.map((template) => [template.id, template]))
}

export async function GET(): Promise<NextResponse<SerializedServicePlan[]>> {
  const plans = await prisma.servicePlan.findMany({
    orderBy: { createdAt: "desc" },
    include: servicePlanDetailInclude,
  })

  return NextResponse.json(plans.map(serializeServicePlan))
}

export async function POST(request: NextRequest): Promise<NextResponse<SerializedServicePlan | { message: string }>> {
  const body = await request.json().catch(() => null)

  const parsed = servicePlanPayloadSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const message = issue ? `${issue.path.join(".")}: ${issue.message}` : "请求体校验失败"
    return NextResponse.json({ message }, { status: 400 })
  }

  try {
    const moduleSelections = parsed.data.modules ?? []
    const templateIds = Array.from(new Set(moduleSelections.map((selection) => selection.templateId)))
    const templatesMap = await resolveTemplates(templateIds)

    if (templateIds.some((id) => !templatesMap[id])) {
      return NextResponse.json({ message: "存在无效的服务模块模板ID" }, { status: 400 })
    }

    const modules = resolveModuleInputs(moduleSelections, templatesMap)

    if (modules.length === 0) {
      return NextResponse.json({ message: "请至少选择一个服务模块模板" }, { status: 400 })
    }

    const plan = await prisma.servicePlan.create({
      data: buildPlanCreateData(parsed.data, modules),
      include: servicePlanDetailInclude,
    })
    return NextResponse.json(serializeServicePlan(plan), { status: 201 })
  } catch (error) {
    console.error("Failed to create service plan", error)
    return NextResponse.json({ message: "创建服务计划失败" }, { status: 500 })
  }
}

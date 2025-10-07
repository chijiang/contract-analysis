import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { defaultServicePlanSeeds } from "@/lib/default-service-plans"
import { SerializedServicePlan, buildPlanCreateData, servicePlanDetailInclude, servicePlanPayloadSchema, serializeServicePlan } from "@/lib/service-plans"

const seedDefaultPlansIfNeeded = async () => {
  const count = await prisma.servicePlan.count()
  if (count > 0) return

  await prisma.$transaction(async (tx) => {
    for (const plan of defaultServicePlanSeeds) {
      await tx.servicePlan.create({
        data: buildPlanCreateData(plan),
      })
    }
  })
}

export async function GET(): Promise<NextResponse<SerializedServicePlan[]>> {
  await seedDefaultPlansIfNeeded()

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
  if ((parsed.data.clauses ?? []).length === 0) {
    return NextResponse.json({ message: "至少添加一个服务条款" }, { status: 400 })
  }

  try {
    const plan = await prisma.servicePlan.create({
      data: buildPlanCreateData(parsed.data),
      include: servicePlanDetailInclude,
    })

    return NextResponse.json(serializeServicePlan(plan), { status: 201 })
  } catch (error) {
    console.error("Failed to create service plan", error)
    return NextResponse.json({ message: "创建服务计划失败" }, { status: 500 })
  }
}

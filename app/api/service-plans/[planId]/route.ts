import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

import { SerializedServicePlan, buildPlanUpdateData, mapClausesForCreateMany, servicePlanDetailInclude, servicePlanPayloadSchema, serializeServicePlan } from "@/lib/service-plans"

const notFound = () => NextResponse.json({ message: "未找到对应的服务计划" }, { status: 404 })

export async function GET(
  _request: NextRequest,
  { params }: { params: { planId: string } },
): Promise<NextResponse<SerializedServicePlan | { message: string }>> {
  const plan = await prisma.servicePlan.findUnique({
    where: { id: params.planId },
    include: servicePlanDetailInclude,
  })

  if (!plan) {
    return notFound()
  }

  return NextResponse.json(serializeServicePlan(plan))
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { planId: string } },
): Promise<NextResponse<SerializedServicePlan | { message: string }>> {
  const body = await request.json().catch(() => null)
  const parsed = servicePlanPayloadSchema.safeParse(body)

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const message = issue ? `${issue.path.join(".")}: ${issue.message}` : "请求体校验失败"
    return NextResponse.json({ message }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updateData = buildPlanUpdateData(parsed.data)

      await tx.servicePlan.update({ where: { id: params.planId }, data: updateData })

      if (parsed.data.clauses !== undefined) {
        await tx.servicePlanClause.deleteMany({ where: { planId: params.planId } })
        if (parsed.data.clauses.length > 0) {
          await tx.servicePlanClause.createMany({
            data: mapClausesForCreateMany(parsed.data.clauses, params.planId),
          })
        }
      }

      const updated = await tx.servicePlan.findUnique({
        where: { id: params.planId },
        include: servicePlanDetailInclude,
      })

      if (!updated) {
        throw new Error("UPDATED_PLAN_NOT_FOUND")
      }

      return updated
    })

    return NextResponse.json(serializeServicePlan(result))
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return notFound()
    }

    if (error instanceof Error && error.message === "UPDATED_PLAN_NOT_FOUND") {
      return notFound()
    }

    console.error("Failed to update service plan", error)
    return NextResponse.json({ message: "更新服务计划失败" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { planId: string } },
): Promise<NextResponse<{ message: string } | null>> {
  try {
    await prisma.servicePlan.delete({ where: { id: params.planId } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return notFound()
    }
    console.error("Failed to delete service plan", error)
    return NextResponse.json({ message: "删除服务计划失败" }, { status: 500 })
  }
}

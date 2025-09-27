import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import {
  buildTemplateUpdateInput,
  moduleUpsertSchema,
} from "@/lib/service-modules"
import { serializeServiceModuleTemplate, serviceModuleTemplateWithRelations } from "@/lib/service-plans"

const notFound = () => NextResponse.json({ message: "未找到服务模块" }, { status: 404 })

export async function GET(
  _req: NextRequest,
  { params }: { params: { templateId: string } },
) {
  const template = await prisma.serviceModuleTemplate.findUnique({
    where: { id: params.templateId },
    include: serviceModuleTemplateWithRelations.include,
  })

  if (!template) {
    return notFound()
  }

  return NextResponse.json(serializeServiceModuleTemplate(template))
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { templateId: string } },
) {
  const body = await request.json().catch(() => null)
  const parsed = moduleUpsertSchema.safeParse(body)

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return NextResponse.json({ message: issue ? issue.message : "请求体校验失败" }, { status: 400 })
  }

  try {
    const updated = await prisma.serviceModuleTemplate.update({
      where: { id: params.templateId },
      data: buildTemplateUpdateInput(parsed.data),
      include: serviceModuleTemplateWithRelations.include,
    })

    return NextResponse.json(serializeServiceModuleTemplate(updated))
  } catch (error) {
    console.error("Failed to update module template", error)
    return NextResponse.json({ message: "更新服务模块失败" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { templateId: string } },
) {
  try {
    const usages = await prisma.servicePlanModule.count({ where: { templateId: params.templateId } })
    if (usages > 0) {
      return NextResponse.json({ message: "该模板已被服务计划使用，无法删除" }, { status: 400 })
    }

    await prisma.serviceModuleTemplate.delete({ where: { id: params.templateId } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Failed to delete service module template", error)
    return NextResponse.json({ message: "删除服务模块失败" }, { status: 500 })
  }
}

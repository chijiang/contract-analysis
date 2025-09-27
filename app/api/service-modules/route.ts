import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { buildTemplateCreateInput, moduleUpsertSchema } from "@/lib/service-modules"
import { serializeServiceModuleTemplate, serviceModuleTemplateWithRelations } from "@/lib/service-plans"

export async function GET() {
  const templates = await prisma.serviceModuleTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    include: serviceModuleTemplateWithRelations.include,
  })

  return NextResponse.json(templates.map(serializeServiceModuleTemplate))
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = moduleUpsertSchema.safeParse(body)

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return NextResponse.json({ message: issue ? issue.message : "请求体校验失败" }, { status: 400 })
  }

  try {
    const template = await prisma.serviceModuleTemplate.create({
      data: buildTemplateCreateInput(parsed.data),
      include: serviceModuleTemplateWithRelations.include,
    })

    return NextResponse.json(serializeServiceModuleTemplate(template), { status: 201 })
  } catch (error) {
    console.error("Failed to create service module template", error)
    return NextResponse.json({ message: "创建服务模块失败" }, { status: 500 })
  }
}

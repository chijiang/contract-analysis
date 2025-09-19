import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { ensureDefaultTemplate } from "@/lib/standard-templates"

export async function GET() {
  let templates = await prisma.contractTemplate.findMany({
    orderBy: { createdAt: "asc" },
  })

  if (templates.length === 0) {
    const template = await ensureDefaultTemplate()
    templates = [template]
  }

  return NextResponse.json(templates)
}

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")

async function generateUniqueSlug(preferred: string) {
  let base = normalizeSlug(preferred)
  if (!base) {
    base = `template-${Date.now()}`
  }

  let candidate = base
  let suffix = 1

  while (true) {
    const existing = await prisma.contractTemplate.findUnique({ where: { slug: candidate } })
    if (!existing) {
      return candidate
    }
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "请求体格式错误" }, { status: 400 })
  }

  const { name, slug, description } = body as {
    name?: string
    slug?: string | null
    description?: string | null
  }

  if (!name || !name.trim()) {
    return NextResponse.json({ message: "name 为必填项" }, { status: 400 })
  }

  let finalSlug = typeof slug === "string" && slug.trim() ? normalizeSlug(slug) : null
  if (!finalSlug) {
    finalSlug = await generateUniqueSlug(name)
  } else {
    finalSlug = await generateUniqueSlug(finalSlug)
  }

  try {
    const template = await prisma.contractTemplate.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error("Failed to create contract template", error)
    return NextResponse.json({ message: "创建产品合同模板失败" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { extractAndPersistBasicInfo } from "../../_helpers/basic-info"

type RouteContext = {
  params: Promise<{
    contractId: string
  }>
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { contractId } = await params

  if (!contractId) {
    return NextResponse.json({ message: "缺少合同ID" }, { status: 400 })
  }

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { id: true, markdown: true },
  })

  if (!contract) {
    return NextResponse.json({ message: "合同不存在" }, { status: 404 })
  }

  if (!contract.markdown || contract.markdown.trim().length === 0) {
    return NextResponse.json({ message: "合同缺少Markdown内容，无法解析" }, { status: 400 })
  }

  try {
    const basicInfo = await extractAndPersistBasicInfo(contractId, contract.markdown, {
      suppressErrors: false,
      requireRemote: true,
    })

    return NextResponse.json({ basicInfo }, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "解析基础信息失败，请稍后再试"
    return NextResponse.json({ message }, { status: 500 })
  }
}

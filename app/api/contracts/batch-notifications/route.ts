import { NextRequest, NextResponse } from "next/server"

import { normalizeContractIds } from "@/app/api/contracts/_helpers/exporter"
import { isEmailConfigured } from "@/lib/email"
import { prisma } from "@/lib/prisma"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const contractIds = normalizeContractIds(body?.contractIds)

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ message: "请输入有效的邮箱地址" }, { status: 400 })
  }

  if (contractIds.length === 0) {
    return NextResponse.json({ message: "缺少合同信息，无法创建邮件通知" }, { status: 400 })
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ message: "尚未配置邮件服务，请联系管理员" }, { status: 503 })
  }

  const existingContracts = await prisma.contract.findMany({
    where: { id: { in: contractIds } },
    select: { id: true },
  })

  if (existingContracts.length === 0) {
    return NextResponse.json({ message: "未找到匹配的合同记录" }, { status: 404 })
  }

  const existingIds = new Set(existingContracts.map((item) => item.id))
  const missingIds = contractIds.filter((id) => !existingIds.has(id))

  if (missingIds.length > 0) {
    return NextResponse.json(
      { message: `以下合同不存在或已删除：${missingIds.join(", ")}` },
      { status: 404 },
    )
  }

  const notification = await prisma.contractBatchNotification.create({
    data: {
      email,
      status: "PENDING",
      contracts: {
        create: contractIds.map((id) => ({ contractId: id })),
      },
    },
    select: { id: true },
  })

  return NextResponse.json({ id: notification.id }, { status: 201 })
}

import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { storageAdapter } from "@/lib/storage"

type RouteContext = {
  params: {
    contractId: string
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { contractId } = params

  if (!contractId) {
    return NextResponse.json({ message: "缺少合同ID" }, { status: 400 })
  }

  const contract = await prisma.contract.findUnique({ where: { id: contractId } })

  if (!contract) {
    return NextResponse.json({ message: "合同不存在" }, { status: 404 })
  }

  try {
    await storageAdapter.delete(contract.filePath)
  } catch (error) {
    console.warn(`删除合同文件失败（ID: ${contractId}, path: ${contract.filePath})`, error)
  }

  await prisma.contract.delete({ where: { id: contractId } })

  return NextResponse.json({ message: "合同已删除" }, { status: 200 })
}

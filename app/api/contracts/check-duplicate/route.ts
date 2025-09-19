import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calculateFileHash } from "@/lib/hash"

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "缺少文件或文件格式不正确" }, { status: 400 })
  }

  try {
    // 计算文件哈希
    const fileHash = await calculateFileHash(file)
    
    // 检查是否存在相同的合同
    const existingContract = await prisma.contract.findUnique({
      where: { fileHash },
      include: { analysis: true }
    })

    if (existingContract) {
      // 找到重复合同，返回重复信息
      return NextResponse.json({
        isDuplicate: true,
        existingContract: {
          id: existingContract.id,
          originalFileName: existingContract.originalFileName,
          createdAt: existingContract.createdAt,
          markdown: existingContract.markdown,
          hasAnalysis: !!existingContract.analysis,
          fileHash: existingContract.fileHash
        }
      })
    } else {
      // 没有找到重复合同
      return NextResponse.json({
        isDuplicate: false,
        fileHash
      })
    }
  } catch (error) {
    console.error("Failed to check duplicate contract", error)
    return NextResponse.json({ message: "检查重复合同时发生错误" }, { status: 500 })
  }
}

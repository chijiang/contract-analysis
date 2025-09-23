import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { storageAdapter } from "@/lib/storage"
import { calculateFileHash } from "@/lib/hash"
import { extractAndPersistBasicInfo } from "./_helpers/basic-info"
import { createProcessingLog } from "@/lib/processing-logs"

export async function GET() {
  const contracts = await prisma.contract.findMany({
    orderBy: { createdAt: "desc" },
    include: { basicInfo: true },
  })

  return NextResponse.json(contracts)
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file")
  const markdown = formData.get("markdown")
  const originalName = (formData.get("originalName") ?? (file instanceof File ? file.name : null)) as string | null
  const fileHash = formData.get("fileHash") as string | null // 前端预先计算的文件hash

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "缺少文件或文件格式不正确" }, { status: 400 })
  }

  if (typeof markdown !== "string" || markdown.length === 0) {
    return NextResponse.json({ message: "缺少Markdown内容" }, { status: 400 })
  }

  try {
    const startedAt = Date.now()
    const baseMetadata = file instanceof File
      ? {
          fileName: originalName ?? file.name ?? "未命名合同.pdf",
          fileSize: file.size,
          mimeType: file.type || "application/pdf",
        }
      : null
    // 如果前端没有提供fileHash，则在后端计算
    const finalFileHash = fileHash || await calculateFileHash(file)

    // 检查是否存在现有记录，以便决定是否需要清理旧文件
    const existingContract = await prisma.contract.findUnique({
      where: { fileHash: finalFileHash }
    })

    const saveResult = await storageAdapter.save(file, { originalName: originalName ?? undefined })
    const storageProvider = saveResult.provider === "local" ? "LOCAL" : "S3"

    // 如果存在现有记录且文件路径不同，清理旧文件
    if (existingContract && existingContract.filePath !== saveResult.filePath) {
      try {
        await storageAdapter.delete(existingContract.filePath)
      } catch (error) {
        console.warn("Failed to delete old file:", error)
        // 不阻止主流程，只记录警告
      }
    }

    // 使用upsert操作，避免fileHash重复时的冲突
    const contract = await prisma.contract.upsert({
      where: { fileHash: finalFileHash },
      update: {
        // 更新现有记录的信息
        originalFileName: originalName ?? file.name ?? "未命名合同.pdf",
        mimeType: file.type || "application/pdf",
        fileSize: file.size,
        storageProvider,
        filePath: saveResult.filePath,
        s3Key: storageProvider === "S3" ? saveResult.filePath : null,
        markdown,
        convertedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        // 创建新记录
        originalFileName: originalName ?? file.name ?? "未命名合同.pdf",
        mimeType: file.type || "application/pdf",
        fileSize: file.size,
        fileHash: finalFileHash,
        storageProvider,
        filePath: saveResult.filePath,
        s3Key: storageProvider === "S3" ? saveResult.filePath : null,
        markdown,
        convertedAt: new Date(),
      },
    })

    const basicInfo = await extractAndPersistBasicInfo(contract.id, markdown)

    await createProcessingLog({
      contractId: contract.id,
      action: "CONTRACT_UPLOAD",
      description: existingContract ? "更新已存在的合同记录" : "创建新的合同记录",
      source: "DATABASE",
      status: "SUCCESS",
      durationMs: Date.now() - startedAt,
      metadata: {
        ...baseMetadata,
        storageProvider,
        fileHash: finalFileHash,
        reusedContractId: existingContract?.id ?? null,
      },
    })

    return NextResponse.json({ ...contract, basicInfo }, { status: 201 })
  } catch (error) {
    console.error("Failed to persist contract", error)

    await createProcessingLog({
      contractId: null,
      action: "CONTRACT_UPLOAD",
      description: "保存合同失败",
      source: "DATABASE",
      status: "ERROR",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        originalName,
      },
    })
    return NextResponse.json({ message: "保存合同时发生错误" }, { status: 500 })
  }
}

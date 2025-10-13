import { prepareContractsExport } from "@/app/api/contracts/_helpers/exporter"
import { isEmailConfigured, sendEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"

const ACTIVE_STATUSES = new Set([
  "PENDING",
  "PROCESSING_BASIC_INFO",
  "PROCESSING_ANALYSIS",
  "PROCESSING_SERVICE_INFO",
])

type ContractStatusRecord = {
  id: string
  originalFileName: string
  processingStatus: string
  processingError: string | null
}

const formatStatusLabel = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "已完成"
    case "FAILED":
      return "处理失败"
    default:
      return status
  }
}

const buildEmailContent = (contracts: ContractStatusRecord[], exportedAt: string) => {
  const total = contracts.length
  const completed = contracts.filter((item) => item.processingStatus === "COMPLETED").length
  const failed = contracts.filter((item) => item.processingStatus === "FAILED").length

  const subject = `合同分析结果已完成 (${completed}/${total})`

  const lines = contracts.map((item) => {
    const statusLabel = formatStatusLabel(item.processingStatus)
    const error = item.processingError ? `（原因：${item.processingError}）` : ""
    return `- ${item.originalFileName}：${statusLabel}${error}`
  })

  const text = [
    "您好，",
    "",
    `您批量上传的 ${total} 份合同已经处理完成（成功 ${completed} 份，失败 ${failed} 份）。`,
    "详细分析结果请查看附件中的 Excel 文件。",
    "",
    "合同处理状态：",
    ...lines,
    "",
    `导出时间：${exportedAt}`,
    "",
    "如有疑问请联系管理员。",
  ].join("\n")

  const html = `
    <p>您好，</p>
    <p>您批量上传的 ${total} 份合同已经处理完成（成功 ${completed} 份，失败 ${failed} 份）。详细分析结果请查看附件中的 Excel 文件。</p>
    <p>合同处理状态：</p>
    <ul>
      ${contracts
        .map((item) => {
          const statusLabel = formatStatusLabel(item.processingStatus)
          const error = item.processingError ? `（原因：${item.processingError}）` : ""
          return `<li>${item.originalFileName}：${statusLabel}${error}</li>`
        })
        .join("")}
    </ul>
    <p>导出时间：${exportedAt}</p>
    <p>如有疑问请联系管理员。</p>
  `

  return { subject, text, html }
}

export const handleContractNotificationTriggers = async (contractId: string) => {
  if (!isEmailConfigured()) {
    return
  }

  const notifications = await prisma.contractBatchNotification.findMany({
    where: {
      status: "PENDING",
      contracts: { some: { contractId } },
    },
    include: {
      contracts: true,
    },
  })

  if (notifications.length === 0) {
    return
  }

  for (const notification of notifications) {
    const relatedContractIds = notification.contracts.map((item) => item.contractId)

    const result = await prisma.$transaction(async (tx) => {
      const fresh = await tx.contractBatchNotification.findUnique({
        where: { id: notification.id },
        include: { contracts: true },
      })

      if (!fresh || fresh.status !== "PENDING") {
        return null
      }

      const contracts = await tx.contract.findMany({
        where: { id: { in: relatedContractIds } },
        select: {
          id: true,
          originalFileName: true,
          processingStatus: true,
          processingError: true,
        },
      })

      if (contracts.length !== relatedContractIds.length) {
        await tx.contractBatchNotification.update({
          where: { id: notification.id },
          data: {
            status: "FAILED",
            sendError: "部分合同不存在或已删除，无法生成通知",
          },
        })
        return null
      }

      const stillProcessing = contracts.some((item) => ACTIVE_STATUSES.has(item.processingStatus))

      if (stillProcessing) {
        return null
      }

      await tx.contractBatchNotification.update({
        where: { id: notification.id },
        data: {
          status: "IN_PROGRESS",
          sendError: null,
        },
      })

      return contracts
    })

    if (!result) {
      continue
    }

    try {
      const { buffer, filename, exportedAt } = await prepareContractsExport(relatedContractIds)
      const { subject, text, html } = buildEmailContent(result as ContractStatusRecord[], exportedAt)

      await sendEmail({
        to: notification.email,
        subject,
        text,
        html,
        attachments: [{ filename, content: buffer }],
      })

      await prisma.contractBatchNotification.update({
        where: { id: notification.id },
        data: {
          status: "COMPLETED",
          notifiedAt: new Date(),
        },
      })
    } catch (error) {
      await prisma.contractBatchNotification.update({
        where: { id: notification.id },
        data: {
          status: "FAILED",
          sendError: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }
}

import * as XLSX from "xlsx"

import { parseServiceInfoSnapshotPayload } from "@/app/api/contracts/_helpers/service-info"
import type { StoredResultPayload } from "@/app/types/contract-analysis"
import { normalizeResultsByTemplate, safeParseJson } from "@/lib/contract-analysis-utils"
import { prisma } from "@/lib/prisma"

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes)) return ""
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

const normalizeTemplateIds = (value: string | null | undefined): string[] | null => {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      const ids = parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      return ids.length ? ids : null
    }
  } catch (error) {
    return null
  }
  return null
}

const normalizeIds = (input: string[]): string[] => {
  const result: string[] = []
  for (const value of input) {
    if (typeof value === "string" && value.trim().length > 0) {
      result.push(value.trim())
    }
  }
  return Array.from(new Set(result))
}

export const normalizeContractIds = (input: unknown): string[] => {
  if (!Array.isArray(input)) return []
  return normalizeIds(input as string[])
}

type ServicePlanRecommendation = ReturnType<typeof parseServiceInfoSnapshotPayload>["servicePlanRecommendation"]

export const prepareContractsExport = async (contractIds: string[]) => {
  const normalizedIds = normalizeIds(contractIds)

  if (normalizedIds.length === 0) {
    throw new Error("请选择至少一个合同再导出")
  }

  const contracts = await prisma.contract.findMany({
    where: { id: { in: normalizedIds } },
    include: {
      analysis: true,
      basicInfo: true,
      serviceInfoSnapshot: true,
    },
    orderBy: { createdAt: "desc" },
  })

  if (contracts.length === 0) {
    throw new Error("未找到匹配的合同记录")
  }

  const exportedAt = new Date().toISOString()
  const formatDate = (value: Date) => value.toISOString()

  const summaryRows: Record<string, string | number | null>[] = []
  const summaryMeta: Array<{ row: Record<string, string | number | null>; templateIds: string[] }> = []
  const servicePlanSummaryRows: Record<string, string | number | null>[] = []
  const servicePlanMatchRows: Record<string, string | number | null>[] = []
  const serviceInfoRows: Record<string, string | number | null>[] = []
  const analysisDetailRows: Record<string, string | number | null>[] = []

  const requiredTemplateIds = new Set<string>()

  for (const contract of contracts) {
    const snapshot = contract.serviceInfoSnapshot
      ? parseServiceInfoSnapshotPayload(contract.serviceInfoSnapshot.payload)
      : null

    const recommendation: ServicePlanRecommendation | null = snapshot?.servicePlanRecommendation ?? null
    const storedResult = safeParseJson<StoredResultPayload>(contract.analysis?.result ?? null)
    const selectedTemplateIds = contract.analysis ? normalizeTemplateIds(contract.analysis.selectedTemplateIds) : null
    const templateIdsForResult =
      selectedTemplateIds && selectedTemplateIds.length > 0
        ? selectedTemplateIds
        : Object.keys(storedResult?.resultsByTemplate ?? {})
    const normalizedResults = normalizeResultsByTemplate(storedResult, templateIdsForResult)

    templateIdsForResult.forEach((id) => requiredTemplateIds.add(id))
    Object.keys(normalizedResults).forEach((templateId) => requiredTemplateIds.add(templateId))

    const summaryRow: Record<string, string | number | null> = {
      合同ID: contract.id,
      合同名称: contract.originalFileName,
      上传时间: formatDate(contract.createdAt),
      最近更新: formatDate(contract.updatedAt),
      文件大小: formatFileSize(contract.fileSize),
      文件类型: contract.mimeType,
      模板数量: selectedTemplateIds ? selectedTemplateIds.length : 0,
      模板ID列表: templateIdsForResult.join("、"),
      模板名称列表: "",
      合同编号: contract.basicInfo?.contractNumber ?? "",
      合同正式名称: contract.basicInfo?.contractName ?? "",
      甲方: contract.basicInfo?.partyA ?? "",
      乙方: contract.basicInfo?.partyB ?? "",
      合同开始: contract.basicInfo?.contractStartDate ?? "",
      合同结束: contract.basicInfo?.contractEndDate ?? "",
      合同总金额: contract.basicInfo?.contractTotalAmount ?? "",
      付款方式: contract.basicInfo?.contractPaymentMethod ?? "",
      币种: contract.basicInfo?.contractCurrency ?? "",
      服务计划推荐: recommendation?.overallPlanName ?? "",
      调整说明: recommendation?.overallAdjustmentNotes ?? "",
      匹配条款数: recommendation?.matches.length ?? 0,
    }

    summaryRows.push(summaryRow)
    summaryMeta.push({ row: summaryRow, templateIds: templateIdsForResult })

    if (recommendation) {
      servicePlanSummaryRows.push({
        合同ID: contract.id,
        合同名称: contract.originalFileName,
        推荐服务计划: recommendation.overallPlanName ?? "",
        调整说明: recommendation.overallAdjustmentNotes ?? "",
        匹配条款数: recommendation.matches.length,
        导出时间: exportedAt,
      })

      recommendation.matches.forEach((match) => {
        servicePlanMatchRows.push({
          合同ID: contract.id,
          合同名称: contract.originalFileName,
          条款ID: match.clauseId,
          条款类型: match.clauseType,
          推荐服务计划: match.recommendedPlanName ?? "",
          匹配说明: match.rationale,
          备选计划: match.alternativePlanNames.join("、"),
        })
      })
    }

    const pushServiceInfoRow = (
      infoType: string,
      title: string,
      main: string,
      extra: string,
      snippet: string,
      relatedDevices: string,
    ) => {
      if (!main && !extra && !snippet) return
      serviceInfoRows.push({
        合同ID: contract.id,
        合同名称: contract.originalFileName,
        信息类型: infoType,
        条目: title,
        主要内容: main,
        补充说明: extra,
        原文摘录: snippet,
        关联设备: relatedDevices,
      })
    }

    const formatDeviceList = (
      devices: ReturnType<typeof parseServiceInfoSnapshotPayload>["onsiteSla"][number]["devices"],
    ) =>
      devices
        .map((device) => {
          const parts = [device.deviceName ?? "", device.deviceModel ?? "", device.geHostSystemNumber ?? ""]
            .filter((item) => item && item.trim().length > 0)
          return parts.join("/")
        })
        .filter(Boolean)
        .join(" | ")

    if (snapshot) {
      snapshot.onsiteSla.forEach((item) => {
        const parts: string[] = []
        if (item.serviceType) parts.push(`服务计划：${item.serviceType}`)
        if (typeof item.responseTimeHours === "number") parts.push(`响应 ${item.responseTimeHours} 小时`)
        if (typeof item.onSiteTimeHours === "number") parts.push(`到场 ${item.onSiteTimeHours} 小时`)
        if (item.coverage) parts.push(`覆盖：${item.coverage}`)
        pushServiceInfoRow(
          "现场SLA",
          item.serviceType ?? "未注明",
          parts.join("；"),
          "",
          item.originalContractSnippet ?? "",
          formatDeviceList(item.devices),
        )
      })

      snapshot.yearlyMaintenance.forEach((item) => {
        const freq: string[] = []
        if (typeof item.standardPmPerYear === "number") freq.push(`标准保养 ${item.standardPmPerYear} 次/年`)
        if (typeof item.smartPmPerYear === "number") freq.push(`精智保养 ${item.smartPmPerYear} 次/年`)
        if (typeof item.remotePmPerYear === "number") freq.push(`远程保养 ${item.remotePmPerYear} 次/年`)
        const extra: string[] = []
        if (item.scope.length) extra.push(`范围：${item.scope.join("、")}`)
        if (item.deliverables) extra.push(`交付物：${item.deliverables}`)
        if (item.scheduling) extra.push(`排期：${item.scheduling}`)
        pushServiceInfoRow(
          "年度保养",
          item.serviceType ?? "未注明",
          freq.join("；"),
          extra.join("；"),
          item.originalContractSnippet ?? "",
          formatDeviceList(item.devices),
        )
      })

      snapshot.remoteMaintenance.forEach((item) => {
        const modalityCounts: Array<[string, number | null]> = [
          ["CT", item.ctRemotePmPerYear],
          ["MR", item.mrRemotePmPerYear],
          ["IGS", item.igsRemotePmPerYear],
          ["DR", item.drRemotePmPerYear],
          ["Mammo", item.mammoRemotePmPerYear],
          ["移动DR", item.mobileDrRemotePmPerYear],
          ["骨密度", item.boneDensityRemotePmPerYear],
          ["超声", item.usRemotePmPerYear],
          ["其他", item.otherRemotePmPerYear],
        ]
        const counts = modalityCounts
          .filter(([, value]) => typeof value === "number")
          .map(([label, value]) => `${label} ${value} 次/年`)
        const parts: string[] = []
        if (item.platform) parts.push(`平台：${item.platform}`)
        if (item.prerequisitesMaxUsersPerDevice != null) parts.push(`账号上限 ${item.prerequisitesMaxUsersPerDevice}`)
        if (counts.length) parts.push(counts.join("；"))
        const extra: string[] = []
        if (item.reports.length) extra.push(`报告：${item.reports.join("、")}`)
        pushServiceInfoRow(
          "远程维护",
          item.serviceType ?? "未注明",
          parts.join("；"),
          extra.join("；"),
          item.originalContractSnippet ?? "",
          "",
        )
      })

      snapshot.trainingSupports.forEach((item) => {
        const parts: string[] = []
        parts.push(`类别：${item.trainingCategory ?? "未注明"}`)
        if (item.applicableDevices.length) parts.push(`适用设备：${item.applicableDevices.join("、")}`)
        if (item.trainingTimes != null) parts.push(`次数：${item.trainingTimes}`)
        if (item.trainingPeriod) parts.push(`周期：${item.trainingPeriod}`)
        const extra: string[] = []
        if (item.trainingDays != null) extra.push(`每次天数：${item.trainingDays}`)
        if (item.trainingSeats != null) extra.push(`名额：${item.trainingSeats}`)
        if (item.trainingCost) extra.push(`费用：${item.trainingCost}`)
        pushServiceInfoRow(
          "培训支持",
          item.trainingCategory ?? "培训项目",
          parts.join("；"),
          extra.join("；"),
          item.originalContractSnippet ?? "",
          "",
        )
      })

      snapshot.keySpareParts.forEach((item) => {
        const parts: string[] = []
        if (item.coveredItems.length) parts.push(`覆盖部件：${item.coveredItems.join("、")}`)
        if (item.replacementPolicy) parts.push(`更换策略：${item.replacementPolicy}`)
        if (item.oldPartReturnRequired != null) parts.push(`旧件回收：${item.oldPartReturnRequired ? "需要" : "不需要"}`)
        if (item.nonReturnPenaltyPct != null) parts.push(`不回收赔付：${item.nonReturnPenaltyPct}%`)
        if (item.logisticsBy) parts.push(`物流：${item.logisticsBy}`)
        if (item.leadTimeBusinessDays != null) parts.push(`时效：${item.leadTimeBusinessDays} 工作日`)
        const extra: string[] = []
        if (item.tubes.length) {
          extra.push(
            `球管：${item.tubes
              .map((tube) => [tube.deviceModel, tube.geHostSystemNumber, tube.xrTubeId].filter(Boolean).join("/"))
              .filter(Boolean)
              .join(" | ")}`,
          )
        }
        if (item.coils.length) {
          extra.push(
            `线圈：${item.coils
              .map((coil) => [coil.coilName, coil.geHostSystemNumber, coil.coilSerialNumber].filter(Boolean).join("/"))
              .filter(Boolean)
              .join(" | ")}`,
          )
        }
        pushServiceInfoRow(
          "关键备件",
          item.serviceType ?? "备件条款",
          parts.join("；"),
          extra.join("；"),
          item.originalContractSnippet ?? "",
          "",
        )
      })

      if (snapshot.contractCompliance) {
        const cc = snapshot.contractCompliance
        pushServiceInfoRow(
          "合同合规",
          "信息保密要求",
          cc.informationConfidentialityRequirements == null
            ? ""
            : cc.informationConfidentialityRequirements
              ? "是"
              : "否",
          "",
          "",
          "",
        )
        pushServiceInfoRow("合同合规", "违约责任", cc.liabilityOfBreach ?? "", "", "", "")
        pushServiceInfoRow("合同合规", "配件退还要求", cc.partsReturnRequirements ?? "", "", "", "")
        pushServiceInfoRow("合同合规", "交付要求", cc.deliveryRequirements ?? "", "", "", "")
        pushServiceInfoRow("合同合规", "运输保险", cc.transportationInsurance ?? "", "", "", "")
        pushServiceInfoRow("合同合规", "到货地点", cc.deliveryLocation ?? "", "", "", "")
      }

      if (snapshot.afterSalesSupport) {
        const af = snapshot.afterSalesSupport
        pushServiceInfoRow(
          "售后支持",
          "开机保证率",
          af.guaranteeRunningRate != null ? `${af.guaranteeRunningRate}` : "",
          "",
          "",
          "",
        )
        pushServiceInfoRow("售后支持", "保证机制", af.guaranteeMechanism ?? "", "", "", "")
        pushServiceInfoRow("售后支持", "服务报告形式", af.serviceReportForm ?? "", "", "", "")
        pushServiceInfoRow("售后支持", "远程服务", af.remoteService ?? "", "", "", "")
        pushServiceInfoRow("售后支持", "热线支持", af.hotlineSupport ?? "", "", "", "")
        pushServiceInfoRow(
          "售后支持",
          "保税库备件优先",
          af.taxFreePartsPriority == null ? "" : af.taxFreePartsPriority ? "是" : "否",
          "",
          "",
          "",
        )
      }
    }

    Object.entries(normalizedResults).forEach(([templateId, detection]) => {
      detection.extractedClauses.forEach((clause) => {
        analysisDetailRows.push({
          合同ID: contract.id,
          合同名称: contract.originalFileName,
          模板ID: templateId,
          模板名称: "",
          条款分类: clause.clauseCategory,
          条款项: clause.clauseItem,
          合规结论: clause.compliance ?? "",
          风险等级: clause.risk?.level ?? "",
          风险意见: clause.risk?.opinion ?? "",
          风险建议: clause.risk?.recommendation ?? "",
          标准条款类别: clause.standardReference?.clause_category ?? "",
          标准条款项: clause.standardReference?.clause_item ?? "",
          标准条款内容: clause.standardReference?.standard_text ?? "",
          合同摘录: clause.contractText ?? "",
        })
      })
    })
  }

  const templateNameRecords =
    requiredTemplateIds.size > 0
      ? await prisma.contractTemplate.findMany({
          where: { id: { in: Array.from(requiredTemplateIds) } },
          select: { id: true, name: true },
        })
      : []
  const templateNameMap = new Map(templateNameRecords.map((item) => [item.id, item.name]))

  summaryMeta.forEach(({ row, templateIds }) => {
    row["模板名称列表"] = templateIds.map((id) => templateNameMap.get(id) ?? id).join("、")
  })

  analysisDetailRows.forEach((row) => {
    const templateIdRaw = row["模板ID"]
    const templateId = typeof templateIdRaw === "string" ? templateIdRaw : ""
    row["模板名称"] = templateNameMap.get(templateId) ?? templateId
  })

  const workbook = XLSX.utils.book_new()
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows, {
    header: [
      "合同ID",
      "合同名称",
      "上传时间",
      "最近更新",
      "文件大小",
      "文件类型",
      "模板数量",
      "模板ID列表",
      "模板名称列表",
      "合同编号",
      "合同正式名称",
      "甲方",
      "乙方",
      "合同开始",
      "合同结束",
      "合同总金额",
      "付款方式",
      "币种",
      "服务计划推荐",
      "调整说明",
      "匹配条款数",
    ],
  })
  XLSX.utils.book_append_sheet(workbook, summarySheet, "合同总览")

  if (servicePlanSummaryRows.length > 0) {
    const planSheet = XLSX.utils.json_to_sheet(servicePlanSummaryRows, {
      header: ["合同ID", "合同名称", "推荐服务计划", "调整说明", "匹配条款数", "导出时间"],
    })
    XLSX.utils.book_append_sheet(workbook, planSheet, "服务计划概览")
  }

  if (servicePlanMatchRows.length > 0) {
    const matchSheet = XLSX.utils.json_to_sheet(servicePlanMatchRows, {
      header: ["合同ID", "合同名称", "条款ID", "条款类型", "推荐服务计划", "匹配说明", "备选计划"],
    })
    XLSX.utils.book_append_sheet(workbook, matchSheet, "服务计划条款匹配")
  }

  if (serviceInfoRows.length > 0) {
    const serviceSheet = XLSX.utils.json_to_sheet(serviceInfoRows, {
      header: ["合同ID", "合同名称", "信息类型", "条目", "主要内容", "补充说明", "原文摘录", "关联设备"],
    })
    XLSX.utils.book_append_sheet(workbook, serviceSheet, "服务信息明细")
  }

  if (analysisDetailRows.length > 0) {
    const analysisSheet = XLSX.utils.json_to_sheet(analysisDetailRows, {
      header: [
        "合同ID",
        "合同名称",
        "模板ID",
        "模板名称",
        "条款分类",
        "条款项",
        "合规结论",
        "风险等级",
        "风险意见",
        "风险建议",
        "标准条款类别",
        "标准条款项",
        "标准条款内容",
        "合同摘录",
      ],
    })
    XLSX.utils.book_append_sheet(workbook, analysisSheet, "条款分析明细")
  }

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer
  const filename = `contract-analysis-export-${exportedAt.replace(/[-:]/g, "").split(".")[0]}.xlsx`

  return { buffer, filename, exportedAt, contracts }
}

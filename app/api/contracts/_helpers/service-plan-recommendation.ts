import { buildBackendUrl } from "@/lib/backend-service"
import { prisma } from "@/lib/prisma"
import type { ServiceInfoSnapshotPayload } from "@/app/types/service-info"
import type {
  ClausePlanRecommendation,
  ServicePlanRecommendationResult,
  ServicePlanClauseType,
} from "@/app/types/service-plan-recommendation"
import { servicePlanDetailInclude } from "@/lib/service-plans"

export type ClauseInputPayload = {
  clauseId: string
  clauseType: ServicePlanClauseType
  clauseText: string
  structuredAttributes?: Record<string, string>
  originalSnippet?: string
}

export type ServicePlanCandidatePayload = {
  planId: string
  planName: string
  description?: string | null
  clauses: {
    category?: string | null
    clauseItem: string
    requirement: string
    notes?: string | null
  }[]
}

const STANDARD_PLAN_KEYWORD = "智"
const STANDARD_PLAN_SUFFIX = "保"
const RATIONALE_MAX_LENGTH = 30

const trimText = (value: string | null | undefined) => value?.trim() ?? null
const formatNumber = (value: number | null | undefined, unit?: string) => {
  if (value === null || value === undefined || Number.isNaN(value)) return undefined
  return unit ? `${value}${unit}` : `${value}`
}
const formatList = (list: string[]) => list.filter((entry) => entry && entry.trim().length > 0).join("、")
const truncateSnippet = (snippet: string | null | undefined, maxLength = 360) => {
  if (!snippet) return undefined
  const normalized = snippet.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}…`
}

const containsStandardServiceType = (value: string | null | undefined) => {
  if (!value) return false
  return value.includes(STANDARD_PLAN_KEYWORD) && value.includes(STANDARD_PLAN_SUFFIX)
}

const hasExplicitServiceType = (value: string | null | undefined) => Boolean(trimText(value))

const buildOnsiteClauses = (
  items: ServiceInfoSnapshotPayload["onsiteSla"],
): ClauseInputPayload[] => {
  const clauses: ClauseInputPayload[] = []
  items.forEach((item, index) => {
    if (hasExplicitServiceType(item.serviceType)) return
    const deviceNames = item.devices.map((device) => device.deviceName).filter(Boolean)
    const parts: string[] = [
      item.responseTimeHours !== null && item.responseTimeHours !== undefined
        ? `报修响应 ${item.responseTimeHours} 小时`
        : "报修响应时间未提供",
      item.onSiteTimeHours !== null && item.onSiteTimeHours !== undefined
        ? `现场到场 ${item.onSiteTimeHours} 小时`
        : "现场到场时间未提供",
      item.coverage ? `覆盖时段 ${item.coverage}` : "服务覆盖时段未说明",
    ]
    if (deviceNames.length) {
      parts.push(`适用设备：${formatList(deviceNames as string[])}`)
    }
    clauses.push({
      clauseId: `onsite-${index}`,
      clauseType: "onsite_sla" as ServicePlanClauseType,
      clauseText: parts.join("；"),
      structuredAttributes: {
        "响应时间(小时)": formatNumber(item.responseTimeHours) ?? "未提供",
        "到场时间(小时)": formatNumber(item.onSiteTimeHours) ?? "未提供",
        覆盖时段: item.coverage ?? "未说明",
        ...(deviceNames.length ? { 适用设备: formatList(deviceNames as string[]) } : {}),
      },
      originalSnippet: truncateSnippet(item.originalContractSnippet),
    })
  })
  return clauses
}

const buildYearlyClauses = (
  items: ServiceInfoSnapshotPayload["yearlyMaintenance"],
): ClauseInputPayload[] => {
  const clauses: ClauseInputPayload[] = []
  items.forEach((item, index) => {
    if (hasExplicitServiceType(item.serviceType)) return
    const parts: string[] = [
      item.standardPmPerYear !== null && item.standardPmPerYear !== undefined
        ? `标准保养 ${item.standardPmPerYear} 次/年`
        : "标准保养次数未提供",
      item.smartPmPerYear !== null && item.smartPmPerYear !== undefined
        ? `精智保养 ${item.smartPmPerYear} 次/年`
        : null,
      item.remotePmPerYear !== null && item.remotePmPerYear !== undefined
        ? `远程保养 ${item.remotePmPerYear} 次/年`
        : null,
      item.scope.length ? `保养范围：${formatList(item.scope)}` : null,
      item.deliverables ? `交付物：${item.deliverables}` : null,
      item.scheduling ? `排期要求：${item.scheduling}` : null,
    ].filter(Boolean) as string[]
    clauses.push({
      clauseId: `yearly-${index}`,
      clauseType: "yearly_maintenance" as ServicePlanClauseType,
      clauseText: parts.join("；"),
      structuredAttributes: {
        "标准保养(次/年)": formatNumber(item.standardPmPerYear) ?? "未提供",
        ...(item.smartPmPerYear !== null && item.smartPmPerYear !== undefined
          ? { "精智保养(次/年)": formatNumber(item.smartPmPerYear)! }
          : {}),
        ...(item.remotePmPerYear !== null && item.remotePmPerYear !== undefined
          ? { "远程保养(次/年)": formatNumber(item.remotePmPerYear)! }
          : {}),
        ...(item.scope.length ? { 保养范围: formatList(item.scope) } : {}),
        ...(item.deliverables ? { 交付物: item.deliverables } : {}),
        ...(item.scheduling ? { 排期要求: item.scheduling } : {}),
      },
      originalSnippet: truncateSnippet(item.originalContractSnippet),
    })
  })
  return clauses
}

const buildRemoteClauses = (
  items: ServiceInfoSnapshotPayload["remoteMaintenance"],
): ClauseInputPayload[] => {
  const clauses: ClauseInputPayload[] = []
  items.forEach((item, index) => {
    if (hasExplicitServiceType(item.serviceType)) return
    const modalityPairs: Array<[string, number | null]> = [
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
    const counts = modalityPairs
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([label, value]) => `${label} ${value} 次/年`)
    const parts: string[] = [
      item.platform ? `远程平台：${item.platform}` : "远程平台未说明",
      counts.length ? `远程保养配置：${counts.join("；")}` : "未提供远程保养频次",
      item.prerequisitesMaxUsersPerDevice !== null && item.prerequisitesMaxUsersPerDevice !== undefined
        ? `每台设备账号上限 ${item.prerequisitesMaxUsersPerDevice}`
        : null,
      item.reports.length ? `输出报告：${formatList(item.reports)}` : null,
    ].filter(Boolean) as string[]

    const structured: Record<string, string> = {}
    if (item.platform) structured.平台 = item.platform
    if (item.prerequisitesMaxUsersPerDevice !== null && item.prerequisitesMaxUsersPerDevice !== undefined) {
      structured["账号上限"] = `${item.prerequisitesMaxUsersPerDevice}`
    }
    if (item.reports.length) structured.报告类型 = formatList(item.reports)
    modalityPairs.forEach(([label, value]) => {
      if (value !== null && value !== undefined) {
        structured[`远程保养-${label}`] = `${value}`
      }
    })

    clauses.push({
      clauseId: `remote-${index}`,
      clauseType: "remote_maintenance" as ServicePlanClauseType,
      clauseText: parts.join("；"),
      structuredAttributes: Object.keys(structured).length ? structured : undefined,
      originalSnippet: truncateSnippet(item.originalContractSnippet),
    })
  })
  return clauses
}

const buildTrainingClauses = (
  items: ServiceInfoSnapshotPayload["trainingSupports"],
): ClauseInputPayload[] => {
  const clauses: ClauseInputPayload[] = []
  items.forEach((item, index) => {
    if (hasExplicitServiceType(item.serviceType)) return
    const parts: string[] = [
      item.trainingCategory ? `培训类别：${item.trainingCategory}` : "培训类别未说明",
      item.applicableDevices.length ? `适用设备：${formatList(item.applicableDevices)}` : null,
      item.trainingTimes !== null && item.trainingTimes !== undefined ? `培训次数 ${item.trainingTimes}` : null,
      item.trainingPeriod ? `培训周期 ${item.trainingPeriod}` : null,
      item.trainingDays !== null && item.trainingDays !== undefined ? `每次 ${item.trainingDays} 天` : null,
      item.trainingSeats !== null && item.trainingSeats !== undefined ? `名额 ${item.trainingSeats} 人` : null,
      item.trainingCost ? `费用说明：${item.trainingCost}` : null,
    ].filter(Boolean) as string[]

    const structured: Record<string, string> = {}
    if (item.trainingCategory) structured.培训类别 = item.trainingCategory
    if (item.applicableDevices.length) structured.适用设备 = formatList(item.applicableDevices)
    if (item.trainingTimes !== null && item.trainingTimes !== undefined) structured.培训次数 = `${item.trainingTimes}`
    if (item.trainingPeriod) structured.培训周期 = item.trainingPeriod
    if (item.trainingDays !== null && item.trainingDays !== undefined) structured.每次天数 = `${item.trainingDays}`
    if (item.trainingSeats !== null && item.trainingSeats !== undefined) structured.培训名额 = `${item.trainingSeats}`
    if (item.trainingCost) structured.费用 = item.trainingCost

    clauses.push({
      clauseId: `training-${index}`,
      clauseType: "training_support" as ServicePlanClauseType,
      clauseText: parts.join("；"),
      structuredAttributes: Object.keys(structured).length ? structured : undefined,
      originalSnippet: truncateSnippet(item.originalContractSnippet),
    })
  })
  return clauses
}

const buildSpareClauses = (
  items: ServiceInfoSnapshotPayload["keySpareParts"],
): ClauseInputPayload[] => {
  const clauses: ClauseInputPayload[] = []
  items.forEach((item, index) => {
    if (hasExplicitServiceType(item.serviceType)) return
    const parts: string[] = [
      item.coveredItems.length ? `覆盖部件：${formatList(item.coveredItems)}` : "覆盖部件未说明",
      item.replacementPolicy ? `更换策略：${item.replacementPolicy}` : null,
      item.oldPartReturnRequired !== null && item.oldPartReturnRequired !== undefined
        ? `旧件回收：${item.oldPartReturnRequired ? "需要" : "不需要"}`
        : null,
      item.nonReturnPenaltyPct !== null && item.nonReturnPenaltyPct !== undefined
        ? `不回收赔付上限：${item.nonReturnPenaltyPct}%`
        : null,
      item.logisticsBy ? `物流承担：${item.logisticsBy}` : null,
      item.leadTimeBusinessDays !== null && item.leadTimeBusinessDays !== undefined
        ? `发货/更换时效 ${item.leadTimeBusinessDays} 个工作日`
        : null,
    ].filter(Boolean) as string[]

    const structured: Record<string, string> = {}
    if (item.coveredItems.length) structured.覆盖部件 = formatList(item.coveredItems)
    if (item.replacementPolicy) structured.更换策略 = item.replacementPolicy
    if (item.oldPartReturnRequired !== null && item.oldPartReturnRequired !== undefined) {
      structured.旧件回收 = item.oldPartReturnRequired ? "是" : "否"
    }
    if (item.nonReturnPenaltyPct !== null && item.nonReturnPenaltyPct !== undefined) {
      structured["不回收赔付(%)"] = `${item.nonReturnPenaltyPct}`
    }
    if (item.logisticsBy) structured.物流承担 = item.logisticsBy
    if (item.leadTimeBusinessDays !== null && item.leadTimeBusinessDays !== undefined) {
      structured["时效(工作日)"] = `${item.leadTimeBusinessDays}`
    }

    clauses.push({
      clauseId: `spare-${index}`,
      clauseType: "key_spare_parts" as ServicePlanClauseType,
      clauseText: parts.join("；"),
      structuredAttributes: Object.keys(structured).length ? structured : undefined,
      originalSnippet: truncateSnippet(item.originalContractSnippet),
    })
  })
  return clauses
}

export const buildClauseInputs = (snapshot: ServiceInfoSnapshotPayload): ClauseInputPayload[] => [
  ...buildOnsiteClauses(snapshot.onsiteSla),
  ...buildYearlyClauses(snapshot.yearlyMaintenance),
  ...buildRemoteClauses(snapshot.remoteMaintenance),
  ...buildTrainingClauses(snapshot.trainingSupports),
  ...buildSpareClauses(snapshot.keySpareParts),
]

export const hasAmbiguousServiceClauses = (snapshot: ServiceInfoSnapshotPayload) => buildClauseInputs(snapshot).length > 0

export const isNonStandardContract = (snapshot: ServiceInfoSnapshotPayload) => {
  const serviceTypes = [
    ...snapshot.onsiteSla.map((item) => item.serviceType),
    ...snapshot.yearlyMaintenance.map((item) => item.serviceType),
    ...snapshot.remoteMaintenance.map((item) => item.serviceType),
    ...snapshot.trainingSupports.map((item) => item.serviceType),
    ...snapshot.keySpareParts.map((item) => item.serviceType),
  ]
  return !serviceTypes.some((serviceType) => containsStandardServiceType(serviceType))
}

export const shouldAutoRecommend = (snapshot: ServiceInfoSnapshotPayload) =>
  isNonStandardContract(snapshot) && hasAmbiguousServiceClauses(snapshot)

export const fetchServicePlanCandidates = async (): Promise<ServicePlanCandidatePayload[]> => {
  const plans = await prisma.servicePlan.findMany({
    include: servicePlanDetailInclude,
    orderBy: [{ createdAt: "asc" }],
  })
  return plans.map((plan) => ({
    planId: plan.id,
    planName: plan.name,
    description: plan.description ?? null,
    clauses: plan.clauses.map((clause) => ({
      category: clause.category ?? null,
      clauseItem: clause.clauseItem,
      requirement: clause.requirement,
      notes: clause.notes ?? null,
    })),
  }))
}

const truncateRationale = (text: string) => {
  const trimmed = text.trim()
  const chars = Array.from(trimmed)
  if (chars.length <= RATIONALE_MAX_LENGTH) return trimmed
  return `${chars.slice(0, RATIONALE_MAX_LENGTH).join("")}…`
}

const normalizeRecommendationResult = (result: ServicePlanRecommendationResult): ServicePlanRecommendationResult => ({
  summary: result.summary.trim(),
  overallPlanId: trimText(result.overallPlanId) ?? null,
  overallPlanName: trimText(result.overallPlanName) ?? null,
  overallAdjustmentNotes: trimText(result.overallAdjustmentNotes) ?? null,
  matches: result.matches.map<ClausePlanRecommendation>((match) => ({
    clauseId: match.clauseId,
    clauseType: match.clauseType,
    recommendedPlanId: trimText(match.recommendedPlanId) ?? null,
    recommendedPlanName: trimText(match.recommendedPlanName) ?? null,
    rationale: truncateRationale(match.rationale ?? ""),
    alternativePlanIds: match.alternativePlanIds.map((id) => id.trim()).filter(Boolean),
    alternativePlanNames: match.alternativePlanNames.map((name) => name.trim()).filter(Boolean),
  })),
})

export const requestServicePlanRecommendation = async (
  clauses: ClauseInputPayload[],
  candidates: ServicePlanCandidatePayload[],
): Promise<ServicePlanRecommendationResult> => {
  const url = buildBackendUrl("/api/v1/service_plan_recommendation")
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clauses, candidates }),
  })

  if (!response.ok) {
    throw new Error(`服务计划匹配调用失败，状态码 ${response.status}`)
  }

  const data = (await response.json()) as ServicePlanRecommendationResult
  return normalizeRecommendationResult({
    summary: data.summary ?? "",
    overallPlanId: data.overallPlanId ?? null,
    overallPlanName: data.overallPlanName ?? null,
    overallAdjustmentNotes: data.overallAdjustmentNotes ?? null,
    matches: Array.isArray(data.matches) ? data.matches : [],
  })
}

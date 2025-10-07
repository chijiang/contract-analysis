import { prisma } from "@/lib/prisma"
import { buildBackendUrl } from "@/lib/backend-service"
import { createProcessingLog } from "@/lib/processing-logs"
import {
  type AfterSalesSupportItem,
  type ContractComplianceItem,
  type DeviceInfo,
  type KeySparePartItem,
  type OnsiteSlaItem,
  type RemoteMaintenanceItem,
  type ServiceInfoSnapshotPayload,
  type TrainingSupportItem,
  type YearlyMaintenanceItem,
  createEmptyServiceInfoSnapshot,
} from "@/app/types/service-info"
import type { ClausePlanRecommendation, ServicePlanRecommendationResult } from "@/app/types/service-plan-recommendation"
import {
  shouldAutoRecommend,
  buildClauseInputs,
  fetchServicePlanCandidates,
  requestServicePlanRecommendation,
} from "./service-plan-recommendation"

const toNullableString = (value: unknown) => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

const toNullableNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim()
    if (!normalized) return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const toNullableBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value
  if (typeof value === "number") {
    if (Number.isNaN(value)) return null
    if (!Number.isFinite(value)) return null
    return value !== 0
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["true", "yes", "y", "1"].includes(normalized)) return true
    if (["false", "no", "n", "0"].includes(normalized)) return false
  }
  return null
}

const toStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[]
  return value.map((entry) => toNullableString(entry)).filter((entry): entry is string => Boolean(entry))
}

const pickValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    if (key in record) {
      return record[key]
    }
  }
  return undefined
}

const toStringOrEmpty = (value: unknown) => {
  if (typeof value === "string") return value.trim()
  if (value === null || value === undefined) return ""
  return String(value)
}

const normalizeServicePlanRecommendation = (value: unknown): ServicePlanRecommendationResult | null => {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const matchesRaw = Array.isArray(pickValue(record, ["matches"])) ? (pickValue(record, ["matches"]) as unknown[]) : []

  const matches: ClausePlanRecommendation[] = matchesRaw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry, index) => {
      const clauseId =
        toNullableString(pickValue(entry, ["clauseId", "clause_id"])) ?? `clause-${index + 1}`
      const clauseType =
        toNullableString(pickValue(entry, ["clauseType", "clause_type"])) ?? "unknown"
      const recommendedPlanId = toNullableString(pickValue(entry, ["recommendedPlanId", "recommended_plan_id"]))
      const recommendedPlanName = toNullableString(pickValue(entry, ["recommendedPlanName", "recommended_plan_name"]))
      const rationale = toStringOrEmpty(pickValue(entry, ["rationale"]))
      const alternativePlanIds = toStringArray(pickValue(entry, ["alternativePlanIds", "alternative_plan_ids"]))
      const alternativePlanNames = toStringArray(pickValue(entry, ["alternativePlanNames", "alternative_plan_names"]))

      return {
        clauseId,
        clauseType,
        recommendedPlanId: recommendedPlanId ?? null,
        recommendedPlanName: recommendedPlanName ?? null,
        rationale,
        alternativePlanIds,
        alternativePlanNames,
      }
    })

  return {
    summary: toStringOrEmpty(pickValue(record, ["summary"])),
    overallPlanId: toNullableString(pickValue(record, ["overallPlanId", "overall_plan_id"])) ?? null,
    overallPlanName: toNullableString(pickValue(record, ["overallPlanName", "overall_plan_name"])) ?? null,
    overallAdjustmentNotes:
      toNullableString(pickValue(record, ["overallAdjustmentNotes", "overall_adjustment_notes"])) ?? null,
    matches,
  }
}

const buildServiceInfoUrl = (path: string) => {
  try {
    return buildBackendUrl(path, process.env.SERVICE_INFO_API_BASE_URL)
  } catch (error) {
    return buildBackendUrl(path)
  }
}

const requestPayload = async <T>(path: string, markdown: string) => {
  const url = buildServiceInfoUrl(path)
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: markdown }),
  })

  if (!response.ok) {
    throw new Error(`服务调用失败(${path})，状态码 ${response.status}`)
  }

  const payload = (await response.json()) as T
  return { url, payload }
}

export const parseServiceInfoSnapshotPayload = (payload: string | null | undefined) => {
  if (!payload) {
    return createEmptyServiceInfoSnapshot()
  }
  try {
    const parsed = JSON.parse(payload) as ServiceInfoSnapshotPayload
    return {
      ...createEmptyServiceInfoSnapshot(),
      ...parsed,
      onsiteSla: Array.isArray(parsed?.onsiteSla) ? parsed.onsiteSla : [],
      yearlyMaintenance: Array.isArray(parsed?.yearlyMaintenance) ? parsed.yearlyMaintenance : [],
      remoteMaintenance: Array.isArray(parsed?.remoteMaintenance) ? parsed.remoteMaintenance : [],
      trainingSupports: Array.isArray(parsed?.trainingSupports) ? parsed.trainingSupports : [],
      keySpareParts: Array.isArray(parsed?.keySpareParts) ? parsed.keySpareParts : [],
      contractCompliance: parsed?.contractCompliance ?? null,
      afterSalesSupport: parsed?.afterSalesSupport ?? null,
      servicePlanRecommendation: normalizeServicePlanRecommendation(parsed?.servicePlanRecommendation),
    }
  } catch (error) {
    console.warn("Failed to parse service info snapshot", error)
    return createEmptyServiceInfoSnapshot()
  }
}

type ExtractOptions = { suppressErrors?: boolean }

const extractDeviceList = (value: unknown): DeviceInfo[] => {
  if (!Array.isArray(value)) return []
  return value.map((device) => {
    if (!device || typeof device !== "object") {
      return {
        deviceName: null,
        registrationNumber: null,
        deviceModel: null,
        geHostSystemNumber: null,
        installationDate: null,
        serviceStartDate: null,
        serviceEndDate: null,
      }
    }

    const record = device as Record<string, unknown>
    return {
      deviceName: toNullableString(record.device_name),
      registrationNumber: toNullableString(record.registration_number),
      deviceModel: toNullableString(record.device_model),
      geHostSystemNumber: toNullableString(record.ge_host_system_number),
      installationDate: toNullableString(record.installation_date),
      serviceStartDate: toNullableString(record.service_start_date),
      serviceEndDate: toNullableString(record.service_end_date),
    }
  })
}

export async function extractAndPersistServiceInfo(contractId: string, markdown: string, options: ExtractOptions = {}) {
  const { suppressErrors = true } = options
  const existingSnapshot = await prisma.contractServiceInfoSnapshot.findUnique({ where: { contractId } })
  const previousSnapshot = existingSnapshot ? parseServiceInfoSnapshotPayload(existingSnapshot.payload) : null
  const baseLog = { contractId, source: "AI" as const, action: "SERVICE_INFO_EXTRACTION" as const }
  const startedAt = Date.now()

  if (!markdown || !markdown.trim()) {
    await createProcessingLog({
      ...baseLog,
      status: "SKIPPED",
      description: "缺少Markdown内容，跳过服务信息提取",
      durationMs: Date.now() - startedAt,
    })
    return previousSnapshot ?? createEmptyServiceInfoSnapshot()
  }

  try {
    const [onsiteRes, yearlyRes, remoteRes, trainingRes, complianceRes, afterSalesRes, keySparePartsRes] = await Promise.all([
      requestPayload<any>("/api/v1/onsite_SLA_extraction", markdown),
      requestPayload<any>("/api/v1/yearly_maintenance_info_extraction", markdown),
      requestPayload<any>("/api/v1/remote_maintenance_info_extraction", markdown),
      requestPayload<any>("/api/v1/training_support_info_extraction", markdown),
      requestPayload<any>("/api/v1/contract_and_compliance_info_extraction", markdown),
      requestPayload<any>("/api/v1/after_sales_support_info_extraction", markdown),
      requestPayload<any>("/api/v1/key_spare_parts_info_extraction", markdown),
    ])

    const onsiteSla: OnsiteSlaItem[] = Array.isArray(onsiteRes.payload?.item_list)
      ? onsiteRes.payload.item_list.map((item: Record<string, unknown>) => ({
          serviceType: toNullableString(item.service_type),
          responseTimeHours: toNullableNumber(item.response_time_hours),
          onSiteTimeHours: toNullableNumber(item.on_site_time_hours),
          coverage: toNullableString(item.coverage),
          originalContractSnippet: toNullableString(item.original_contract_snippet),
          devices: extractDeviceList(item.devices_info),
        }))
      : []

    const yearlyMaintenance: YearlyMaintenanceItem[] = Array.isArray(yearlyRes.payload?.item_list)
      ? yearlyRes.payload.item_list.map((item: Record<string, unknown>) => ({
          serviceType: toNullableString(item.service_type),
          standardPmPerYear: toNullableNumber(item.standard_pm_per_year),
          smartPmPerYear: toNullableNumber(item.smart_pm_per_year),
          remotePmPerYear: toNullableNumber(item.remote_pm_per_year),
          scope: toStringArray(item.scope),
          deliverables: toNullableString(item.deliverables),
          scheduling: toNullableString(item.scheduling),
          originalContractSnippet: toNullableString(item.original_contract_snippet),
          devices: extractDeviceList(item.devices_info),
        }))
      : []

    const remoteMaintenance: RemoteMaintenanceItem[] = Array.isArray(remoteRes.payload?.item_list)
      ? remoteRes.payload.item_list.map((item: Record<string, unknown>) => ({
          serviceType: toNullableString(item.service_type),
          platform: toNullableString(item.platform),
          ctRemotePmPerYear: toNullableNumber(item.ct_remote_pm_per_year),
          mrRemotePmPerYear: toNullableNumber(item.mr_remote_pm_per_year),
          igsRemotePmPerYear: toNullableNumber(item.igs_remote_pm_per_year),
          drRemotePmPerYear: toNullableNumber(item.dr_remote_pm_per_year),
          mammoRemotePmPerYear: toNullableNumber(item.mammo_remote_pm_per_year),
          mobileDrRemotePmPerYear: toNullableNumber(item.mobile_dr_remote_pm_per_year),
          boneDensityRemotePmPerYear: toNullableNumber(item.bone_density_remote_pm_per_year),
          usRemotePmPerYear: toNullableNumber(item.us_remote_pm_per_year),
          otherRemotePmPerYear: toNullableNumber(item.other_remote_pm_per_year),
          prerequisitesMaxUsersPerDevice: toNullableNumber(item.prerequisites_max_users_per_device),
          reports: toStringArray(item.reports),
          originalContractSnippet: toNullableString(item.original_contract_snippet),
        }))
      : []

    const trainingSupports: TrainingSupportItem[] = Array.isArray(trainingRes.payload?.item_list)
      ? trainingRes.payload.item_list.map((item: Record<string, unknown>) => ({
          serviceType: toNullableString(item.service_type),
          trainingCategory: toNullableString(item.training_category),
          applicableDevices: toStringArray(item.applicable_devices),
          trainingTimes: toNullableNumber(item.training_times),
          trainingPeriod: toNullableString(item.training_period),
          trainingDays: toNullableNumber(item.training_days),
          trainingSeats: toNullableNumber(item.training_seats),
          trainingCost: toNullableString(item.training_cost),
          originalContractSnippet: toNullableString(item.original_contract_snippet),
        }))
      : []

    const contractCompliance: ContractComplianceItem | null =
      complianceRes.payload && typeof complianceRes.payload === "object"
        ? {
            informationConfidentialityRequirements: toNullableBoolean(
              (complianceRes.payload as Record<string, unknown>).information_confidentiality_requirements,
            ),
            liabilityOfBreach: toNullableString((complianceRes.payload as Record<string, unknown>).liability_of_breach),
            partsReturnRequirements: toNullableString(
              (complianceRes.payload as Record<string, unknown>).parts_return_requirements,
            ),
            deliveryRequirements: toNullableString(
              (complianceRes.payload as Record<string, unknown>).delivery_requirements,
            ),
            transportationInsurance: toNullableString(
              (complianceRes.payload as Record<string, unknown>).transportation_insurance,
            ),
            deliveryLocation: toNullableString((complianceRes.payload as Record<string, unknown>).delivery_location),
          }
        : null

    const afterSalesSupport: AfterSalesSupportItem | null =
      afterSalesRes.payload && typeof afterSalesRes.payload === "object"
        ? {
            guaranteeRunningRate: toNullableNumber((afterSalesRes.payload as Record<string, unknown>).guarantee_running_rate),
            guaranteeMechanism: toNullableString((afterSalesRes.payload as Record<string, unknown>).guarantee_mechanism),
            serviceReportForm: toNullableString((afterSalesRes.payload as Record<string, unknown>).service_report_form),
            remoteService: toNullableString((afterSalesRes.payload as Record<string, unknown>).remote_service),
            hotlineSupport: toNullableString((afterSalesRes.payload as Record<string, unknown>).hotline_support),
            taxFreePartsPriority: toNullableBoolean(
              (afterSalesRes.payload as Record<string, unknown>).tax_free_parts_priority,
            ),
          }
        : null

    const keySpareParts: KeySparePartItem[] = Array.isArray(keySparePartsRes.payload?.item_list)
      ? keySparePartsRes.payload.item_list.map((item: Record<string, unknown>) => ({
          serviceType: toNullableString(item.service_type),
          coveredItems: toStringArray(item.covered_items),
          replacementPolicy: toNullableString(item.replacement_policy),
          oldPartReturnRequired: toNullableBoolean(item.old_part_return_required),
          nonReturnPenaltyPct: toNullableNumber(item.non_return_penalty_pct),
          logisticsBy: toNullableString(item.logistics_by),
          leadTimeBusinessDays: toNullableNumber(item.lead_time_business_days),
          originalContractSnippet: toNullableString(item.original_contract_snippet),
          tubes: Array.isArray(item.tubes)
            ? item.tubes.map((tube: Record<string, unknown>) => ({
                deviceModel: toNullableString(tube.device_model),
                geHostSystemNumber: toNullableString(tube.ge_host_system_number),
                xrTubeId: toNullableString(tube.xr_tube_id),
                manufacturer: toNullableString(tube.manufacturer),
                registrationNumber: toNullableString(tube.registration_number),
                contractStartDate: toNullableString(tube.contract_start_date),
                contractEndDate: toNullableString(tube.contract_end_date),
                responseTime: toNullableNumber(tube.response_time),
              }))
            : [],
          coils: Array.isArray(item.coils)
            ? item.coils.map((coil: Record<string, unknown>) => ({
                geHostSystemNumber: toNullableString(coil.ge_host_system_number),
                coilOrderNumber: toNullableString(coil.coil_order_number),
                coilName: toNullableString(coil.coil_name),
                coilSerialNumber: toNullableString(coil.coil_serial_number),
              }))
            : [],
        }))
      : []

    const baseSnapshot: ServiceInfoSnapshotPayload = {
      onsiteSla,
      yearlyMaintenance,
      remoteMaintenance,
      trainingSupports,
      contractCompliance,
      afterSalesSupport,
      keySpareParts,
      servicePlanRecommendation: previousSnapshot?.servicePlanRecommendation ?? null,
    }

    let recommendation = baseSnapshot.servicePlanRecommendation
    let autoRecommendationTriggered = false

    if (shouldAutoRecommend(baseSnapshot)) {
      try {
        const clauses = buildClauseInputs(baseSnapshot)
        if (clauses.length) {
          const candidates = await fetchServicePlanCandidates()
          if (candidates.length) {
            recommendation = await requestServicePlanRecommendation(clauses, candidates)
            autoRecommendationTriggered = true
          }
        }
      } catch (recommendationError) {
        console.warn(`Auto service plan recommendation failed for contract ${contractId}`, recommendationError)
      }
    }

    const snapshot: ServiceInfoSnapshotPayload = {
      ...baseSnapshot,
      servicePlanRecommendation: recommendation,
    }

    const persisted = await prisma.contractServiceInfoSnapshot.upsert({
      where: { contractId },
      update: { payload: JSON.stringify(snapshot) },
      create: { contractId, payload: JSON.stringify(snapshot) },
    })

    await createProcessingLog({
      ...baseLog,
      status: "SUCCESS",
      description: "服务信息提取与入库完成",
      durationMs: Date.now() - startedAt,
      metadata: {
        urls: {
          onsiteSla: onsiteRes.url,
          yearlyMaintenance: yearlyRes.url,
          remoteMaintenance: remoteRes.url,
          trainingSupport: trainingRes.url,
          contractCompliance: complianceRes.url,
          afterSales: afterSalesRes.url,
          keySpareParts: keySparePartsRes.url,
        },
        counts: {
          onsiteSla: onsiteSla.length,
          yearlyMaintenance: yearlyMaintenance.length,
          remoteMaintenance: remoteMaintenance.length,
          trainingSupports: trainingSupports.length,
          keySparePartBlocks: keySpareParts.length,
        },
        servicePlanRecommendation: {
          autoTriggered: autoRecommendationTriggered,
          overallPlanId: recommendation?.overallPlanId ?? null,
          overallPlanName: recommendation?.overallPlanName ?? null,
        },
      },
    })

    return parseServiceInfoSnapshotPayload(persisted.payload)
  } catch (error) {
    await createProcessingLog({
      ...baseLog,
      status: "ERROR",
      description: "服务信息提取失败",
      durationMs: Date.now() - startedAt,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })

    if (suppressErrors) {
      return existingSnapshot
        ? parseServiceInfoSnapshotPayload(existingSnapshot.payload)
        : createEmptyServiceInfoSnapshot()
    }

    throw error instanceof Error ? error : new Error("服务信息提取失败")
  }
}

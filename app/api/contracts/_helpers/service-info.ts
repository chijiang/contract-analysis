import { prisma } from "@/lib/prisma"
import { buildBackendUrl } from "@/lib/backend-service"
import { createProcessingLog } from "@/lib/processing-logs"

export type DeviceInfoExtractionResult = {
  devices?: Array<{
    device_name?: unknown
    registration_number?: unknown
    device_model?: unknown
    ge_host_system_number?: unknown
    installation_date?: unknown
    service_start_date?: unknown
    service_end_date?: unknown
    maintenance_frequency?: unknown
    response_time?: unknown
    arrival_time?: unknown
  }>
}

export type MaintenanceServiceInfoExtractionResult = {
  maintenance_services?: Array<{
    maintenance_scope?: unknown
    included_parts?: unknown
    spare_parts_support?: unknown
    deep_maintenance?: unknown
  }>
}

export type DigitalSolutionInfoExtractionResult = {
  digital_solutions?: Array<{
    software_product_name?: unknown
    hardware_product_name?: unknown
    quantity?: unknown
    service_period?: unknown
  }>
}

export type TrainingSupportInfoExtractionResult = {
  training_supports?: Array<{
    training_category?: unknown
    applicable_devices?: unknown
    training_times?: unknown
    training_period?: unknown
    training_days?: unknown
    training_seats?: unknown
    training_cost?: unknown
  }>
}

export type ContractAndComplianceInfoExtractionResult = {
  information_confidentiality_requirements?: unknown
  liability_of_breach?: unknown
  parts_return_requirements?: unknown
  delivery_requirements?: unknown
  transportation_insurance?: unknown
  delivery_location?: unknown
}

export type AfterSalesSupportInfoModel = {
  guarantee_running_rate?: unknown
  guarantee_mechanism?: unknown
  service_report_form?: unknown
  remote_service?: unknown
  hotline_support?: unknown
  tax_free_parts_priority?: unknown
}

const toNullableString = (v: unknown) => {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t.length ? t : null
}

const toNullableNumber = (v: unknown) => {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, "").trim())
    return Number.isFinite(n) ? n : null
  }
  return null
}

const toNullableBoolean = (v: unknown) => {
  if (typeof v === "boolean") return v
  if (typeof v === "string") {
    const t = v.trim().toLowerCase()
    if (["true", "yes", "y", "1"].includes(t)) return true
    if (["false", "no", "n", "0"].includes(t)) return false
  }
  if (typeof v === "number") return v !== 0
  return null
}

type ExtractOptions = { suppressErrors?: boolean }

export async function extractAndPersistServiceInfo(contractId: string, markdown: string, options: ExtractOptions = {}) {
  const { suppressErrors = true } = options
  const startedAt = Date.now()
  const baseLog = { contractId, source: "AI" as const }

  if (!markdown || !markdown.trim()) {
    await createProcessingLog({
      ...baseLog,
      action: "SERVICE_INFO_EXTRACTION",
      description: "缺少Markdown内容，跳过服务信息提取",
      status: "SKIPPED",
      durationMs: Date.now() - startedAt,
    })
    return
  }

  // 1) 设备信息
  let deviceApiUrl: string
  try {
    deviceApiUrl = buildBackendUrl("/api/v1/device_info_extraction", process.env.SERVICE_INFO_API_BASE_URL)
  } catch (e) {
    deviceApiUrl = buildBackendUrl("/api/v1/device_info_extraction")
  }

  // 2) 保养服务
  let maintenanceApiUrl: string
  try {
    maintenanceApiUrl = buildBackendUrl("/api/v1/maintenance_service_info_extraction", process.env.SERVICE_INFO_API_BASE_URL)
  } catch (e) {
    maintenanceApiUrl = buildBackendUrl("/api/v1/maintenance_service_info_extraction")
  }

  // 3) 数字化解决方案
  let digitalApiUrl: string
  try {
    digitalApiUrl = buildBackendUrl("/api/v1/digital_solution_info_extraction", process.env.SERVICE_INFO_API_BASE_URL)
  } catch (e) {
    digitalApiUrl = buildBackendUrl("/api/v1/digital_solution_info_extraction")
  }

  // 4) 培训支持
  let trainingApiUrl: string
  try {
    trainingApiUrl = buildBackendUrl("/api/v1/training_support_info_extraction", process.env.SERVICE_INFO_API_BASE_URL)
  } catch (e) {
    trainingApiUrl = buildBackendUrl("/api/v1/training_support_info_extraction")
  }

  // 5) 合同与合规信息
  let complianceApiUrl: string
  try {
    complianceApiUrl = buildBackendUrl("/api/v1/contract_and_compliance_info_extraction", process.env.SERVICE_INFO_API_BASE_URL)
  } catch (e) {
    complianceApiUrl = buildBackendUrl("/api/v1/contract_and_compliance_info_extraction")
  }

  // 6) 售后支持信息
  let afterSalesApiUrl: string
  try {
    afterSalesApiUrl = buildBackendUrl("/api/v1/after_sales_support_info_extraction", process.env.SERVICE_INFO_API_BASE_URL)
  } catch (e) {
    afterSalesApiUrl = buildBackendUrl("/api/v1/after_sales_support_info_extraction")
  }

  try {
    const [deviceRes, maintenanceRes, digitalRes, trainingRes, complianceRes, afterSalesRes] = await Promise.all([
      fetch(deviceApiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: markdown }) }),
      fetch(maintenanceApiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: markdown }) }),
      fetch(digitalApiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: markdown }) }),
      fetch(trainingApiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: markdown }) }),
      fetch(complianceApiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: markdown }) }),
      fetch(afterSalesApiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: markdown }) }),
    ])

    if (!deviceRes.ok || !maintenanceRes.ok || !digitalRes.ok || !trainingRes.ok || !complianceRes.ok || !afterSalesRes.ok) {
      throw new Error(`服务调用失败: device=${deviceRes.status}, maintenance=${maintenanceRes.status}, digital=${digitalRes.status}, training=${trainingRes.status}, compliance=${complianceRes.status}, afterSales=${afterSalesRes.status}`)
    }

    const [devicePayload, maintenancePayload, digitalPayload, trainingPayload, compliancePayload, afterSalesPayload] = await Promise.all([
      deviceRes.json() as Promise<DeviceInfoExtractionResult>,
      maintenanceRes.json() as Promise<MaintenanceServiceInfoExtractionResult>,
      digitalRes.json() as Promise<DigitalSolutionInfoExtractionResult>,
      trainingRes.json() as Promise<TrainingSupportInfoExtractionResult>,
      complianceRes.json() as Promise<ContractAndComplianceInfoExtractionResult>,
      afterSalesRes.json() as Promise<AfterSalesSupportInfoModel>,
    ])

    // 落库前先清理旧数据（幂等）
    await prisma.$transaction([
      prisma.contractDeviceInfo.deleteMany({ where: { contractId } }),
      prisma.contractMaintenanceServiceInfo.deleteMany({ where: { contractId } }),
      prisma.contractDigitalSolutionInfo.deleteMany({ where: { contractId } }),
      prisma.contractTrainingSupportInfo.deleteMany({ where: { contractId } }),
    ])

    // 设备
    const devices = Array.isArray(devicePayload?.devices) ? devicePayload.devices : []
    if (devices.length) {
      await prisma.contractDeviceInfo.createMany({
        data: devices.map((d) => ({
          contractId,
          deviceName: toNullableString(d.device_name),
          registrationNumber: toNullableString(d.registration_number),
          deviceModel: toNullableString(d.device_model),
          geHostSystemNumber: toNullableString(d.ge_host_system_number),
          installationDate: toNullableString(d.installation_date),
          serviceStartDate: toNullableString(d.service_start_date),
          serviceEndDate: toNullableString(d.service_end_date),
          maintenanceFrequency: toNullableNumber(d.maintenance_frequency) as number | null,
          responseTime: toNullableNumber(d.response_time) as number | null,
          arrivalTime: toNullableNumber(d.arrival_time) as number | null,
        }))
      })
    }

    // 保养服务
    const maints = Array.isArray(maintenancePayload?.maintenance_services) ? maintenancePayload.maintenance_services : []
    if (maints.length) {
      await prisma.contractMaintenanceServiceInfo.createMany({
        data: maints.map((m) => ({
          contractId,
          maintenanceScope: toNullableString(m.maintenance_scope),
          includedPartsJson: JSON.stringify(Array.isArray(m.included_parts) ? m.included_parts : []),
          sparePartsSupport: toNullableString(m.spare_parts_support),
          deepMaintenance: toNullableBoolean(m.deep_maintenance) as boolean | null,
        }))
      })
    }

    // 数字化
    const digitals = Array.isArray(digitalPayload?.digital_solutions) ? digitalPayload.digital_solutions : []
    if (digitals.length) {
      await prisma.contractDigitalSolutionInfo.createMany({
        data: digitals.map((ds) => ({
          contractId,
          softwareProductName: toNullableString(ds.software_product_name),
          hardwareProductName: toNullableString(ds.hardware_product_name),
          quantity: toNullableNumber(ds.quantity) as number | null,
          servicePeriod: toNullableString(ds.service_period),
        }))
      })
    }

    // 培训
    const trainings = Array.isArray(trainingPayload?.training_supports) ? trainingPayload.training_supports : []
    if (trainings.length) {
      await prisma.contractTrainingSupportInfo.createMany({
        data: trainings.map((t) => ({
          contractId,
          trainingCategory: toNullableString(t.training_category),
          applicableDevicesJson: JSON.stringify(Array.isArray(t.applicable_devices) ? t.applicable_devices : []),
          trainingTimes: toNullableNumber(t.training_times) as number | null,
          trainingPeriod: toNullableString(t.training_period),
          trainingDays: toNullableNumber(t.training_days) as number | null,
          trainingSeats: toNullableNumber(t.training_seats) as number | null,
          trainingCost: toNullableString(t.training_cost),
        }))
      })
    }

    // 合同与合规（单条）
    if (compliancePayload && typeof compliancePayload === "object") {
      await prisma.contractComplianceInfo.upsert({
        where: { contractId },
        update: {
          informationConfidentialityRequirements: toNullableBoolean(compliancePayload.information_confidentiality_requirements) as boolean | null,
          liabilityOfBreach: toNullableString(compliancePayload.liability_of_breach),
          partsReturnRequirements: toNullableString(compliancePayload.parts_return_requirements),
          deliveryRequirements: toNullableString(compliancePayload.delivery_requirements),
          transportationInsurance: toNullableString(compliancePayload.transportation_insurance),
          deliveryLocation: toNullableString(compliancePayload.delivery_location),
        },
        create: {
          contractId,
          informationConfidentialityRequirements: toNullableBoolean(compliancePayload.information_confidentiality_requirements) as boolean | null,
          liabilityOfBreach: toNullableString(compliancePayload.liability_of_breach),
          partsReturnRequirements: toNullableString(compliancePayload.parts_return_requirements),
          deliveryRequirements: toNullableString(compliancePayload.delivery_requirements),
          transportationInsurance: toNullableString(compliancePayload.transportation_insurance),
          deliveryLocation: toNullableString(compliancePayload.delivery_location),
        },
      })
    }

    // 售后支持（单条）
    if (afterSalesPayload && typeof afterSalesPayload === "object") {
      await prisma.contractAfterSalesSupportInfo.upsert({
        where: { contractId },
        update: {
          guaranteeRunningRate: toNullableNumber(afterSalesPayload.guarantee_running_rate) as number | null,
          guaranteeMechanism: toNullableString(afterSalesPayload.guarantee_mechanism),
          serviceReportForm: toNullableString(afterSalesPayload.service_report_form),
          remoteService: toNullableString(afterSalesPayload.remote_service),
          hotlineSupport: toNullableString(afterSalesPayload.hotline_support),
          taxFreePartsPriority: toNullableBoolean(afterSalesPayload.tax_free_parts_priority) as boolean | null,
        },
        create: {
          contractId,
          guaranteeRunningRate: toNullableNumber(afterSalesPayload.guarantee_running_rate) as number | null,
          guaranteeMechanism: toNullableString(afterSalesPayload.guarantee_mechanism),
          serviceReportForm: toNullableString(afterSalesPayload.service_report_form),
          remoteService: toNullableString(afterSalesPayload.remote_service),
          hotlineSupport: toNullableString(afterSalesPayload.hotline_support),
          taxFreePartsPriority: toNullableBoolean(afterSalesPayload.tax_free_parts_priority) as boolean | null,
        },
      })
    }

    await createProcessingLog({
      ...baseLog,
      action: "SERVICE_INFO_EXTRACTION",
      description: "服务信息提取与入库完成",
      status: "SUCCESS",
      durationMs: Date.now() - startedAt,
      metadata: {
        deviceApiUrl,
        maintenanceApiUrl,
        digitalApiUrl,
        trainingApiUrl,
        complianceApiUrl,
        afterSalesApiUrl,
        counts: {
          devices: devices.length,
          maintenances: maints.length,
          digitals: digitals.length,
          trainings: trainings.length,
        },
      },
    })
  } catch (error) {
    await createProcessingLog({
      ...baseLog,
      action: "SERVICE_INFO_EXTRACTION",
      description: "服务信息提取失败",
      status: "ERROR",
      durationMs: Date.now() - startedAt,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    if (!suppressErrors) {
      throw error instanceof Error ? error : new Error("服务信息提取失败")
    }
  }
}



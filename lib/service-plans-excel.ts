import * as XLSX from "xlsx"

import {
  servicePlanPayloadSchema,
  type SerializedServicePlan,
  type ServicePlanPayload,
} from "@/lib/service-plans"

export type ServicePlanExcelEntry = {
  id: string | null
  payload: ServicePlanPayload
}

export type ServicePlanExcelParseResult = {
  entries: ServicePlanExcelEntry[]
  errors: string[]
}

const HEADERS = [
  "id",
  "name",
  "termMonths",
  "sites",
  "modalities",
  "metadata",
  "modules",
] as const

type HeaderKey = (typeof HEADERS)[number]

type RawRow = Partial<Record<HeaderKey, unknown>>

const stringify = (value: unknown) =>
  value === undefined || value === null || value === "" ? "" : JSON.stringify(value, null, 2)

const parseOptionalJson = (value: unknown) => {
  if (value === undefined || value === null) return undefined
  const text = typeof value === "string" ? value.trim() : String(value)
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`JSON 解析失败: ${text}`)
  }
}

const parseOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined
  const num = typeof value === "number" ? value : Number(String(value))
  if (Number.isNaN(num)) {
    throw new Error(`无法解析数字：${value}`)
  }
  return num
}

export const servicePlansToWorkbook = (plans: SerializedServicePlan[]): Buffer => {
  const rows = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    termMonths: plan.termMonths ?? "",
    sites: stringify(plan.sites.length ? plan.sites : undefined),
    modalities: stringify(plan.modalities.length ? plan.modalities : undefined),
    metadata: stringify(plan.metadata),
    modules: stringify(
      plan.modules.map((module) => ({
        templateId: module.templateId,
        templateName: module.templateName,
        type: module.type,
        status: module.status ?? module.templateStatus,
        isDefault: module.isDefault,
        overrides: module.overrides,
        orderIndex: module.orderIndex,
      })),
    ),
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: HEADERS as unknown as string[] })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "ServicePlans")
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
}

const normalizeRow = (row: Record<string, unknown>): RawRow => {
  const normalized: RawRow = {}
  for (const key of Object.keys(row)) {
    const lower = key.trim().toLowerCase()
    const target = HEADERS.find((header) => header.toLowerCase() === lower)
    if (target) {
      normalized[target] = row[key]
    }
  }
  return normalized
}

export const parseServicePlanWorkbook = (buffer: ArrayBuffer): ServicePlanExcelParseResult => {
  const data = new Uint8Array(buffer)
  const workbook = XLSX.read(data, { type: "array" })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    return { entries: [], errors: ["Excel 中未找到任何工作表"] }
  }

  const sheet = workbook.Sheets[firstSheetName]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })

  const entries: ServicePlanExcelEntry[] = []
  const errors: string[] = []

  rawRows.forEach((row, index) => {
    const normalized = normalizeRow(row)
    const rowNumber = index + 2

    const payload: Partial<ServicePlanPayload> = {}

    const name = typeof normalized.name === "string" ? normalized.name.trim() : String(normalized.name ?? "")
    if (!name) {
      errors.push(`第 ${rowNumber} 行缺少 name 字段，已跳过`)
      return
    }
    payload.name = name

    try {
      const term = parseOptionalNumber(normalized.termMonths)
      if (term !== undefined) {
        payload.termMonths = term
      }

      const sites = parseOptionalJson(normalized.sites)
      if (Array.isArray(sites)) {
        payload.sites = sites.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      }

      const modalities = parseOptionalJson(normalized.modalities)
      if (Array.isArray(modalities)) {
        payload.modalities = modalities.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      }

      const metadata = parseOptionalJson(normalized.metadata)
      if (metadata !== undefined) {
        payload.metadata = metadata
      }

      const modules = parseOptionalJson(normalized.modules)
      if (Array.isArray(modules)) {
        const selections = modules
          .map((module) => {
            if (!module || typeof module !== "object") return null
            const record = module as Record<string, unknown>
            const templateId = typeof record.templateId === "string" ? record.templateId.trim() : ""
            if (!templateId) return null
            return {
              templateId,
              isDefault: Boolean(record.isDefault),
              status: typeof record.status === "string" ? record.status : undefined,
              overrides: record.overrides,
              orderIndex:
                typeof record.orderIndex === "number"
                  ? record.orderIndex
                  : Number.isFinite(Number(record.orderIndex))
                    ? Number(record.orderIndex)
                    : undefined,
            }
          })
          .filter((item): item is Record<string, unknown> => item !== null)

        payload.modules = selections as ServicePlanPayload["modules"]
      }

      const parsedPayload = servicePlanPayloadSchema.parse(payload)
      entries.push({ id: typeof normalized.id === "string" && normalized.id.trim() ? normalized.id.trim() : null, payload: parsedPayload })
    } catch (error) {
      errors.push(
        error instanceof Error
          ? `第 ${rowNumber} 行解析失败：${error.message}`
          : `第 ${rowNumber} 行解析失败`,
      )
    }
  })

  return { entries, errors }
}

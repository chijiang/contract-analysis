import * as XLSX from "xlsx"

import { servicePlanClausePayloadSchema, servicePlanPayloadSchema, type SerializedServicePlan, type ServicePlanClausePayload, type ServicePlanPayload } from "@/lib/service-plans"

export type ServicePlanExcelEntry = {
  id: string | null
  payload: ServicePlanPayload
}

export type ServicePlanExcelParseResult = {
  entries: ServicePlanExcelEntry[]
  errors: string[]
}

const HEADERS = ["id", "name", "description", "clauses"] as const

type HeaderKey = (typeof HEADERS)[number]
type RawRow = Partial<Record<HeaderKey, unknown>>

const stringify = (value: unknown) =>
  value === undefined || value === null || value === "" ? "" : JSON.stringify(value, null, 2)

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

const parseClauses = (value: unknown): ServicePlanClausePayload[] => {
  if (value === undefined || value === null || value === "") {
    return []
  }
  const text = typeof value === "string" ? value.trim() : String(value)
  if (!text) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new Error("条款字段不是合法的 JSON")
  }

  if (!Array.isArray(parsed)) {
    throw new Error("条款字段必须是数组")
  }
  return parsed.map((item, index) => {
    const result = servicePlanClausePayloadSchema.safeParse(item)
    if (!result.success) {
      const issue = result.error.issues[0]
      const message = issue ? `${issue.path.join(".")}: ${issue.message}` : "条款结构不完整"
      throw new Error(`第 ${index + 1} 条条款校验失败：${message}`)
    }
    return result.data
  })
}

export const servicePlansToWorkbook = (plans: SerializedServicePlan[]): Buffer => {
  const rows = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description ?? "",
    clauses: stringify(
      plan.clauses.map((clause) => ({
        category: clause.category,
        clauseItem: clause.clauseItem,
        requirement: clause.requirement,
        notes: clause.notes,
        orderIndex: clause.orderIndex,
      })),
    ),
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: HEADERS as unknown as string[] })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "ServicePlans")
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
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

    if (typeof normalized.description === "string") {
      payload.description = normalized.description.trim() || undefined
    }

    try {
      const clauses = parseClauses(normalized.clauses)
      payload.clauses = clauses
    } catch (error) {
      errors.push(`第 ${rowNumber} 行条款解析失败：${error instanceof Error ? error.message : String(error)}`)
      return
    }

    const validation = servicePlanPayloadSchema.safeParse(payload)
    if (!validation.success) {
      const issue = validation.error.issues[0]
      const message = issue ? `${issue.path.join(".")}: ${issue.message}` : "结构校验失败"
      errors.push(`第 ${rowNumber} 行校验失败：${message}`)
      return
    }

    entries.push({
      id: typeof normalized.id === "string" && normalized.id.trim().length > 0 ? normalized.id.trim() : null,
      payload: validation.data,
    })
  })

  return { entries, errors }
}

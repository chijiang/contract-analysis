import * as XLSX from "xlsx"

export type StandardClauseRow = {
  category: string
  clauseItem: string
  standard: string
  riskLevel?: string
}

const CATEGORY_KEYS = ["category", "类别", "条款所属类别"]
const CLAUSE_ITEM_KEYS = ["clauseItem", "具体条款项", "条款项"]
const STANDARD_KEYS = ["standard", "标准约定", "标准"]
const RISK_LEVEL_KEYS = ["riskLevel", "风险等级", "风险分类", "风险等级说明", "风险等级标准"]

const normalizeHeader = (header: string | number) =>
  typeof header === "string" ? header.trim() : String(header)

const pickFirstAvailable = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const target = Object.keys(row).find((rk) => rk.trim().toLowerCase() === key.toLowerCase())
    if (target) {
      const value = row[target]
      if (typeof value === "string") return value.trim()
      if (value != null) return String(value).trim()
    }
  }
  return ""
}

export function parseStandardClausesWorkbook(buffer: ArrayBuffer): StandardClauseRow[] {
  const data = new Uint8Array(buffer)
  const workbook = XLSX.read(data, { type: "array" })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return []

  const sheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })

  return rows
    .map((row) => {
      const normalizedRow: Record<string, unknown> = {}
      for (const key of Object.keys(row)) {
        normalizedRow[normalizeHeader(key)] = row[key]
      }

      const category = pickFirstAvailable(normalizedRow, CATEGORY_KEYS)
      const clauseItem = pickFirstAvailable(normalizedRow, CLAUSE_ITEM_KEYS)
      const standard = pickFirstAvailable(normalizedRow, STANDARD_KEYS)
      const riskLevel = pickFirstAvailable(normalizedRow, RISK_LEVEL_KEYS)

      return { category, clauseItem, standard, riskLevel: riskLevel || undefined }
    })
    .filter((row) => row.category && row.clauseItem && row.standard)
}

export function standardClausesToWorkbook(clauses: StandardClauseRow[]): Buffer {
  const worksheetData = [
    ["条款所属类别", "具体条款项", "标准约定", "风险等级说明"],
    ...clauses.map((clause) => [
      clause.category,
      clause.clauseItem,
      clause.standard,
      clause.riskLevel ?? "",
    ]),
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "StandardClauses")

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
}

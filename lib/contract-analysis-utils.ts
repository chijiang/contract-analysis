import type {
  AnalyzedClause,
  NonStandardDetectionResult,
  StoredResultPayload,
} from "@/app/types/contract-analysis"

export const normalizeDetectionResult = (payload: unknown): NonStandardDetectionResult => {
  const containerCandidate =
    payload && typeof payload === "object" && "result" in payload
      ? (payload as { result?: unknown }).result
      : payload

  const resultContainer =
    containerCandidate && typeof containerCandidate === "object" ? containerCandidate : null

  const extractedClausesRaw = Array.isArray(
    resultContainer && typeof resultContainer === "object"
      ? (resultContainer as { extracted_clauses?: unknown }).extracted_clauses
      : null,
  )
    ? ((resultContainer as { extracted_clauses?: unknown }).extracted_clauses as Array<Record<string, unknown>>)
    : []

  const extractedClauses: AnalyzedClause[] = extractedClausesRaw.map((clauseRecord) => {
    const categoryValue = clauseRecord?.["clause_category"]
    const clauseCategory = typeof categoryValue === "string" && categoryValue.trim() ? categoryValue : "未分类"

    const clauseItemValue = clauseRecord?.["clause_item"]
    const clauseItem = typeof clauseItemValue === "string" && clauseItemValue.trim() ? clauseItemValue : "未命名条款"

    const contractTextValue = clauseRecord?.["contract_snippet"]
    const contractText = typeof contractTextValue === "string" ? contractTextValue : ""

    const standardReferenceValue = clauseRecord?.["standard_reference"]
    const standardReference = standardReferenceValue && typeof standardReferenceValue === "object"
      ? (() => {
        const referenceRecord = standardReferenceValue as Record<string, unknown>
        const standardTextValue = referenceRecord["standard_text"]
        const referenceCategoryValue = referenceRecord["clause_category"]
        const referenceItemValue = referenceRecord["clause_item"]

        return {
          standard_text: typeof standardTextValue === "string" ? standardTextValue : "",
          clause_category: typeof referenceCategoryValue === "string" ? referenceCategoryValue : clauseCategory,
          clause_item: typeof referenceItemValue === "string" ? referenceItemValue : clauseItem,
        }
      })()
      : null

    const riskValue = clauseRecord?.["risk"]
    const risk = riskValue && typeof riskValue === "object"
      ? (() => {
        const riskRecord = riskValue as Record<string, unknown>
        const levelValue = riskRecord["level"]
        const opinionValue = riskRecord["opinion"]
        const recommendationValue = riskRecord["recommendation"]

        return {
          level: typeof levelValue === "string" ? levelValue : "",
          opinion: typeof opinionValue === "string" ? opinionValue : undefined,
          recommendation: typeof recommendationValue === "string" ? recommendationValue : undefined,
        }
      })()
      : null

    const complianceValue = clauseRecord?.["compliance"]
    const compliance = typeof complianceValue === "string" ? complianceValue : null

    return {
      clauseCategory,
      clauseItem,
      contractText,
      standardReference,
      compliance,
      risk,
    }
  })

  return {
    extractedClauses,
  }
}

export const normalizeResultsByTemplate = (
  payload: StoredResultPayload | null,
  templateIds: string[],
): Record<string, NonStandardDetectionResult> => {
  const normalized: Record<string, NonStandardDetectionResult> = {}
  const fallbackTemplateId = templateIds[0]

  if (!payload) {
    return normalized
  }

  const results = payload.resultsByTemplate
  if (!results || typeof results !== "object") {
    if (fallbackTemplateId) {
      normalized[fallbackTemplateId] = normalizeDetectionResult(payload as unknown)
    }
    return normalized
  }

  for (const [templateId, rawResult] of Object.entries(results)) {
    if (templateId === "default" && fallbackTemplateId) {
      normalized[fallbackTemplateId] = normalizeDetectionResult(rawResult)
    } else {
      normalized[templateId] = normalizeDetectionResult(rawResult)
    }
  }

  return normalized
}

export const pickFirstClauseRef = (
  results: Record<string, NonStandardDetectionResult>,
  templateOrder: string[],
): { templateId: string; index: number } | null => {
  const orderedTemplates = templateOrder.length > 0 ? templateOrder : Object.keys(results)
  for (const templateId of orderedTemplates) {
    const clauses = results[templateId]?.extractedClauses
    if (clauses && clauses.length > 0) {
      return { templateId, index: 0 }
    }
  }
  return null
}

export const groupClausesByTemplate = (
  analysisResultsByTemplate: Record<string, NonStandardDetectionResult>,
) => {
  const result: Record<string, Record<string, { clause: AnalyzedClause; index: number }[]>> = {}

  Object.entries(analysisResultsByTemplate).forEach(([templateId, detection]) => {
    const groups: Record<string, { clause: AnalyzedClause; index: number }[]> = {}

    detection.extractedClauses.forEach((clause, index) => {
      const category = clause.clauseCategory || "未分类"
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push({ clause, index })
    })

    result[templateId] = groups
  })

  return result
}

export const parseSelectedTemplateIds = (raw: unknown): string[] => {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((value): value is string => typeof value === "string" && value.length > 0)
      }
    } catch (error) {
      console.warn("解析模板 ID 列表失败", error)
    }
  }

  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === "string" && value.length > 0)
  }

  return []
}

export const safeParseJson = <T>(raw: string | null | undefined): T | null => {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return null
  }
  try {
    return JSON.parse(raw) as T
  } catch (error) {
    console.warn("解析 JSON 失败", error)
    return null
  }
}


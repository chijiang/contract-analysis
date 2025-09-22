export type ContractTemplate = {
    id: string
    name: string
    slug: string
    description: string | null
    createdAt: string
    updatedAt: string
}

type ClauseStandardReference = {
    standard_text: string
    clause_category: string
    clause_item: string
} | null

export type ClauseRisk = {
    level: string
    opinion?: string
    recommendation?: string
}

export type AnalyzedClause = {
    clauseCategory: string
    clauseItem: string
    contractText: string
    standardReference: ClauseStandardReference
    compliance: string | null
    risk: ClauseRisk | null
}

export type CommonStatus = "idle" | "loading" | "success" | "error"
export type SaveStatus = "idle" | "saving" | "success" | "error"
export type NonStandardDetectionResult = {
    extractedClauses: AnalyzedClause[]
}

export type StoredResultPayload = {
    version?: number
    resultsByTemplate?: Record<string, unknown>
}

type StoredClausesPayload = {
    version?: number
    clausesByTemplate?: Record<string, unknown>
}

export type StoredAnalysisRecord = {
    id: string
    contractId: string
    result: StoredResultPayload | null
    standardClauses: StoredClausesPayload | null
    selectedTemplateIds: string[] | null
    createdAt: string
    updatedAt: string
}


export type CategorizedClause = {
    clause: AnalyzedClause
    index: number
}
export type CachedReviewState = {
    version: number
    timestamp: string
    contractRecord: ContractRecord | null
    markdownContent: string
    markdownStatus: CommonStatus
    markdownError: string | null
    previewMode: "pdf" | "markdown"
    saveStatus: SaveStatus
    saveError: string | null
    analysisStatus: CommonStatus
    analysisError: string | null
    analysisResultsByTemplate: Record<string, NonStandardDetectionResult>
    analysisRecord: StoredAnalysisRecord | null
    analysisSource: "fresh" | "cache" | null
    selectedClauseRef: { templateId: string; index: number } | null
    selectedTemplateIds: string[]
    cachedFileName: string | null
}

type ContractBasicInfoRecord = {
    id: string
    contractId: string
    contractNumber: string | null
    contractName: string | null
    partyA: string | null
    partyB: string | null
    contractStartDate: string | null
    contractEndDate: string | null
    contractTotalAmount: number | null
    contractPaymentMethod: string | null
    contractCurrency: string | null
    createdAt: string
    updatedAt: string
}

export type ContractRecord = {
    id: string
    originalFileName: string
    mimeType: string
    fileSize: number
    storageProvider: "LOCAL" | "S3"
    filePath: string
    s3Key: string | null
    markdown: string
    convertedAt: string
    createdAt: string
    updatedAt: string
    basicInfo: ContractBasicInfoRecord | null
}
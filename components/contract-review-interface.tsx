"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DuplicateContractDialog } from "@/components/duplicate-contract-dialog"
import { MarkdownViewerRef } from "@/components/markdown-viewer"
import { ContractAnalysisPanel } from "@/components/contract-analysis-panel"
import { ContractClausesList } from "@/components/contract-clauses-list"
import { ContractContentPreview } from "./contract-content-preview"
import { ContractUploadPanel } from "./contract-upload-panel"
import { ContractAnalysisDialog } from "./contract-analysis-dialog"
import { CachedReviewState, ContractRecord, NonStandardDetectionResult, CategorizedClause, ContractTemplate, AnalyzedClause, StoredAnalysisRecord, StoredResultPayload } from "@/app/types/contract-analysis"


type AnalyzeContractResponse = {
  source: "fresh" | "cache"
  analysis: StoredAnalysisRecord
}

const STORAGE_KEY = "contract-review-interface-cache"
const STORAGE_VERSION = 1

const normalizeDetectionResult = (payload: unknown): NonStandardDetectionResult => {
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
    extractedClauses
  }
}

const normalizeResultsByTemplate = (
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

const pickFirstClauseRef = (
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

export function ContractReviewInterface() {
  const markdownViewerRef = useRef<MarkdownViewerRef>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewMode, setPreviewMode] = useState<"pdf" | "markdown">("pdf")
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [markdownContent, setMarkdownContent] = useState<string>("")
  const [markdownStatus, setMarkdownStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [markdownError, setMarkdownError] = useState<string | null>(null)
  const [contractRecord, setContractRecord] = useState<ContractRecord | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [templatesStatus, setTemplatesStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [pendingTemplateSelection, setPendingTemplateSelection] = useState<string[]>([])
  const [pendingAnalysisAction, setPendingAnalysisAction] = useState<"analyze" | "reprocess" | null>(null)
  const [templateDialogError, setTemplateDialogError] = useState<string | null>(null)
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [analysisResultsByTemplate, setAnalysisResultsByTemplate] = useState<Record<string, NonStandardDetectionResult>>({})
  const [analysisRecord, setAnalysisRecord] = useState<StoredAnalysisRecord | null>(null)
  const [analysisSource, setAnalysisSource] = useState<"fresh" | "cache" | null>(null)
  const [selectedClauseRef, setSelectedClauseRef] = useState<{ templateId: string; index: number } | null>(null)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [existingContract, setExistingContract] = useState<{
    id: string
    originalFileName: string
    createdAt: string
    markdown: string
    hasAnalysis: boolean
  } | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [fileHash, setFileHash] = useState<string | null>(null)
  const [shouldConvertMarkdown, setShouldConvertMarkdown] = useState(false)
  const [cachedFileName, setCachedFileName] = useState<string | null>(null)
  const [hasLoadedFromCache, setHasLoadedFromCache] = useState(false)
  const hasRestoredFromCache = useRef(false)

  const encodedFileUrl = useMemo(() => {
    if (!contractRecord) return null
    const encodedSegments = contractRecord.filePath
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
    return `/api/files/${encodedSegments.join("/")}`
  }, [contractRecord])

  useEffect(() => {
    if (hasRestoredFromCache.current) {
      setHasLoadedFromCache(true)
      return
    }

    if (typeof window === "undefined") {
      setHasLoadedFromCache(true)
      return
    }

    hasRestoredFromCache.current = true

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw) as CachedReviewState | null

      if (!parsed || parsed.version !== STORAGE_VERSION) {
        window.localStorage.removeItem(STORAGE_KEY)
        return
      }

      const results = parsed.analysisResultsByTemplate ?? {}
      const restoredTemplateIds = Array.isArray(parsed.selectedTemplateIds)
        ? parsed.selectedTemplateIds.filter((value: string) => typeof value === "string" && value.length > 0)
        : []

      const restoredContract = parsed.contractRecord
      setContractRecord(
        restoredContract
          ? { ...restoredContract, basicInfo: restoredContract.basicInfo ?? null }
          : null,
      )
      const restoredMarkdown = typeof parsed.markdownContent === "string" ? parsed.markdownContent : ""
      setMarkdownContent(restoredMarkdown)
      setMarkdownStatus(parsed.markdownStatus ?? (restoredMarkdown ? "success" : "idle"))
      setMarkdownError(parsed.markdownError ?? null)
      setPreviewMode(parsed.previewMode === "markdown" ? "markdown" : "pdf")
      setSaveStatus(parsed.saveStatus ?? (parsed.contractRecord ? "success" : "idle"))
      setSaveError(parsed.saveError ?? null)

      const hasResults = Object.keys(results).length > 0
      setAnalysisResultsByTemplate(results)
      setAnalysisRecord(parsed.analysisRecord ?? null)
      setAnalysisSource(parsed.analysisSource ?? (hasResults ? "cache" : null))
      setAnalysisStatus(hasResults ? "success" : parsed.analysisStatus ?? "idle")
      setAnalysisError(parsed.analysisError ?? null)
      setSelectedTemplateIds(restoredTemplateIds)

      const clauseRefCandidate = parsed.selectedClauseRef
      const validatedClauseRef =
        clauseRefCandidate &&
          typeof clauseRefCandidate.templateId === "string" &&
          typeof clauseRefCandidate.index === "number" &&
          clauseRefCandidate.index >= 0 &&
          results[clauseRefCandidate.templateId]?.extractedClauses?.[clauseRefCandidate.index]
          ? clauseRefCandidate
          : pickFirstClauseRef(results, restoredTemplateIds)

      setSelectedClauseRef(validatedClauseRef ?? null)

      setCachedFileName(parsed.cachedFileName ?? parsed.contractRecord?.originalFileName ?? null)
    } catch (error) {
      console.warn("恢复合同审核缓存失败:", error)
      window.localStorage.removeItem(STORAGE_KEY)
    } finally {
      setHasLoadedFromCache(true)
    }
  }, [])

  const loadTemplates = useCallback(async () => {
    setTemplatesStatus("loading")
    setTemplatesError(null)
    try {
      const response = await fetch("/api/contract-templates")
      if (!response.ok) {
        throw new Error(`加载模板失败，状态码 ${response.status}`)
      }
      const data = (await response.json()) as ContractTemplate[]
      setTemplates(data)
      setTemplatesStatus("success")
      if (data.length === 0) {
        setSelectedTemplateIds([])
      } else {
        setSelectedTemplateIds((prev) => {
          const valid = prev.filter((id) => data.some((template) => template.id === id))
          if (valid.length > 0) return valid
          return data.map((template) => template.id)
        })
      }
    } catch (error) {
      setTemplatesStatus("error")
      setTemplatesError(error instanceof Error ? error.message : "加载产品合同模板失败")
    }
  }, [])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    setPreviewMode("pdf")
    setShouldConvertMarkdown(false)
    setFileHash(null)
    setPendingFile(null)
    setCachedFileName(file.name)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/contracts/check-duplicate", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        if (result.isDuplicate) {
          setExistingContract(result.existingContract)
          setPendingFile(file)
          setDuplicateDialogOpen(true)
          setFileHash(null)
          return
        }

        if (typeof result.fileHash === "string") {
          setFileHash(result.fileHash)
        }
      }
    } catch (error) {
      console.error("检查重复文件失败:", error)
      // 如果检查失败，保持默认流程
    }

    setShouldConvertMarkdown(true)
  }

  useEffect(() => {
    loadTemplates().catch(() => {
      setTemplatesStatus("error")
      setTemplatesError("加载产品合同模板失败")
    })
  }, [loadTemplates])

  useEffect(() => {
    if (uploadedFile) {
      return
    }

    if (!encodedFileUrl) {
      setPdfPreviewUrl(null)
      return
    }

    setPdfPreviewUrl(encodedFileUrl)
  }, [uploadedFile, encodedFileUrl])

  useEffect(() => {
    if (!hasLoadedFromCache) {
      return
    }
    if (typeof window === "undefined") {
      return
    }

    const hasPersistableData =
      Boolean(contractRecord) ||
      Boolean(markdownContent) ||
      Object.keys(analysisResultsByTemplate).length > 0 ||
      Boolean(cachedFileName)

    if (!hasPersistableData) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }

    const payload: CachedReviewState = {
      version: STORAGE_VERSION,
      timestamp: new Date().toISOString(),
      contractRecord,
      markdownContent,
      markdownStatus,
      markdownError,
      previewMode,
      saveStatus,
      saveError,
      analysisStatus,
      analysisError,
      analysisResultsByTemplate,
      analysisRecord,
      analysisSource,
      selectedClauseRef,
      selectedTemplateIds,
      cachedFileName,
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
      console.warn("保存合同审核缓存失败:", error)
    }
  }, [
    hasLoadedFromCache,
    contractRecord,
    markdownContent,
    markdownStatus,
    markdownError,
    previewMode,
    saveStatus,
    saveError,
    analysisStatus,
    analysisError,
    analysisResultsByTemplate,
    analysisRecord,
    analysisSource,
    selectedClauseRef,
    selectedTemplateIds,
    cachedFileName,
  ])

  const persistContract = useCallback(
    async (file: File, markdown: string) => {
      try {
        setSaveStatus("saving")
        setSaveError(null)

        const formData = new FormData()
        formData.append("file", file)
        formData.append("markdown", markdown)
        formData.append("originalName", file.name)
        // 如果已经计算过hash，传递给后端避免重复计算
        if (fileHash) {
          formData.append("fileHash", fileHash)
        }

        const response = await fetch("/api/contracts", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.message ?? "保存合同时发生错误")
        }

        const contract = (await response.json()) as ContractRecord
        setContractRecord({ ...contract, basicInfo: contract.basicInfo ?? null })
        setCachedFileName(contract.originalFileName)
        setSaveStatus("success")
      } catch (error) {
        setSaveStatus("error")
        setSaveError(error instanceof Error ? error.message : "保存合同时发生错误")
      }
    },
    [fileHash],
  )

  const handleUseExistingContract = useCallback(async () => {
    if (!existingContract) return

    try {
      // 直接使用数据库中的markdown内容，无需调用转换API
      setMarkdownContent(existingContract.markdown)
      setMarkdownStatus("success")
      setShouldConvertMarkdown(false)
      setCachedFileName(existingContract.originalFileName)

      // 获取完整的合同记录
      const response = await fetch(`/api/contracts`)
      if (response.ok) {
        const contracts = await response.json()
        const fullContract = contracts.find((c: any) => c.id === existingContract.id)

        if (fullContract) {
          setContractRecord({ ...fullContract, basicInfo: fullContract.basicInfo ?? null })
          setSaveStatus("success")
        }
      }

      // 如果存在分析结果，尝试加载
      if (existingContract.hasAnalysis) {
        // 直接调用分析加载逻辑
        try {
          setAnalysisStatus("loading")
          setAnalysisError(null)

          const analysisResponse = await fetch(`/api/contracts/${existingContract.id}/analysis`)
          if (analysisResponse.ok) {
            const data = await analysisResponse.json()
            if (data?.analysis) {
              const selectedIds = Array.isArray(data.analysis.selectedTemplateIds)
                ? data.analysis.selectedTemplateIds.filter((value: unknown) =>
                  typeof value === "string" && value.length > 0,
                )
                : []
              const normalizedMap = normalizeResultsByTemplate(
                data.analysis.result,
                selectedIds,
              )
              setAnalysisResultsByTemplate(normalizedMap)
              setAnalysisRecord(data.analysis)
              setAnalysisSource(data.source ?? "cache")
              setAnalysisStatus("success")
              setSelectedTemplateIds(selectedIds)
              setSelectedClauseRef(pickFirstClauseRef(normalizedMap, selectedIds))
            }
          }
        } catch (error) {
          setAnalysisStatus("error")
          setAnalysisError("加载分析结果失败")
        }
      }

      // 关闭对话框并清理状态
      setDuplicateDialogOpen(false)
      setExistingContract(null)
      setPendingFile(null)
      setShouldConvertMarkdown(false)
    } catch (error) {
      console.error("使用现有合同失败:", error)
      // 如果出错，关闭对话框但显示错误
      setDuplicateDialogOpen(false)
      setMarkdownStatus("error")
      setMarkdownError("加载现有合同失败")
    }
  }, [existingContract])

  const handleCreateNewContract = useCallback(() => {
    if (!pendingFile) return

    // 关闭对话框并清理状态
    setDuplicateDialogOpen(false)
    setExistingContract(null)
    setPendingFile(null)
    setFileHash(null)
    setShouldConvertMarkdown(true)

    // 继续正常的markdown转换流程
    // 这里不需要做其他事情，因为convertPdfToMarkdown会在useEffect中被调用
  }, [pendingFile])

  const handleStartNewAnalysis = useCallback(() => {
    setUploadedFile(null)
    setPreviewMode("pdf")
    setPdfPreviewUrl(null)
    setMarkdownContent("")
    setMarkdownStatus("idle")
    setMarkdownError(null)
    setContractRecord(null)
    setSaveStatus("idle")
    setSaveError(null)
    setAnalysisStatus("idle")
    setAnalysisError(null)
    setAnalysisResultsByTemplate({})
    setAnalysisRecord(null)
    setAnalysisSource(null)
    setSelectedClauseRef(null)
    setCachedFileName(null)
    setExistingContract(null)
    setPendingFile(null)
    setPendingAnalysisAction(null)
    setTemplateDialogOpen(false)
    setTemplateDialogError(null)
    setPendingTemplateSelection([])
    setFileHash(null)
    setShouldConvertMarkdown(false)

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const convertPdfToMarkdown = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setMarkdownStatus("error")
        setMarkdownError("仅支持PDF文件转换为Markdown")
        return
      }

      try {
        setMarkdownStatus("loading")
        setMarkdownError(null)
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/pdf-to-markdown", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`转换失败，状态码 ${response.status}`)
        }

        const data = await response.json()
        const markdown = data?.markdown

        if (typeof markdown !== "string" || markdown.length === 0) {
          throw new Error("接口未返回有效的Markdown内容")
        }

        setMarkdownContent(markdown)
        setMarkdownStatus("success")
        await persistContract(file, markdown)
        setShouldConvertMarkdown(false)
      } catch (error) {
        setMarkdownStatus("error")
        setMarkdownError(error instanceof Error ? error.message : "转换失败，请稍后重试")
        setShouldConvertMarkdown(false)
      }
    },
    [persistContract],
  )

  useEffect(() => {
    if (!uploadedFile) {
      return
    }

    const objectUrl = URL.createObjectURL(uploadedFile)
    setPdfPreviewUrl(objectUrl)
    setMarkdownContent("")
    setMarkdownStatus("idle")
    setMarkdownError(null)
    setContractRecord(null)
    setSaveStatus("idle")
    setSaveError(null)
    setAnalysisStatus("idle")
    setAnalysisError(null)
    setAnalysisResultsByTemplate({})
    setAnalysisRecord(null)
    setAnalysisSource(null)
    setSelectedClauseRef(null)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [uploadedFile])

  useEffect(() => {
    if (!uploadedFile || !shouldConvertMarkdown) {
      return
    }

    void convertPdfToMarkdown(uploadedFile)
  }, [convertPdfToMarkdown, shouldConvertMarkdown, uploadedFile])

  useEffect(() => {
    if (markdownStatus !== "success" || !markdownContent) {
      setAnalysisStatus("idle")
      setAnalysisError(null)
      setAnalysisResultsByTemplate({})
      setAnalysisRecord(null)
      setAnalysisSource(null)
      setSelectedClauseRef(null)
    }
  }, [markdownContent, markdownStatus])

  const runAnalysis = useCallback(
    async ({ force = false, templateIds }: { force?: boolean; templateIds: string[] }) => {
      if (!contractRecord) {
        setAnalysisStatus("error")
        setAnalysisError("请先完成合同保存后再进行分析")
        return
      }

      if (!templateIds.length) {
        setAnalysisStatus("error")
        setAnalysisError("请至少选择一个产品合同模板")
        return
      }

      const markdown = markdownContent || contractRecord.markdown
      if (!markdown) {
        setAnalysisStatus("error")
        setAnalysisError("未找到合同Markdown内容，无法分析")
        return
      }

      try {
        setAnalysisStatus("loading")
        setAnalysisError(null)

        if (!force) {
          const getResponse = await fetch(`/api/contracts/${contractRecord.id}/analysis`)
          if (getResponse.ok) {
            const existingData = (await getResponse.json()) as AnalyzeContractResponse
            if (existingData?.analysis) {
              const storedTemplateIds = Array.isArray(existingData.analysis.selectedTemplateIds)
                ? existingData.analysis.selectedTemplateIds.filter((value) => typeof value === "string" && value.length > 0)
                : []

              const requestedSorted = [...templateIds].sort()
              const storedSorted = [...storedTemplateIds].sort()
              const sameTemplates =
                requestedSorted.length === storedSorted.length &&
                requestedSorted.every((id, index) => id === storedSorted[index])

              if (sameTemplates) {
                const normalizedMap = normalizeResultsByTemplate(
                  existingData.analysis.result,
                  storedTemplateIds.length > 0 ? storedTemplateIds : templateIds,
                )
                setSelectedTemplateIds(storedTemplateIds)
                setAnalysisResultsByTemplate(normalizedMap)
                setAnalysisRecord(existingData.analysis)
                setAnalysisSource("cache")
                setAnalysisStatus("success")
                setSelectedClauseRef(pickFirstClauseRef(normalizedMap, storedTemplateIds))
                return
              }
            }
          }
        }

        const response = await fetch(`/api/contracts/${contractRecord.id}/analysis`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            markdown,
            template_ids: templateIds,
            ...(force ? { force: true } : {}),
          }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.message ?? `分析失败，状态码 ${response.status}`)
        }

        const data = (await response.json()) as AnalyzeContractResponse
        if (!data?.analysis) {
          throw new Error("分析接口返回结果无效")
        }

        const resultTemplateIds = Array.isArray(data.analysis.selectedTemplateIds)
          ? data.analysis.selectedTemplateIds.filter((value) => typeof value === "string" && value.length > 0)
          : templateIds

        const normalizedMap = normalizeResultsByTemplate(data.analysis.result, resultTemplateIds)

        setAnalysisResultsByTemplate(normalizedMap)
        setAnalysisRecord(data.analysis)
        setAnalysisSource(data.source ?? "fresh")
        setAnalysisStatus("success")
        setSelectedTemplateIds(resultTemplateIds)
        setSelectedClauseRef(pickFirstClauseRef(normalizedMap, resultTemplateIds))
      } catch (error) {
        setAnalysisStatus("error")
        setAnalysisError(error instanceof Error ? error.message : "分析失败，请稍后重试")
        setAnalysisResultsByTemplate({})
        setAnalysisRecord(null)
        setAnalysisSource(null)
        setSelectedClauseRef(null)
      }
    },
    [contractRecord, markdownContent],
  )

  const openTemplateSelection = useCallback(
    (action: "analyze" | "reprocess") => {
      if (templatesStatus !== "success") {
        setAnalysisStatus("error")
        setAnalysisError("模板列表尚未加载完成，请稍后重试")
        return
      }
      if (templates.length === 0) {
        setAnalysisStatus("error")
        setAnalysisError("暂无可用的产品合同模板，请先在标准条款页面创建。")
        return
      }

      setPendingAnalysisAction(action)
      const preferredSelection = selectedTemplateIds.filter((id) => templates.some((template) => template.id === id))
      const fallbackSelection = templates.map((template) => template.id)
      setPendingTemplateSelection(preferredSelection.length > 0 ? preferredSelection : fallbackSelection)
      setTemplateDialogError(null)
      setTemplateDialogOpen(true)
    },
    [templatesStatus, templates, selectedTemplateIds],
  )

  const handleTemplateDialogOpenChange = useCallback((open: boolean) => {
    setTemplateDialogOpen(open)
    if (!open) {
      setTemplateDialogError(null)
      setPendingAnalysisAction(null)
    }
  }, [])

  const handleTemplateDialogConfirm = useCallback(() => {
    if (!pendingAnalysisAction) {
      setTemplateDialogOpen(false)
      return
    }

    if (pendingTemplateSelection.length === 0) {
      setTemplateDialogError("请至少选择一个产品合同模板")
      return
    }

    const templateIds = [...pendingTemplateSelection]
    setTemplateDialogOpen(false)
    setTemplateDialogError(null)
    const force = pendingAnalysisAction === "reprocess"
    setPendingAnalysisAction(null)
    void runAnalysis({ force, templateIds })
  }, [pendingAnalysisAction, pendingTemplateSelection, runAnalysis])

  // 导航到合同文本的函数
  const navigateToText = useCallback((text: string) => {
    if (!text) {
      console.warn("导航文本为空")
      return
    }

    // 如果当前不是markdown模式，先切换到markdown模式
    if (previewMode !== "markdown") {
      setPreviewMode("markdown")
      // 等待模式切换完成后再执行导航
      setTimeout(() => {
        const success = markdownViewerRef.current?.highlightAndScrollTo(text)
        if (!success) {
          console.warn("无法在markdown中找到指定文本:", text.substring(0, 50) + "...")
        }
      }, 200)
      return
    }

    // 使用markdownViewer的方法高亮并滚动到指定文本
    const success = markdownViewerRef.current?.highlightAndScrollTo(text)
    if (!success) {
      console.warn("无法在markdown中找到指定文本:", text.substring(0, 50) + "...")
    }
  }, [previewMode])

  const hasAnalysisResults = useMemo(
    () => Object.keys(analysisResultsByTemplate).length > 0,
    [analysisResultsByTemplate],
  )
  const hasContractSession = Boolean(
    uploadedFile ||
    contractRecord ||
    cachedFileName ||
    markdownContent ||
    hasAnalysisResults,
  )
  const displayFileName = uploadedFile?.name ?? cachedFileName ?? contractRecord?.originalFileName ?? null

  const selectedTemplateNames = useMemo(() => {
    if (templatesStatus !== "success" || !templates.length || !selectedTemplateIds.length) {
      return [] as string[]
    }
    return selectedTemplateIds
      .map((id) => templates.find((template) => template.id === id)?.name)
      .filter((name): name is string => typeof name === "string" && name.length > 0)
  }, [selectedTemplateIds, templates, templatesStatus])

  const templatesById = useMemo(() => {
    const map = new Map<string, ContractTemplate>()
    templates.forEach((template) => {
      map.set(template.id, template)
    })
    return map
  }, [templates])

  const templateOrder = useMemo(() => {
    const ordered = selectedTemplateIds.filter((id) => analysisResultsByTemplate[id])
    const additional = Object.keys(analysisResultsByTemplate).filter((id) => !ordered.includes(id))
    return [...ordered, ...additional]
  }, [analysisResultsByTemplate, selectedTemplateIds])

  const groupedClausesByTemplate = useMemo(() => {
    const result: Record<string, Record<string, CategorizedClause[]>> = {}
    Object.entries(analysisResultsByTemplate).forEach(([templateId, detection]) => {
      const groups: Record<string, CategorizedClause[]> = {}
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
  }, [analysisResultsByTemplate])

  const handleClauseSelect = useCallback((templateId: string, index: number) => {
    setSelectedClauseRef({ templateId, index })
  }, [])

  useEffect(() => {
    const hasResults = Object.keys(analysisResultsByTemplate).length > 0

    if (!hasResults) {
      if (selectedClauseRef !== null) {
        setSelectedClauseRef(null)
      }
      return
    }

    if (
      !selectedClauseRef ||
      !analysisResultsByTemplate[selectedClauseRef.templateId] ||
      !analysisResultsByTemplate[selectedClauseRef.templateId].extractedClauses[selectedClauseRef.index]
    ) {
      const fallbackRef = pickFirstClauseRef(analysisResultsByTemplate, templateOrder)
      if (
        fallbackRef?.templateId !== selectedClauseRef?.templateId ||
        fallbackRef?.index !== selectedClauseRef?.index
      ) {
        setSelectedClauseRef(fallbackRef ?? null)
      }
    }
  }, [analysisResultsByTemplate, selectedClauseRef, templateOrder])

  const selectedClause = useMemo(() => {
    if (!selectedClauseRef) return null
    const detection = analysisResultsByTemplate[selectedClauseRef.templateId]
    if (!detection) return null
    return detection.extractedClauses[selectedClauseRef.index] ?? null
  }, [analysisResultsByTemplate, selectedClauseRef])

  const selectedClauseTemplate = useMemo(() => {
    if (!selectedClauseRef) return null
    return templatesById.get(selectedClauseRef.templateId) ?? null
  }, [selectedClauseRef, templatesById])

  return (
    <>
      <ContractAnalysisDialog
        templateDialogOpen={templateDialogOpen}
        pendingAnalysisAction={pendingAnalysisAction}
        templates={templates}
        templateDialogError={templateDialogError}
        pendingTemplateSelection={pendingTemplateSelection}
        templatesStatus={templatesStatus}
        setPendingTemplateSelection={setPendingTemplateSelection}
        handleTemplateDialogOpenChange={handleTemplateDialogOpenChange}
        handleTemplateDialogConfirm={handleTemplateDialogConfirm}
      />

      <div className="space-y-6">
        <ContractUploadPanel
          encodedFileUrl={pdfPreviewUrl}
          contractRecord={contractRecord}
          displayFileName={displayFileName}
          hasContractSession={hasContractSession}
          saveStatus={saveStatus}
          handleFileUpload={handleFileUpload}
          handleStartNewAnalysis={handleStartNewAnalysis}
        />
        {hasContractSession && (
          <div className="space-y-6">
            {/* <ContractAnalysisPanel /> */}

            <div className="grid gap-6 lg:grid-cols-3 items-stretch">
              <ContractContentPreview
                previewMode={previewMode}
                pdfPreviewUrl={pdfPreviewUrl}
                saveStatus={saveStatus}
                saveError={saveError}
                contractRecord={contractRecord}
                markdownStatus={markdownStatus}
                markdownError={markdownError}
                markdownContent={markdownContent}
                markdownViewerRef={markdownViewerRef}
                setPreviewMode={setPreviewMode}
              />
              <ContractClausesList
                analysisStatus={analysisStatus}
                markdownStatus={markdownStatus}
                contractRecord={contractRecord}
                saveStatus={saveStatus}
                templatesStatus={templatesStatus}
                templates={templates}
                analysisRecord={analysisRecord}
                analysisSource={analysisSource}
                selectedTemplateNames={selectedTemplateNames}
                templatesError={templatesError}
                analysisError={analysisError}
                templateOrder={templateOrder}
                analysisResultsByTemplate={analysisResultsByTemplate}
                groupedClausesByTemplate={groupedClausesByTemplate}
                templatesById={templatesById}
                selectedClauseRef={selectedClauseRef}
                openTemplateSelection={openTemplateSelection}
                handleClauseSelect={handleClauseSelect}
                navigateToText={navigateToText}
              />
              <ContractAnalysisPanel
                analysisStatus={analysisStatus}
                analysisError={analysisError}
                markdownStatus={markdownStatus}
                selectedClause={selectedClause}
                selectedClauseTemplate={selectedClauseTemplate}
                navigateToText={navigateToText}
              />
            </div>
          </div>
        )}

        <DuplicateContractDialog
          open={duplicateDialogOpen}
          onOpenChange={setDuplicateDialogOpen}
          existingContract={existingContract}
          onUseExisting={handleUseExistingContract}
          onCreateNew={handleCreateNewContract}
        />
      </div>
    </>
  )
}

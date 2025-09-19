"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, FileText, Eye, Download, ChevronRight } from "lucide-react"
import { DuplicateContractDialog } from "@/components/duplicate-contract-dialog"
import { ContractAnalysisLoading } from "@/components/contract-analysis-loading"
import { MarkdownViewer, MarkdownViewerRef } from "@/components/markdown-viewer"

type ContractRecord = {
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
}

type ContractTemplate = {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  updatedAt: string
}

type ClauseLocation = {
  heading_path: string[]
  section_title: string | null
  snippet: string | null
}

type ClauseRisk = {
  level: string
  opinion?: string
  recommendation?: string
}

type ClauseStandardReference = {
  standard_text: string
  clause_category: string
  clause_item: string
} | null

type AnalyzedClause = {
  clauseCategory: string
  clauseItem: string
  contractText: string
  location: ClauseLocation | null
  standardReference: ClauseStandardReference
  compliance: string | null
  risk: ClauseRisk | null
}

type NonStandardDetectionResult = {
  extractedClauses: AnalyzedClause[]
}

type CategorizedClause = {
  clause: AnalyzedClause
  index: number
}

type StoredResultPayload = {
  version?: number
  resultsByTemplate?: Record<string, unknown>
}

type StoredClausesPayload = {
  version?: number
  clausesByTemplate?: Record<string, unknown>
}

type StoredAnalysisRecord = {
  id: string
  contractId: string
  result: StoredResultPayload | null
  standardClauses: StoredClausesPayload | null
  selectedTemplateIds: string[] | null
  createdAt: string
  updatedAt: string
}

type AnalyzeContractResponse = {
  source: "fresh" | "cache"
  analysis: StoredAnalysisRecord
}

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

    const contractTextValue = clauseRecord?.["contract_text"]
    const contractText = typeof contractTextValue === "string" ? contractTextValue : ""

    const locationValue = clauseRecord?.["location"]
    const location = locationValue && typeof locationValue === "object"
      ? (() => {
          const locationRecord = locationValue as Record<string, unknown>
          const headingPathValue = locationRecord["heading_path"]
          const sectionTitleValue = locationRecord["section_title"]
          const snippetValue = locationRecord["snippet"]

          return {
            heading_path: Array.isArray(headingPathValue)
              ? (headingPathValue as string[]).filter((item): item is string => typeof item === "string")
              : [],
            section_title: typeof sectionTitleValue === "string" ? sectionTitleValue : null,
            snippet: typeof snippetValue === "string" ? snippetValue : null,
          }
        })()
      : null

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
      location,
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

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
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
  const [pendingMarkdown, setPendingMarkdown] = useState<string>("")
  const [fileHash, setFileHash] = useState<string | null>(null)
  const [skipMarkdownConversion, setSkipMarkdownConversion] = useState(false)

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  const encodedFileUrl = useMemo(() => {
    if (!contractRecord) return null
    const encodedSegments = contractRecord.filePath
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
    return `/api/files/${encodedSegments.join("/")}`
  }, [contractRecord])

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
    if (file) {
      setUploadedFile(file)
      setPreviewMode("pdf")
      
      // 立即检查文件是否重复
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
            // 找到重复文件，显示对话框
            setExistingContract(result.existingContract)
            setPendingFile(file)
            setPendingMarkdown("") // 暂时为空，等获取markdown后填充
            setDuplicateDialogOpen(true)
            setSkipMarkdownConversion(true) // 标记跳过markdown转换
            // 不继续转换markdown
            return
          } else {
            // 保存文件hash供后续使用
            setFileHash(result.fileHash)
          }
        }
      } catch (error) {
        console.error("检查重复文件失败:", error)
        // 如果检查失败，继续正常流程
      }
    }
  }

  useEffect(() => {
    loadTemplates().catch(() => {
      setTemplatesStatus("error")
      setTemplatesError("加载产品合同模板失败")
    })
  }, [loadTemplates])

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
        setContractRecord(contract)
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
      
      // 获取完整的合同记录
      const response = await fetch(`/api/contracts`)
      if (response.ok) {
        const contracts = await response.json()
        const fullContract = contracts.find((c: any) => c.id === existingContract.id)
        
        if (fullContract) {
          setContractRecord(fullContract)
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
      setPendingMarkdown("")
      // 不需要重置skipMarkdownConversion，因为我们已经完成了处理
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
    setPendingMarkdown("")
    setSkipMarkdownConversion(false) // 重置标记，允许markdown转换
    
    // 继续正常的markdown转换流程
    // 这里不需要做其他事情，因为convertPdfToMarkdown会在useEffect中被调用
  }, [pendingFile])

  const convertPdfToMarkdown = useCallback(
    async (file: File) => {
      // 如果标记为跳过markdown转换，则不执行
      if (skipMarkdownConversion) {
        return
      }

      if (!apiBaseUrl) {
        setMarkdownStatus("error")
        setMarkdownError("未配置后端地址，请设置 NEXT_PUBLIC_API_BASE_URL")
        return
      }

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

        const response = await fetch(`${apiBaseUrl}/api/v1/pdf_to_markdown`, {
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
      } catch (error) {
        setMarkdownStatus("error")
        setMarkdownError(error instanceof Error ? error.message : "转换失败，请稍后重试")
      }
    },
    [apiBaseUrl, persistContract, skipMarkdownConversion],
  )

  useEffect(() => {
    if (!uploadedFile) {
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
      setFileHash(null)
      setSkipMarkdownConversion(false)
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

    void convertPdfToMarkdown(uploadedFile)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [uploadedFile, convertPdfToMarkdown])

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

  const toggleTemplateSelection = useCallback((templateId: string) => {
    setPendingTemplateSelection((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId],
    )
  }, [])

  const handleSelectAllTemplates = useCallback(() => {
    setPendingTemplateSelection(templates.map((template) => template.id))
  }, [templates])

  const handleClearTemplates = useCallback(() => {
    setPendingTemplateSelection([])
  }, [])

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

  const getRiskBadgeVariant = (
    level: string | null | undefined,
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (!level) return "outline"
    const normalized = typeof level === "string" ? level.toLowerCase() : ""
    if (normalized.includes("high") || level.includes("高")) return "destructive"
    if (normalized.includes("medium") || level.includes("中")) return "secondary"
    if (normalized.includes("low") || level.includes("低")) return "default"
    return "outline"
  }

  const getComplianceClassName = (compliance: string | null | undefined) => {
    if (!compliance) return "text-muted-foreground"
    if (/不符合|不合规|偏离|风险/.test(compliance)) return "text-destructive"
    if (/符合|一致|通过|合规|无/.test(compliance)) return "text-emerald-600"
    if (/未涉及|未标注|未知/.test(compliance)) return "text-muted-foreground"
    return "text-amber-600"
  }

  const getComplianceBadgeVariant = (
    compliance: string | null | undefined,
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (!compliance) return "outline"
    if (/不符合|不合规|偏离|风险/.test(compliance)) return "destructive"
    if (/符合|一致|通过|合规|无/.test(compliance)) return "default"
    if (/未涉及|未标注|未知/.test(compliance)) return "outline"
    return "secondary"
  }

  const analysisButtonDisabled =
    analysisStatus === "loading" ||
    markdownStatus !== "success" ||
    !contractRecord ||
    saveStatus !== "success" ||
    templatesStatus !== "success" ||
    templates.length === 0

  const analysisTimestamp = analysisRecord ? formatDateTime(analysisRecord.updatedAt) : null

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


  const templateDialogTitle = pendingAnalysisAction === "reprocess" ? "重新处理前选择模板" : "选择产品合同模板"
  const templateDialogDescription =
    pendingAnalysisAction === "reprocess"
      ? "选择本次重新处理需要启用的标准条款模板。"
      : "请选择本次分析需要启用的标准条款模板，至少勾选一个。"
  const templateDialogConfirmDisabled = pendingTemplateSelection.length === 0

  return (
    <>
      <Dialog open={templateDialogOpen} onOpenChange={handleTemplateDialogOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{templateDialogTitle}</DialogTitle>
            <DialogDescription>{templateDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {templates.map((template) => {
              const checked = pendingTemplateSelection.includes(template.id)
              return (
                <div
                  key={template.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleTemplateSelection(template.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      toggleTemplateSelection(template.id)
                    }
                  }}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                    checked ? "border-primary bg-primary/5" : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleTemplateSelection(template.id)}
                        className="mt-1"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{template.name}</p>
                      {template.description && (
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        创建于 {new Date(template.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            {templatesStatus === "success" && templates.length === 0 && (
              <p className="text-sm text-muted-foreground">暂无可用模板，请先在标准条款管理页面创建。</p>
            )}
          </div>
          {templateDialogError && <p className="text-sm text-destructive">{templateDialogError}</p>}
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAllTemplates}
                disabled={templates.length === 0}
              >
                全选
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearTemplates}
                disabled={pendingTemplateSelection.length === 0}
              >
                清空
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => handleTemplateDialogOpenChange(false)}>
                取消
              </Button>
              <Button type="button" onClick={handleTemplateDialogConfirm} disabled={templateDialogConfirmDisabled}>
                确认
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            合同上传
          </CardTitle>
          <CardDescription>上传PDF文件进行智能分析</CardDescription>
        </CardHeader>
        <CardContent>
          {!uploadedFile ? (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">上传合同文件</h3>
              <p className="text-muted-foreground mb-4">支持PDF格式，最大50MB</p>
              <label htmlFor="file-upload">
                <Button asChild>
                  <span>选择文件</span>
                </Button>
              </label>
              <input id="file-upload" type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium">{uploadedFile.name}</span>
                  <Badge variant="secondary">已上传</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!encodedFileUrl || saveStatus !== "success"}
                    onClick={() => {
                      if (encodedFileUrl) window.open(encodedFileUrl, "_blank")
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    预览
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!encodedFileUrl || saveStatus !== "success"}
                    onClick={() => {
                      if (encodedFileUrl) window.open(encodedFileUrl, "_blank")
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    下载
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {uploadedFile && (
        <div className="space-y-6">
          {/* <ContractAnalysisPanel /> */}

          <div className="grid gap-6 lg:grid-cols-3 items-stretch">
            <Card className="flex flex-col min-h-[700px]">
                <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>合同内容预览</CardTitle>
                    <CardDescription>
                      {previewMode === "pdf" ? "实时查看合同PDF页面" : "查看结构化Markdown版内容"}
                    </CardDescription>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={previewMode === "pdf" ? "default" : "outline"}
                      disabled={previewMode === "pdf"}
                      onClick={() => setPreviewMode("pdf")}
                    >
                      PDF版
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={previewMode === "markdown" ? "default" : "outline"}
                      disabled={previewMode === "markdown"}
                      onClick={() => setPreviewMode("markdown")}
                    >
                      Markdown版
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="mb-4 space-y-2 text-sm">
                  {saveStatus === "saving" && (
                    <p className="text-muted-foreground">合同数据保存中...</p>
                  )}
                  {saveStatus === "error" && saveError && (
                    <p className="text-destructive">{saveError}</p>
                  )}
                  {saveStatus === "success" && contractRecord && (
                    <p className="text-emerald-600">
                      合同已保存（ID: {contractRecord.id}）
                    </p>
                  )}
                </div>
                {previewMode === "pdf" ? (
                  pdfPreviewUrl ? (
                    <iframe
                      src={pdfPreviewUrl}
                      title="PDF预览"
                      className="h-[600px] w-full rounded-lg border bg-background"
                    />
                  ) : (
                    <div className="bg-muted/30 rounded-lg p-8 min-h-[600px] flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">无法预览当前文件</p>
                        <p className="text-sm text-muted-foreground mt-2">请确认已上传PDF文件</p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="h-[600px] rounded-lg border bg-background">
                    {markdownStatus === "loading" && (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        正在转换为Markdown...
                      </div>
                    )}
                    {markdownStatus === "error" && (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-destructive">
                        {markdownError ?? "转换失败，请稍后重试"}
                      </div>
                    )}
                    {markdownStatus === "success" && markdownContent && (
                      <MarkdownViewer 
                        ref={markdownViewerRef}
                        content={markdownContent}
                      />
                    )}
                    {markdownStatus === "idle" && (
                      <div className="flex h-full items-center justify-center px-6 text-sm text-muted-foreground">
                        正在准备Markdown内容...
                      </div>
                    )}
                  </div>
                )}
                </CardContent>
              </Card>

            <Card className="flex flex-col min-h-[700px]">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>合同分析结果</CardTitle>
                  <CardDescription>针对当前合同内容的条款比对与风险识别</CardDescription>
                </div>
                <div className="flex flex-col gap-3 sm:items-end sm:text-right">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={analysisButtonDisabled}
                      onClick={() => openTemplateSelection("analyze")}
                    >
                      {analysisStatus === "loading" ? "分析中..." : "开始智能分析"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={analysisButtonDisabled || !analysisRecord}
                      onClick={() => openTemplateSelection("reprocess")}
                    >
                      {analysisStatus === "loading" ? "处理中..." : "重新处理"}
                    </Button>
                  </div>
                  {selectedTemplateNames.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      已选择模板：{selectedTemplateNames.join("、")}
                    </div>
                  )}
                  {analysisRecord && (
                    <div className="flex flex-wrap items-center justify-start gap-2 text-xs text-muted-foreground sm:justify-end">
                      <Badge variant={analysisSource === "cache" ? "secondary" : "default"}>
                        {analysisSource === "cache" ? "历史结果" : "最新结果"}
                      </Badge>
                      {analysisTimestamp && <span>更新时间：{analysisTimestamp}</span>}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {templatesStatus === "error" && templatesError && (
                  <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    模板加载失败：{templatesError}
                  </div>
                )}
                {templatesStatus === "success" && templates.length === 0 && (
                  <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    暂无可用的产品合同模板，请先在标准条款管理页面创建后再试。
                  </div>
                )}
                {analysisStatus === "loading" ? (
                  <div className="flex h-[600px] items-center justify-center">
                    <ContractAnalysisLoading />
                  </div>
                ) : analysisStatus === "error" ? (
                  <div className="flex h-[600px] items-center justify-center px-4 text-center text-sm text-destructive">
                    {analysisError ?? "分析失败，请稍后重试"}
                  </div>
                ) : analysisStatus === "idle" ? (
                  <div className="flex h-[600px] items-center justify-center px-4 text-sm text-muted-foreground">
                    {markdownStatus === "success"
                      ? "点击上方“开始智能分析”按钮以生成结果。"
                      : "等待合同Markdown内容生成..."}
                  </div>
                ) : templateOrder.length > 0 ? (
                  <div className="pb-4">
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-4 pr-1 pb-4">
                        {templateOrder.map((templateId) => {
                          const detection = analysisResultsByTemplate[templateId]
                          if (!detection) return null

                          const categoryGroups = groupedClausesByTemplate[templateId] ?? {}
                          const categoryEntries = Object.entries(categoryGroups)
                          const templateMeta = templatesById.get(templateId)
                          const templateName = templateMeta?.name ?? `模板 ${templateId}`
                          const templateDescription = templateMeta?.description ?? null
                          const templateRiskCounts = detection.extractedClauses.reduce(
                            (acc, clause) => {
                              const level = clause.risk?.level?.toLowerCase()
                              if (level?.includes("high") || level?.includes("高")) acc.high += 1
                              else if (level?.includes("medium") || level?.includes("中")) acc.medium += 1
                              else if (level?.includes("low") || level?.includes("低")) acc.low += 1
                              return acc
                            },
                            { high: 0, medium: 0, low: 0 },
                          )

                          return (
                            <div
                              key={templateId}
                              className="space-y-3 rounded-lg border border-border bg-background/80 p-4 shadow-sm"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-sm font-semibold text-foreground">{templateName}</h3>
                                    <Badge variant="secondary" className="text-xs">
                                      {detection.extractedClauses.length} 项
                                    </Badge>
                                  </div>
                                  {templateDescription && (
                                    <p className="text-xs text-muted-foreground">{templateDescription}</p>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {templateRiskCounts.high > 0 && (
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                                      高风险 {templateRiskCounts.high}
                                    </Badge>
                                  )}
                                  {templateRiskCounts.medium > 0 && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                      中风险 {templateRiskCounts.medium}
                                    </Badge>
                                  )}
                                  {templateRiskCounts.low > 0 && (
                                    <Badge variant="default" className="text-[10px] px-1.5 py-0.5">
                                      低风险 {templateRiskCounts.low}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {categoryEntries.length > 0 ? (
                                <Accordion type="multiple" className="w-full">
                                  {categoryEntries.map(([category, items]) => {
                                    const categoryRiskCounts = items.reduce(
                                      (acc, item) => {
                                        const level = item.clause.risk?.level?.toLowerCase()
                                        if (level?.includes("high") || level?.includes("高")) acc.high += 1
                                        else if (level?.includes("medium") || level?.includes("中")) acc.medium += 1
                                        else if (level?.includes("low") || level?.includes("低")) acc.low += 1
                                        return acc
                                      },
                                      { high: 0, medium: 0, low: 0 },
                                    )

                                    return (
                                      <AccordionItem key={`${templateId}-${category}`} value={`${templateId}-${category}`} className="border rounded-lg">
                                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                          <div className="flex w-full items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <h4 className="text-sm font-medium">{category}</h4>
                                              <Badge variant="secondary" className="text-xs">
                                                {items.length} 项
                                              </Badge>
                                            </div>
                                            <div className="flex items-center gap-1 pr-2">
                                              {categoryRiskCounts.high > 0 && (
                                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                                                  高风险 {categoryRiskCounts.high}
                                                </Badge>
                                              )}
                                              {categoryRiskCounts.medium > 0 && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                                  中风险 {categoryRiskCounts.medium}
                                                </Badge>
                                              )}
                                              {categoryRiskCounts.low > 0 && (
                                                <Badge variant="default" className="text-[10px] px-1.5 py-0.5">
                                                  低风险 {categoryRiskCounts.low}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pb-3">
                                          <div className="space-y-2">
                                            {items.map(({ clause, index }) => {
                                              const isSelected =
                                                selectedClauseRef?.templateId === templateId &&
                                                selectedClauseRef.index === index
                                              const snippet = clause.contractText || clause.location?.snippet || "暂无合同摘录"
                                              const riskLevel = clause.risk?.level

                                              return (
                                                <Card
                                                  key={`${templateId}-${category}-${clause.clauseItem}-${index}`}
                                                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                                                    isSelected ? "ring-2 ring-primary" : ""
                                                  }`}
                                                  onClick={() => handleClauseSelect(templateId, index)}
                                                >
                                                  <CardContent className="flex flex-col gap-2 p-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                      <div className="flex flex-col gap-1">
                                                        <h5 className="text-sm font-medium text-foreground">{clause.clauseItem}</h5>
                                                        <p
                                                          className={`text-xs font-medium ${getComplianceClassName(clause.compliance)}`}
                                                        >
                                                          {clause.compliance ?? "未标注合规性"}
                                                        </p>
                                                      </div>
                                                      <div className="flex items-center gap-1">
                                                        {riskLevel ? (
                                                          <Badge variant={getRiskBadgeVariant(riskLevel)} className="text-[10px]">
                                                            {riskLevel}
                                                          </Badge>
                                                        ) : (
                                                          <Badge variant="outline" className="text-[10px]">
                                                            未评估
                                                          </Badge>
                                                        )}
                                                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                      </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                      <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                                                        {snippet}
                                                      </p>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 px-1 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={(event) => {
                                                          event.stopPropagation()
                                                          navigateToText(snippet)
                                                        }}
                                                      >
                                                        🔍 查看原文
                                                      </Button>
                                                    </div>
                                                  </CardContent>
                                                </Card>
                                              )
                                            })}
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>
                                    )
                                  })}
                                </Accordion>
                              ) : (
                                <div className="flex items-center justify-center rounded-md border border-dashed border-muted-foreground/40 px-4 py-6 text-sm text-muted-foreground">
                                  未识别到与该模板匹配的条款。
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="flex h-[600px] items-center justify-center px-4 text-sm text-muted-foreground">
                    未识别到合同条款，请确认原文内容是否完整。
                  </div>
                )}
              </CardContent>
            </Card>

          <Card className="flex flex-col min-h-[700px]">
            <CardHeader>
              <CardTitle>合同分析详情</CardTitle>
              <CardDescription>查看条款差异、风险等级与整改建议</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {analysisStatus === "loading" ? (
                <div className="flex h-[600px] items-center justify-center">
                  <ContractAnalysisLoading />
                </div>
              ) : analysisStatus === "error" ? (
                <div className="flex h-[600px] items-center justify-center px-4 text-center text-sm text-destructive">
                  {analysisError ?? "分析失败，请稍后重试"}
                </div>
              ) : analysisStatus === "idle" ? (
                <div className="flex h-[600px] items-center justify-center px-4 text-sm text-muted-foreground">
                  {markdownStatus === "success"
                    ? "等待生成分析结果后可查看详细信息。"
                    : "合同Markdown尚未生成，暂无法展示详情。"}
                </div>
              ) : selectedClause ? (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4 pr-1 pb-4">
                    <div className="space-y-4 rounded-lg border border-border bg-background p-4 shadow-sm">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {selectedClauseTemplate && (
                            <Badge variant="outline" className="text-[10px]">
                              {selectedClauseTemplate.name}
                            </Badge>
                          )}
                          <span>类别：{selectedClause.clauseCategory || "未分类"}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">{selectedClause.clauseItem}</h3>
                          {selectedClause.compliance && (
                            <Badge variant={getComplianceBadgeVariant(selectedClause.compliance)} className="text-xs">
                              {selectedClause.compliance}
                            </Badge>
                          )}
                          {selectedClause.risk?.level && (
                            <Badge variant={getRiskBadgeVariant(selectedClause.risk.level)} className="text-xs">
                              {selectedClause.risk.level}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">合同文本摘录</span>
                        <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                            {selectedClause.contractText || selectedClause.location?.snippet || "暂无合同摘录"}
                          </p>
                          {(selectedClause.contractText || selectedClause.location?.snippet) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-fit px-2 text-xs"
                              onClick={() =>
                                navigateToText(selectedClause.contractText || selectedClause.location?.snippet || "")
                              }
                            >
                              在原文中定位
                            </Button>
                          )}
                        </div>
                      </div>

                      {selectedClause.location && (
                        <div className="space-y-1">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">合同中的位置</span>
                          <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                            {selectedClause.location.heading_path.length > 0 && (
                              <p>路径：{selectedClause.location.heading_path.join(" › ")}</p>
                            )}
                            {selectedClause.location.section_title && (
                              <p>章节：{selectedClause.location.section_title}</p>
                            )}
                            {selectedClause.location.snippet && (
                              <p className="whitespace-pre-wrap">摘录：{selectedClause.location.snippet}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedClause.standardReference && (
                        <div className="space-y-1">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">标准条款参考</span>
                          <div className="space-y-2 rounded-lg border bg-green-50/50 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {selectedClause.standardReference.clause_category}
                              </Badge>
                              <span className="text-sm font-medium text-foreground">
                                {selectedClause.standardReference.clause_item}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                              {selectedClause.standardReference.standard_text}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedClause.risk && (selectedClause.risk.opinion || selectedClause.risk.recommendation) && (
                        <div className="space-y-3">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">风险评估</span>
                          <div className="space-y-3 rounded-lg border bg-amber-50/50 p-4">
                            {selectedClause.risk.opinion && (
                              <div className="space-y-1">
                                <h4 className="text-sm font-medium text-foreground">风险说明</h4>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                                  {selectedClause.risk.opinion}
                                </p>
                              </div>
                            )}
                            {selectedClause.risk.recommendation && (
                              <div className="space-y-1">
                                <h4 className="text-sm font-medium text-foreground">整改建议</h4>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                                  {selectedClause.risk.recommendation}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex h-[600px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="font-medium">请选择一个条款查看详情</p>
                    <p className="text-xs">在左侧结果中选择条款即可查看详细分析。</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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

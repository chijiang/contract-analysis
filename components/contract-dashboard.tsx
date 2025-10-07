"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ContractTemplate } from "@/app/types/contract-analysis"

const formatDateTime = (input: string) => {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return date.toLocaleString()
}

type ContractListItem = {
  id: string
  originalFileName: string
  mimeType: string
  fileSize: number
  filePath: string
  markdown: string
  convertedAt: string
  createdAt: string
  updatedAt: string
  analysis: {
    id: string
    contractId: string
    updatedAt: string
    createdAt: string
    selectedTemplateIds: string[] | null
  } | null
}

type UploadTaskStatus = "processing" | "completed" | "error" | "skipped"

type UploadTask = {
  id: string
  fileName: string
  status: UploadTaskStatus
  message?: string
  contractId?: string
}

type DuplicateCheckResponse = {
  isDuplicate: boolean
  fileHash?: string
  existingContract?: {
    id: string
    markdown: string
    hasAnalysis: boolean
  }
}

const normalizeSelectedTemplateIds = (value: unknown): string[] | null => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0)
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string" && item.length > 0)
      }
    } catch (error) {
      return null
    }
  }
  return null
}

const toAnalysisMeta = (analysis: any): ContractListItem["analysis"] => ({
  id: analysis.id,
  contractId: analysis.contractId,
  createdAt: typeof analysis.createdAt === "string" ? analysis.createdAt : new Date(analysis.createdAt).toISOString(),
  updatedAt: typeof analysis.updatedAt === "string" ? analysis.updatedAt : new Date(analysis.updatedAt).toISOString(),
  selectedTemplateIds: normalizeSelectedTemplateIds(analysis.selectedTemplateIds),
})

const toContractListItem = (payload: any): ContractListItem => ({
  id: payload.id,
  originalFileName: payload.originalFileName,
  mimeType: payload.mimeType,
  fileSize: payload.fileSize,
  filePath: payload.filePath,
  markdown: payload.markdown,
  convertedAt: payload.convertedAt,
  createdAt: payload.createdAt,
  updatedAt: payload.updatedAt,
  analysis: payload.analysis ? toAnalysisMeta(payload.analysis) : null,
})

const statusBadgeVariant = (status: "completed" | "processing" | "pending" | "error") => {
  switch (status) {
    case "completed":
      return "success" as const
    case "processing":
      return "warning" as const
    case "error":
      return "destructive" as const
    default:
      return "secondary" as const
  }
}

const bytesToReadable = (bytes: number) => {
  if (!Number.isFinite(bytes)) return "—"
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

export function ContractDashboard() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [contracts, setContracts] = useState<ContractListItem[]>([])
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false)
  const [isContractsLoading, setIsContractsLoading] = useState(false)
  const [contractsError, setContractsError] = useState<string | null>(null)
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([])
  const [processingMap, setProcessingMap] = useState<Record<string, boolean>>({})
  const [isUploading, setIsUploading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const templateIds = useMemo(() => templates.map((template) => template.id), [templates])

  const refreshContracts = useCallback(async () => {
    try {
      setIsContractsLoading(true)
      setContractsError(null)
      const response = await fetch("/api/contracts", { cache: "no-store" })
      if (!response.ok) {
        throw new Error(`加载合同列表失败 (${response.status})`)
      }
      const data = (await response.json()) as unknown[]
      setContracts(data.map((item) => toContractListItem(item)))
    } catch (error) {
      setContractsError(error instanceof Error ? error.message : "加载合同列表失败")
    } finally {
      setIsContractsLoading(false)
    }
  }, [])

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsTemplatesLoading(true)
        setTemplatesError(null)
        const response = await fetch("/api/contract-templates")
        if (!response.ok) {
          throw new Error(`加载模板失败 (${response.status})`)
        }
        const data = (await response.json()) as ContractTemplate[]
        setTemplates(data)
      } catch (error) {
        setTemplatesError(error instanceof Error ? error.message : "加载模板失败")
      } finally {
        setIsTemplatesLoading(false)
      }
    }

    void loadTemplates()
    void refreshContracts()
  }, [refreshContracts])

  const appendTask = useCallback((task: UploadTask) => {
    setUploadTasks((prev) => {
      const next = [...prev, task]
      return next.slice(-8)
    })
  }, [])

  const updateTask = useCallback((taskId: string, patch: Partial<UploadTask>) => {
    setUploadTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...patch } : task)))
  }, [])

  const markProcessing = useCallback((contractId: string, active: boolean) => {
    setProcessingMap((prev) => {
      const next = { ...prev }
      if (active) {
        next[contractId] = true
      } else {
        delete next[contractId]
      }
      return next
    })
  }, [])

  const replaceContract = useCallback((updated: ContractListItem) => {
    setContracts((prev) => {
      const filtered = prev.filter((item) => item.id !== updated.id)
      return [updated, ...filtered]
    })
  }, [])

  const checkDuplicate = useCallback(async (file: File): Promise<DuplicateCheckResponse | null> => {
    try {
      const form = new FormData()
      form.append("file", file)
      const response = await fetch("/api/contracts/check-duplicate", {
        method: "POST",
        body: form,
      })
      if (!response.ok) return null
      return (await response.json()) as DuplicateCheckResponse
    } catch (error) {
      console.warn("检查重复合同失败", error)
      return null
    }
  }, [])

  const convertPdfToMarkdown = useCallback(async (file: File) => {
    const form = new FormData()
    form.append("file", file)
    const response = await fetch("/api/pdf-to-markdown", {
      method: "POST",
      body: form,
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.message ?? "PDF 转 Markdown 失败")
    }
    const data = await response.json()
    const markdown = data?.markdown
    if (typeof markdown !== "string" || markdown.length === 0) {
      throw new Error("Markdown 内容为空")
    }
    return markdown as string
  }, [])

  const persistContract = useCallback(
    async (file: File, markdown: string, fileHash?: string | null) => {
      const form = new FormData()
      form.append("file", file)
      form.append("markdown", markdown)
      form.append("originalName", file.name)
      if (fileHash) {
        form.append("fileHash", fileHash)
      }
      const response = await fetch("/api/contracts", {
        method: "POST",
        body: form,
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? "保存合同失败")
      }
      const payload = await response.json()
      return toContractListItem(payload)
    },
    [],
  )

  const triggerAnalysis = useCallback(
    async (contractId: string, markdown: string, templatesToUse: string[], opts: { force?: boolean } = {}) => {
      if (!templatesToUse.length) {
        throw new Error("暂无可用的审核模板")
      }
      const response = await fetch(`/api/contracts/${contractId}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown,
          template_ids: templatesToUse,
          ...(opts.force ? { force: true } : {}),
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? "合同审核失败")
      }
      const data = await response.json()
      return data
    },
    [],
  )

  const triggerServiceInfo = useCallback(async (contractId: string, markdown: string) => {
    const response = await fetch(`/api/contracts/${contractId}/service-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown }),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.message ?? "合同服务信息分析失败")
    }
  }, [])

  const processFile = useCallback(
    async (file: File) => {
      const taskId = `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`
      appendTask({ id: taskId, fileName: file.name, status: "processing", message: "正在读取文件" })

      try {
        const duplicate = await checkDuplicate(file)
        const templatesToUse = templateIds

        if (!templatesToUse.length) {
          throw new Error("请先配置合同审核模板")
        }

        if (duplicate?.isDuplicate && duplicate.existingContract) {
          const { id: contractId, markdown } = duplicate.existingContract
          markProcessing(contractId, true)
          updateTask(taskId, { contractId, message: "检测到已存在合同，重新触发分析" })

          await triggerAnalysis(contractId, markdown, templatesToUse, { force: true })
          await triggerServiceInfo(contractId, markdown)

          await refreshContracts()
          markProcessing(contractId, false)

          updateTask(taskId, {
            status: "completed",
            message: "重复合同已重新分析",
            contractId,
          })
          return
        }

        const markdown = await convertPdfToMarkdown(file)
        updateTask(taskId, { message: "OCR 转换完成，保存合同中" })

        const contract = await persistContract(file, markdown, duplicate?.fileHash)
        markProcessing(contract.id, true)
        replaceContract(contract)
        updateTask(taskId, { contractId: contract.id, message: "合同已保存，开始审核" })

        const analysisResult = await triggerAnalysis(contract.id, markdown, templatesToUse)
        await triggerServiceInfo(contract.id, markdown)

        if (analysisResult?.analysis) {
          replaceContract({ ...contract, analysis: toAnalysisMeta(analysisResult.analysis) })
        } else {
          await refreshContracts()
        }

        markProcessing(contract.id, false)
        updateTask(taskId, { status: "completed", message: "处理完成" })
      } catch (error) {
        updateTask(taskId, {
          status: "error",
          message: error instanceof Error ? error.message : "处理失败",
        })
      }
    },
    [appendTask, checkDuplicate, convertPdfToMarkdown, markProcessing, persistContract, refreshContracts, replaceContract, templateIds, triggerAnalysis, triggerServiceInfo, updateTask],
  )

  const handleReprocess = useCallback(
    async (contract: ContractListItem) => {
      if (!templates.length) {
        setGlobalError("请先在标准条款管理中创建审核模板")
        return
      }
      if (!contract.markdown) {
        setGlobalError("当前合同缺少可用于分析的文本内容")
        return
      }

      setGlobalError(null)
      markProcessing(contract.id, true)
      try {
        await triggerAnalysis(contract.id, contract.markdown, templateIds, { force: true })
        await triggerServiceInfo(contract.id, contract.markdown)
        await refreshContracts()
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "重新分析失败")
      } finally {
        markProcessing(contract.id, false)
      }
    },
    [markProcessing, refreshContracts, templateIds, templates, triggerAnalysis, triggerServiceInfo],
  )

  const handleDelete = useCallback(
    async (contract: ContractListItem) => {
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(`确定删除“${contract.originalFileName}”吗？此操作不可撤销。`)
        if (!confirmed) {
          return
        }
      }

      setGlobalError(null)
      markProcessing(contract.id, true)
      try {
        const response = await fetch(`/api/contracts/${contract.id}`, {
          method: "DELETE",
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.message ?? "删除合同失败")
        }

        setContracts((prev) => prev.filter((item) => item.id !== contract.id))
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "删除合同失败")
      } finally {
        markProcessing(contract.id, false)
      }
    },
    [markProcessing],
  )

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return

      setGlobalError(null)

      if (!templateIds.length) {
        setGlobalError("请先在标准条款管理中创建审核模板")
        event.target.value = ""
        return
      }

      setIsUploading(true)
      try {
        await Promise.all(Array.from(files).map((file) => processFile(file)))
        await refreshContracts()
      } catch (error) {
        console.error("批量处理合同失败", error)
      } finally {
        setIsUploading(false)
        event.target.value = ""
      }
    },
    [processFile, refreshContracts, templateIds],
  )

  const handleTriggerUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const hasTemplates = templates.length > 0
  const showUploadDisabled = isUploading || isTemplatesLoading || !hasTemplates

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <UploadCloud className="h-6 w-6" />
              批量上传合同
            </CardTitle>
            <CardDescription>
              选择多个 PDF 文件后，系统会自动完成 OCR 转换、合同入库、条款审核和服务信息拆解
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Button type="button" onClick={handleTriggerUpload} disabled={showUploadDisabled}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  选择文件
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileChange}
            />
            {!hasTemplates && !isTemplatesLoading && (
              <p className="text-xs text-destructive">尚未配置审核模板，请先在标准条款管理页创建。</p>
            )}
            {templatesError && (
              <p className="text-xs text-destructive">模板加载失败：{templatesError}</p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {globalError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{globalError}</span>
            </div>
          )}
          {uploadTasks.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">最新处理动态</h3>
              <div className="space-y-2">
                {uploadTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-muted/40 px-3 py-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{task.fileName}</span>
                      </div>
                      {task.message && <p className="text-xs text-muted-foreground">{task.message}</p>}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant={statusBadgeVariant(task.status === "processing" ? "processing" : task.status === "completed" ? "completed" : task.status === "error" ? "error" : "pending")}> 
                        {task.status === "processing" && "处理中"}
                        {task.status === "completed" && "已完成"}
                        {task.status === "error" && "失败"}
                        {task.status === "skipped" && "已跳过"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl">合同处理列表</CardTitle>
            <CardDescription>查看上传历史、处理状态以及分析结果</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void refreshContracts()} disabled={isContractsLoading}>
              {isContractsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 刷新中...
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" /> 刷新
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contractsError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{contractsError}</span>
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed border-muted-foreground/40 py-16 text-center text-muted-foreground">
              <FileText className="mb-4 h-10 w-10" />
              <p className="text-sm">暂未上传合同，点击上方按钮开始批量上传。</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[480px] pr-4">
              <Table>
                <TableCaption>最近一次处理时间越新的合同会排在前面。</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>合同名称</TableHead>
                    <TableHead>上传时间</TableHead>
                    <TableHead>文件大小</TableHead>
                    <TableHead>处理状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => {
                    const isProcessing = Boolean(processingMap[contract.id]) || !contract.analysis
                    const statusVariant = statusBadgeVariant(isProcessing ? "processing" : "completed")

                    return (
                      <TableRow key={contract.id}>
                        <TableCell className="max-w-[280px] truncate font-medium">
                          {contract.originalFileName}
                        </TableCell>
                        <TableCell>{formatDateTime(contract.createdAt)}</TableCell>
                        <TableCell>{bytesToReadable(contract.fileSize)}</TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-2 text-sm">
                            <Badge variant={statusVariant}>
                              {isProcessing ? "处理中" : "已完成"}
                            </Badge>
                            {!isProcessing && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                            {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-amber-500" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild variant="ghost" size="sm" disabled={!contract.analysis || isProcessing}>
                              <Link href={`/contracts/${contract.id}`}>
                                查看结果
                                <ExternalLink className="ml-1 h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleReprocess(contract)}
                            >
                              <RotateCcw className="mr-1 h-4 w-4" />
                              重新分析
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleDelete(contract)}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

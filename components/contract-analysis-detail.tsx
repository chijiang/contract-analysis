"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  FileText,
  Loader2,
  Download,
  ExternalLink,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MarkdownViewer, MarkdownViewerRef } from "@/components/markdown-viewer"
import { ContractServiceInfoPanel } from "@/components/contract-service-info-panel"
import type {
  AnalyzedClause,
  ContractRecord,
  ContractTemplate,
  StoredResultPayload,
} from "@/app/types/contract-analysis"
import {
  groupClausesByTemplate,
  normalizeResultsByTemplate,
  pickFirstClauseRef,
  parseSelectedTemplateIds,
  safeParseJson,
} from "@/lib/contract-analysis-utils"
import { getRiskBadgeVariant } from "@/components/contract-analysis-panel"

const bytesToReadable = (bytes: number) => {
  if (!Number.isFinite(bytes)) return "—"
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
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

type AnalysisPayload = {
  id: string
  contractId: string
  result: string | null
  standardClauses: string | null
  selectedTemplateIds: string | null
  createdAt: string
  updatedAt: string
}

type ContractAnalysisDetailProps = {
  contract: ContractRecord
  pdfUrl: string | null
  analysis: AnalysisPayload | null
  templates: ContractTemplate[]
}

type ClauseRef = { templateId: string; index: number } | null

export function ContractAnalysisDetail({ contract, pdfUrl, analysis, templates }: ContractAnalysisDetailProps) {
  const markdownViewerRef = useRef<MarkdownViewerRef>(null)

  const storedResult = useMemo(
    () => safeParseJson<StoredResultPayload>(analysis?.result ?? null),
    [analysis?.result],
  )
  const selectedTemplateIds = useMemo(
    () => parseSelectedTemplateIds(analysis?.selectedTemplateIds ?? null),
    [analysis?.selectedTemplateIds],
  )

  const templateIdFallback = useMemo(() => {
    if (selectedTemplateIds.length > 0) return selectedTemplateIds
    if (storedResult?.resultsByTemplate) return Object.keys(storedResult.resultsByTemplate)
    return [] as string[]
  }, [selectedTemplateIds, storedResult?.resultsByTemplate])

  const analysisResultsByTemplate = useMemo(
    () => normalizeResultsByTemplate(storedResult ?? null, templateIdFallback),
    [storedResult, templateIdFallback],
  )

  const templateOrder = useMemo(() => {
    const definedOrder = selectedTemplateIds.filter((id) => analysisResultsByTemplate[id])
    const remaining = Object.keys(analysisResultsByTemplate).filter((id) => !definedOrder.includes(id))
    return definedOrder.length > 0 ? [...definedOrder, ...remaining] : remaining
  }, [analysisResultsByTemplate, selectedTemplateIds])

  const groupedClauses = useMemo(() => groupClausesByTemplate(analysisResultsByTemplate), [analysisResultsByTemplate])

  const [selectedClauseRef, setSelectedClauseRef] = useState<ClauseRef>(() =>
    pickFirstClauseRef(analysisResultsByTemplate, templateOrder),
  )

  useEffect(() => {
    const fallback = pickFirstClauseRef(analysisResultsByTemplate, templateOrder)
    setSelectedClauseRef((prev) => {
      if (!prev) return fallback
      const currentClauseExists =
        prev &&
        analysisResultsByTemplate[prev.templateId] &&
        analysisResultsByTemplate[prev.templateId].extractedClauses[prev.index]
      if (!currentClauseExists) {
        return fallback
      }
      return prev
    })
  }, [analysisResultsByTemplate, templateOrder])

  const selectedClause: AnalyzedClause | null = useMemo(() => {
    if (!selectedClauseRef) return null
    const detection = analysisResultsByTemplate[selectedClauseRef.templateId]
    if (!detection) return null
    return detection.extractedClauses[selectedClauseRef.index] ?? null
  }, [analysisResultsByTemplate, selectedClauseRef])

  const templateMap = useMemo(() => {
    const map = new Map<string, ContractTemplate>()
    templates.forEach((template) => {
      map.set(template.id, template)
    })
    return map
  }, [templates])

  const selectedTemplate = useMemo(() => {
    if (!selectedClauseRef) return null
    return templateMap.get(selectedClauseRef.templateId) ?? null
  }, [selectedClauseRef, templateMap])

  const handleNavigateToText = useCallback((text: string) => {
    if (!text) return
    const success = markdownViewerRef.current?.highlightAndScrollTo(text)
    if (!success) {
      console.warn("无法在Markdown中定位到指定文本")
    }
  }, [])

  const handleSelectClause = useCallback((templateId: string, index: number) => {
    setSelectedClauseRef({ templateId, index })
  }, [])

  const hasAnalysisResults = Object.keys(analysisResultsByTemplate).length > 0
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="mr-1 h-4 w-4" /> 返回列表
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{contract.originalFileName}</h1>
            <p className="text-sm text-muted-foreground">
              上传时间：{formatDateTime(contract.createdAt)} · 文件大小：{bytesToReadable(contract.fileSize)}
            </p>
          </div>
        </div>
        {analysis && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            <span>最后更新：{formatDateTime(analysis.updatedAt)}</span>
            {hasAnalysisResults ? (
              <Badge variant="success" className="ml-2">
                <CheckCircle2 className="mr-1 h-3 w-3" /> 分析完成
              </Badge>
            ) : (
              <Badge variant="warning" className="ml-2">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" /> 结果生成中
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-2 border-border/60 bg-background/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xl">PDF 预览</CardTitle>
              <CardDescription>原始合同页面实时查看</CardDescription>
            </div>
            {pdfUrl && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={pdfUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-4 w-4" /> 新窗口打开
                  </a>
                </Button>
                <Button variant="ghost" size="icon" asChild>
                  <a href={pdfUrl} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4" />
                    <span className="sr-only">下载PDF</span>
                  </a>
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {pdfUrl ? (
              <iframe src={pdfUrl} title="PDF预览" className="h-[520px] w-full rounded-lg border bg-muted" />
            ) : (
              <div className="flex h-[520px] items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground">
                <div className="text-center">
                  <FileText className="mx-auto mb-3 h-10 w-10" />
                  无法加载PDF，请确认文件仍可访问。
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-border/60 bg-background/80">
          <CardHeader>
            <CardTitle className="text-xl">Markdown版本预览</CardTitle>
            <CardDescription>用于条款比对与定位的文本识别结果</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[520px] overflow-hidden rounded-lg border bg-background">
              {contract.markdown ? (
                <MarkdownViewer ref={markdownViewerRef} content={contract.markdown} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  暂无Markdown内容
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-border/60 bg-background/90">
        <CardContent className="pt-6">
          <ContractServiceInfoPanel
            contract={contract}
            markdown={contract.markdown}
            onLocateText={handleNavigateToText}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-2 border-border/60 bg-background/80">
          <CardHeader>
            <CardTitle className="text-xl">合同审核结果</CardTitle>
            <CardDescription>查看各模板下的条款识别概览</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasAnalysisResults ? (
              <div className="flex h-[480px] items-center justify-center text-sm text-muted-foreground">
                当前合同暂无审核结果，稍后刷新页面重试。
              </div>
            ) : (
              <ScrollArea className="h-[480px] pr-4">
                <div className="space-y-4">
                  {templateOrder.map((templateId) => {
                    const detection = analysisResultsByTemplate[templateId]
                    if (!detection) return null
                    const templateMeta = templateMap.get(templateId)
                    const templateName = templateMeta?.name ?? `模板 ${templateId}`
                    const templateDescription = templateMeta?.description ?? null
                    const riskCounts = detection.extractedClauses.reduce(
                      (acc, clause) => {
                        const level = clause.risk?.level?.toLowerCase()
                        if (level?.includes("high") || clause.risk?.level?.includes("高")) acc.high += 1
                        else if (level?.includes("medium") || clause.risk?.level?.includes("中")) acc.medium += 1
                        else if (level?.includes("low") || clause.risk?.level?.includes("低")) acc.low += 1
                        return acc
                      },
                      { high: 0, medium: 0, low: 0 },
                    )
                    const categories = groupedClauses[templateId] ?? {}

                    return (
                      <div key={templateId} className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-foreground">{templateName}</h3>
                              <Badge variant="accent">{detection.extractedClauses.length} 条</Badge>
                            </div>
                            {templateDescription && (
                              <p className="text-xs text-muted-foreground">{templateDescription}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {riskCounts.high > 0 && (
                              <Badge variant="destructive" className="text-[11px]">
                                高风险 {riskCounts.high}
                              </Badge>
                            )}
                            {riskCounts.medium > 0 && (
                              <Badge variant="warning" className="text-[11px]">
                                中风险 {riskCounts.medium}
                              </Badge>
                            )}
                            {riskCounts.low > 0 && (
                              <Badge variant="success" className="text-[11px]">
                                低风险 {riskCounts.low}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          {Object.entries(categories).map(([category, clauses]) => (
                            <div key={category} className="rounded-md border border-border/60 bg-background/90 p-3">
                              <div className="text-sm font-medium text-foreground">{category}</div>
                              <div className="mt-2 space-y-2">
                                {clauses.map(({ clause, index }) => {
                                  const isActive =
                                    selectedClauseRef?.templateId === templateId &&
                                    selectedClauseRef?.index === index
                                  return (
                                    <button
                                      key={`${templateId}-${index}`}
                                      type="button"
                                      onClick={() => handleSelectClause(templateId, index)}
                                      className={`w-full rounded-md border px-3 py-2 text-left transition ${
                                        isActive
                                          ? "border-primary bg-primary/10"
                                          : "border-border/60 bg-muted/20 hover:border-primary/60"
                                      }`}
                                    >
                                      <div className="flex flex-col gap-1 text-sm">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-medium text-foreground">{clause.clauseItem}</span>
                                          {clause.risk?.level && (
                                            <Badge variant={getRiskBadgeVariant(clause.risk.level)} className="text-[10px]">
                                              {clause.risk.level}
                                            </Badge>
                                          )}
                                        </div>
                                        {clause.compliance && (
                                          <span className={`text-xs ${getComplianceBadgeVariant(clause.compliance) === "destructive" ? "text-destructive" : "text-muted-foreground"}`}>
                                            合规性：{clause.compliance}
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-border/60 bg-background/80">
          <CardHeader>
            <CardTitle className="text-xl">审核结果详情</CardTitle>
            <CardDescription>查看条款差异、风险等级与整改建议</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedClause ? (
              <div className="flex h-[480px] items-center justify-center text-sm text-muted-foreground">
                在左侧选择条款以查看详细信息。
              </div>
            ) : (
              <ScrollArea className="h-[480px] pr-2">
                <div className="space-y-4">
                  <div className="space-y-2 rounded-lg border border-border/70 bg-background/95 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {selectedTemplate && (
                        <Badge variant="outline" className="text-[11px]">
                          {selectedTemplate.name}
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

                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">合同文本摘录</span>
                    <div className="space-y-3 rounded-md border bg-muted/40 p-3">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {selectedClause.contractText || "暂无摘录"}
                      </p>
                      {selectedClause.contractText && (
                        <Button variant="outline" size="sm" onClick={() => handleNavigateToText(selectedClause.contractText)}>
                          在文本中定位
                        </Button>
                      )}
                    </div>
                  </div>

                  {selectedClause.standardReference && (
                    <div className="space-y-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">标准条款参考</span>
                      <div className="space-y-2 rounded-md border bg-emerald-50/70 p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {selectedClause.standardReference.clause_category}
                          </Badge>
                          <span className="font-semibold text-foreground">
                            {selectedClause.standardReference.clause_item}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-muted-foreground">
                          {selectedClause.standardReference.standard_text}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedClause.risk && (selectedClause.risk.opinion || selectedClause.risk.recommendation) && (
                    <div className="space-y-3">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">风险评估</span>
                      <div className="space-y-3 rounded-md border bg-red-50/70 p-3 text-sm">
                        {selectedClause.risk.opinion && (
                          <div className="space-y-1">
                            <h4 className="font-semibold text-foreground">风险说明</h4>
                            <p className="whitespace-pre-wrap text-muted-foreground">
                              {selectedClause.risk.opinion}
                            </p>
                          </div>
                        )}
                        {selectedClause.risk.recommendation && (
                          <div className="space-y-1">
                            <h4 className="font-semibold text-foreground">整改建议</h4>
                            <p className="whitespace-pre-wrap text-muted-foreground">
                              {selectedClause.risk.recommendation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

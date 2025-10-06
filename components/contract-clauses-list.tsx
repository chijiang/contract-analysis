import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getRiskBadgeVariant } from "@/components/contract-analysis-panel"
import { Badge } from "@/components/ui/badge"
import { ContractAnalysisLoading } from "@/components/contract-analysis-loading"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ChevronRight } from "lucide-react"
import { ContractRecord, SaveStatus, NonStandardDetectionResult, CategorizedClause, ContractTemplate, StoredAnalysisRecord } from "@/app/types/contract-analysis"


type ContractClausesListProps = {
    analysisStatus: "idle" | "loading" | "success" | "error"
    markdownStatus: "idle" | "loading" | "success" | "error"
    contractRecord: ContractRecord | null
    saveStatus: SaveStatus
    templatesStatus: "idle" | "loading" | "success" | "error"
    templates: ContractTemplate[]
    analysisRecord: StoredAnalysisRecord | null
    analysisSource: "fresh" | "cache" | null
    selectedTemplateNames: string[]
    templatesError: string | null
    analysisError: string | null
    templateOrder: string[]
    analysisResultsByTemplate: Record<string, NonStandardDetectionResult>
    groupedClausesByTemplate: Record<string, Record<string, CategorizedClause[]>>
    templatesById: Map<string, ContractTemplate>
    selectedClauseRef: { templateId: string; index: number } | null

    openTemplateSelection: (action: "analyze" | "reprocess") => void
    handleClauseSelect: (templateId: string, index: number) => void
    navigateToText: (text: string) => void
}

const formatDateTime = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return value
    }
    return date.toLocaleString()
}

const getComplianceClassName = (compliance: string | null | undefined) => {
    if (!compliance) return "text-muted-foreground"
    if (/不符合|不合规|偏离|风险/.test(compliance)) return "text-destructive"
    if (/符合|一致|通过|合规|无/.test(compliance)) return "text-emerald-600"
    if (/未涉及|未标注|未知/.test(compliance)) return "text-muted-foreground"
    return "text-amber-600"
}

export function ContractClausesList(
    {
        analysisStatus,
        markdownStatus,
        contractRecord,
        saveStatus,
        templatesStatus,
        templates,
        analysisRecord,
        analysisSource,
        selectedTemplateNames,
        templatesError,
        analysisError,
        templateOrder,
        analysisResultsByTemplate,
        groupedClausesByTemplate,
        templatesById,
        selectedClauseRef,
        openTemplateSelection,
        handleClauseSelect,
        navigateToText,
    }: ContractClausesListProps
) {
    const analysisButtonDisabled =
        analysisStatus === "loading" ||
        markdownStatus !== "success" ||
        !contractRecord ||
        saveStatus !== "success" ||
        templatesStatus !== "success" ||
        templates.length === 0

    const analysisTimestamp = analysisRecord ? formatDateTime(analysisRecord.updatedAt) : null

    return (
        <Card className="flex flex-col min-h-[700px]">
            <CardHeader className="space-y-1">
                {/* 第一行：标题 */}
                <CardTitle>合同审核结果</CardTitle>
                <CardDescription>针对当前合同内容的条款比对与风险识别</CardDescription>

                {/* 第三行：按钮 */}
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                        type="button"
                        size="default"
                        disabled={analysisButtonDisabled}
                        onClick={() => openTemplateSelection("analyze")}
                    >
                        {analysisStatus === "loading" ? "分析中..." : "智能分析"}
                    </Button>
                    <Button
                        type="button"
                        size="default"
                        variant="outline"
                        disabled={analysisButtonDisabled || !analysisRecord}
                        onClick={() => openTemplateSelection("reprocess")}
                    >
                        {analysisStatus === "loading" ? "处理中..." : "重新处理"}
                    </Button>
                </div>

                {/* 第四行：历史结果badge + 更新时间 */}
                {analysisRecord && (
                    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        <Badge variant={analysisSource === "cache" ? "secondary" : "default"}>
                            {analysisSource === "cache" ? "历史结果" : "最新结果"}
                        </Badge>
                        {analysisTimestamp && <span>更新时间：{analysisTimestamp}</span>}
                    </div>
                )}

                {/* 第五行：已选择模板描述 */}
                {selectedTemplateNames.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                        已选择模板：{selectedTemplateNames.join("、")}
                    </div>
                )}
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
                            ? "点击上方“智能分析”按钮以生成结果。"
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
                                                        <Badge variant="accent" className="text-xs">
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
                                                        <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">
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
                                                                    <div className="flex w-full flex-col gap-2">
                                                                        <div className="flex w-full items-center">
                                                                            <h4 className="text-sm font-medium">{category}</h4>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <Badge variant="accent" className="text-xs">
                                                                                {items.length} 项
                                                                            </Badge>
                                                                            {categoryRiskCounts.high > 0 && (
                                                                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                                                                                    高风险 {categoryRiskCounts.high}
                                                                                </Badge>
                                                                            )}
                                                                            {categoryRiskCounts.medium > 0 && (
                                                                                <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">
                                                                                    中风险 {categoryRiskCounts.medium}
                                                                                </Badge>
                                                                            )}
                                                                            {categoryRiskCounts.low > 0 && (
                                                                                <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
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
                                                                            const snippet = clause.contractText || "暂无合同摘录"
                                                                            const riskLevel = clause.risk?.level

                                                                            return (
                                                                                <Card
                                                                                    key={`${templateId}-${category}-${clause.clauseItem}-${index}`}
                                                                                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${isSelected ? "ring-2 ring-primary" : ""
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

    )
}
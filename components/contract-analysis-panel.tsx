"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ContractAnalysisLoading } from "@/components/contract-analysis-loading"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import { AnalyzedClause, CommonStatus, ContractTemplate } from "@/app/types/contract-analysis"

type ContractAnalysisPanelProps = {
  analysisStatus: CommonStatus
  analysisError: string | null
  markdownStatus: string
  selectedClause: AnalyzedClause | null
  selectedClauseTemplate: ContractTemplate | null
  navigateToText: (text: string) => void
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

export const getRiskBadgeVariant = (
  level: string | null | undefined,
): "success" | "warning" | "destructive" | "outline" => {
  if (!level) return "outline"
  const normalized = typeof level === "string" ? level.toLowerCase() : ""
  if (normalized.includes("high") || level.includes("高")) return "destructive"
  if (normalized.includes("medium") || level.includes("中")) return "warning"
  if (normalized.includes("low") || level.includes("低")) return "success"
  return "outline"
}

export function ContractAnalysisPanel(
  {
    analysisStatus,
    analysisError,
    markdownStatus,
    selectedClause,
    selectedClauseTemplate,
    navigateToText
  }: ContractAnalysisPanelProps
) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  return (
    <Card className="flex flex-col min-h-[700px]">
      <CardHeader className="space-y-1">
        <CardTitle>审核结果详情</CardTitle>
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
                      {selectedClause.contractText || "暂无合同摘录"}
                    </p>
                    {(selectedClause.contractText) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-fit px-2 text-xs"
                        onClick={() =>
                          navigateToText(selectedClause.contractText || "")
                        }
                      >
                        在原文中定位
                      </Button>
                    )}
                  </div>
                </div>

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
                    <div className="space-y-3 rounded-lg border bg-red-50/50 p-4">
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
  )
}

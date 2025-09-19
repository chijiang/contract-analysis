"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Upload, Download, Filter, RefreshCw, FileSpreadsheet, ChevronRight } from "lucide-react"

interface StandardClause {
  id: string
  category: string
  clauseItem: string
  standard: string
  riskLevel: string | null
  createdAt: string
  updatedAt: string
}

export function StandardTermsManagement() {
  const [clauses, setClauses] = useState<StandardClause[]>([])
  const [filteredClauses, setFilteredClauses] = useState<StandardClause[]>([])
  const [selectedClause, setSelectedClause] = useState<StandardClause | null>(null)

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const [importStatus, setImportStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const [exportStatus, setExportStatus] = useState<"idle" | "downloading" | "error">("idle")
  const [exportError, setExportError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("全部类别")

  const importInputRef = useRef<HTMLInputElement | null>(null)

  const categories = useMemo(() => {
    const unique = Array.from(new Set(clauses.map((clause) => clause.category)))
    return ["全部类别", ...unique]
  }, [clauses])

  // 按分类分组条款
  const groupedClauses = useMemo(() => {
    const groups: Record<string, StandardClause[]> = {}
    filteredClauses.forEach((clause) => {
      const category = clause.category
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(clause)
    })
    return groups
  }, [filteredClauses])

  const applyFilter = useCallback(
    (allClauses: StandardClause[], term: string, category: string) => {
      const cleanedTerm = term.trim().toLowerCase()
      const next = allClauses.filter((clause) => {
        const matchCategory = category === "全部类别" || clause.category === category
        const matchTerm =
          !cleanedTerm ||
          clause.category.toLowerCase().includes(cleanedTerm) ||
          clause.clauseItem.toLowerCase().includes(cleanedTerm) ||
          clause.standard.toLowerCase().includes(cleanedTerm) ||
          (clause.riskLevel ? clause.riskLevel.toLowerCase().includes(cleanedTerm) : false)
        return matchCategory && matchTerm
      })
      return next
    },
    [],
  )

  const loadClauses = useCallback(async () => {
    setStatus("loading")
    setError(null)
    try {
      const response = await fetch("/api/standard-clauses")
      if (!response.ok) {
        throw new Error(`加载失败，状态码 ${response.status}`)
      }
      const data = (await response.json()) as StandardClause[]
      const normalized = data.map((clause) => ({
        ...clause,
        riskLevel: clause.riskLevel ?? null,
      }))
      setClauses(normalized)
      const filtered = applyFilter(normalized, searchTerm, categoryFilter)
      setFilteredClauses(filtered)
      setSelectedClause(filtered[0] ?? null)
      setStatus("success")
    } catch (error) {
      setStatus("error")
      setError(error instanceof Error ? error.message : "加载标准条款失败")
    }
  }, [applyFilter, categoryFilter, searchTerm])

  useEffect(() => {
    loadClauses().catch(() => {
      setStatus("error")
      setError("加载标准条款失败")
    })
  }, [loadClauses])

  useEffect(() => {
    const next = applyFilter(clauses, searchTerm, categoryFilter)
    setFilteredClauses(next)
    setSelectedClause((prev) => {
      if (!next.length) return null
      return prev && next.find((clause) => clause.id === prev.id) ? prev : next[0]
    })
  }, [clauses, searchTerm, categoryFilter, applyFilter])

  const handleImportChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ""
      if (!file) return

      setImportStatus("uploading")
      setImportMessage(null)

      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/standard-clauses/import", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.message ?? "导入失败")
        }

        const result = await response.json()
        setImportStatus("success")
        setImportMessage(
          `导入成功：共${result.total ?? "?"}条，其中新增${result.created ?? 0}条，更新${result.updated ?? 0}条。`,
        )
        await loadClauses()
      } catch (error) {
        setImportStatus("error")
        setImportMessage(error instanceof Error ? error.message : "导入失败，请稍后重试")
      }
    },
    [loadClauses],
  )

  const handleExport = useCallback(async () => {
    setExportStatus("downloading")
    setExportError(null)
    try {
      const response = await fetch("/api/standard-clauses/export")
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? `导出失败，状态码 ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `standard-clauses-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setExportStatus("idle")
    } catch (error) {
      setExportStatus("error")
      setExportError(error instanceof Error ? error.message : "导出失败，请稍后重试")
    }
  }, [])

  const handleRefresh = useCallback(() => {
    loadClauses().catch(() => {
      setStatus("error")
      setError("加载标准条款失败")
    })
  }, [loadClauses])

  const summary = useMemo(() => {
    const total = clauses.length
    const categoriesCount = new Set(clauses.map((clause) => clause.category)).size
    return { total, categories: categoriesCount }
  }, [clauses])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />标准条款知识库
            </CardTitle>
            <CardDescription>导入真实条款库或下载模板，支持批量维护</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => importInputRef.current?.click()}
              disabled={importStatus === "uploading"}
            >
              <Upload className="mr-2 h-4 w-4" /> 导入Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={status !== "success" || clauses.length === 0 || exportStatus === "downloading"}
            >
              <Download className="mr-2 h-4 w-4" />
              {exportStatus === "downloading" ? "导出中..." : "导出Excel"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" /> 刷新
            </Button>
          </div>
        </CardHeader>
        {(importStatus !== "idle" || exportStatus === "error") && (
          <CardContent className="pt-0 text-sm">
            {importStatus === "uploading" && <p className="text-muted-foreground">正在导入，请稍候...</p>}
            {importStatus === "success" && importMessage && <p className="text-emerald-600">{importMessage}</p>}
            {importStatus === "error" && (
              <p className="text-destructive">{importMessage ?? "导入失败，请检查文件内容"}</p>
            )}
            {exportStatus === "error" && exportError && <p className="text-destructive">{exportError}</p>}
          </CardContent>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="搜索类别、条款项或标准内容"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" /> 筛选类别
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[320px]">
                  <SheetHeader>
                    <SheetTitle>按类别筛选</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-2">
                    {categories.map((category) => (
                      <Button
                        key={category}
                        variant={categoryFilter === category ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setCategoryFilter(category)}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                条款总数：<strong className="text-foreground">{summary.total}</strong>
              </span>
              <span>
                类别数量：<strong className="text-foreground">{summary.categories}</strong>
              </span>
              {categoryFilter !== "全部类别" && (
                <span>
                  当前类别：<strong className="text-foreground">{categoryFilter}</strong>
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {status === "loading" && (
              <div className="py-12 text-center text-sm text-muted-foreground">正在加载标准条款...</div>
            )}
            {status === "error" && (
              <div className="py-12 text-center text-sm text-destructive">{error ?? "加载失败"}</div>
            )}
            {status === "success" && filteredClauses.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">暂无匹配的条款</div>
            )}
            {status === "success" && Object.keys(groupedClauses).length > 0 && (
              <ScrollArea className="h-[600px]">
                <div className="p-2">
                  <Accordion type="multiple" className="w-full">
                    {Object.entries(groupedClauses).map(([category, clauses]) => (
                      <AccordionItem key={category} value={category} className="border rounded-lg mb-2">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <h3 className="text-sm font-medium">{category}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {clauses.length} 条
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-3">
                          <div className="space-y-1">
                            {clauses.map((clause) => {
                              const isSelected = clause.id === selectedClause?.id
                              return (
                                <button
                                  key={clause.id}
                                  className={`w-full text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md ${
                                    isSelected ? "bg-muted" : ""
                                  }`}
                                  onClick={() => setSelectedClause(clause)}
                                >
                                  <div className="flex items-center justify-between gap-2 p-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-medium text-foreground truncate">{clause.clauseItem}</p>
                                        <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-2" />
                                      </div>
                                      <p className="text-xs text-muted-foreground line-clamp-2">{clause.standard}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        更新于 {new Date(clause.updatedAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </ScrollArea>
            )}
            {status === "success" && filteredClauses.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">暂无匹配的条款</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>条款详情</CardTitle>
            <CardDescription>查看标准约定、最近更新时间等信息</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedClause ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">所属类别</span>
                  <p className="text-sm font-medium">{selectedClause.category}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">具体条款项</span>
                  <p className="text-lg font-semibold text-foreground">{selectedClause.clauseItem}</p>
                </div>

                <Separator />

                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">标准约定</span>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {selectedClause.standard}
                  </p>
                </div>

                <Separator />

                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">风险等级标准</span>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {selectedClause.riskLevel && selectedClause.riskLevel.trim()
                      ? selectedClause.riskLevel
                      : "暂无风险等级说明"}
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div>
                    <p className="uppercase tracking-wide">创建时间</p>
                    <p className="text-sm text-foreground">
                      {new Date(selectedClause.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide">最近更新</p>
                    <p className="text-sm text-foreground">
                      {new Date(selectedClause.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-[400px] flex-col items-center justify-center text-sm text-muted-foreground">
                <p>请选择左侧条款查看详情</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

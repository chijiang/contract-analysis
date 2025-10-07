"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  FileUp, Filter, RefreshCw, FileSpreadsheet, ChevronRight, Pencil, PlusCircle, Layers, Trash2,
  FileDown
} from "lucide-react"

interface StandardClause {
  id: string
  templateId: string
  category: string
  clauseItem: string
  standard: string
  riskLevel: string | null
  createdAt: string
  updatedAt: string
}

interface ContractTemplate {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export function StandardTermsManagement() {
  const [clauses, setClauses] = useState<StandardClause[]>([])
  const [filteredClauses, setFilteredClauses] = useState<StandardClause[]>([])
  const [selectedClause, setSelectedClause] = useState<StandardClause | null>(null)

  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [templatesStatus, setTemplatesStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

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

  const availableCategories = useMemo(() => categories.filter((category) => category !== "全部类别"), [categories])

  const CUSTOM_CATEGORY_VALUE = "__CUSTOM__"

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addClauseDialogOpen, setAddClauseDialogOpen] = useState(false)
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [editFormState, setEditFormState] = useState({
    categoryOption: "",
    customCategory: "",
    clauseItem: "",
    standard: "",
    riskLevel: "",
  })
  const [editFormStatus, setEditFormStatus] = useState<"idle" | "saving" | "error">("idle")
  const [editFormError, setEditFormError] = useState<string | null>(null)

  const [deleteFormStatus, setDeleteFormStatus] = useState<"idle" | "saving" | "error">("idle")
  const [deleteFormError, setDeleteFormError] = useState<string | null>(null)

  const [addFormState, setAddFormState] = useState({
    categoryOption: "",
    customCategory: "",
    clauseItem: "",
    standard: "",
    riskLevel: "",
  })
  const [addFormStatus, setAddFormStatus] = useState<"idle" | "saving" | "error">("idle")
  const [addFormError, setAddFormError] = useState<string | null>(null)

  const [createTemplateStatus, setCreateTemplateStatus] = useState<"idle" | "saving" | "error">("idle")
  const [createTemplateError, setCreateTemplateError] = useState<string | null>(null)
  const [createTemplateForm, setCreateTemplateForm] = useState({
    name: "",
    description: "",
  })

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
        setSelectedTemplateId(null)
      } else {
        setSelectedTemplateId((prev) => (prev && data.some((template) => template.id === prev) ? prev : data[0].id))
      }
    } catch (error) {
      setTemplatesStatus("error")
      setTemplatesError(error instanceof Error ? error.message : "加载审核模板失败")
    }
  }, [])

  const loadClauses = useCallback(
    async (templateId: string | null, categoryOverride?: string, preferredClauseId?: string | null) => {
      if (!templateId) {
        setClauses([])
        setFilteredClauses([])
        setSelectedClause(null)
        setStatus("idle")
        setError(null)
        return
      }

      setStatus("loading")
      setError(null)
      try {
        const response = await fetch(`/api/standard-clauses?templateId=${encodeURIComponent(templateId)}`)
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.message ?? `加载失败，状态码 ${response.status}`)
        }
        const data = (await response.json()) as StandardClause[]
        const normalized = data.map((clause) => ({
          ...clause,
          riskLevel: clause.riskLevel ?? null,
        }))
        setClauses(normalized)
        const effectiveCategory = categoryOverride ?? categoryFilter
        const filtered = applyFilter(normalized, searchTerm, effectiveCategory)
        setFilteredClauses(filtered)
        if (preferredClauseId) {
          const matched = filtered.find((clause) => clause.id === preferredClauseId)
          setSelectedClause(matched ?? filtered[0] ?? null)
        } else {
          setSelectedClause(filtered[0] ?? null)
        }
        if (categoryOverride && categoryOverride !== categoryFilter) {
          setCategoryFilter(categoryOverride)
        }
        setStatus("success")
      } catch (error) {
        setStatus("error")
        setError(error instanceof Error ? error.message : "加载标准条款失败")
      }
    },
    [applyFilter, categoryFilter, searchTerm],
  )

  useEffect(() => {
    loadTemplates().catch(() => {
      setTemplatesStatus("error")
      setTemplatesError("加载审核模板失败")
    })
  }, [loadTemplates])

  useEffect(() => {
    const categoryReset = "全部类别"
    if (!selectedTemplateId) {
      setCategoryFilter(categoryReset)
      loadClauses(null, categoryReset).catch(() => {
        setStatus("error")
        setError("加载标准条款失败")
      })
      return
    }

    loadClauses(selectedTemplateId, categoryReset).catch(() => {
      setStatus("error")
      setError("加载标准条款失败")
    })
  }, [selectedTemplateId, loadClauses])

  useEffect(() => {
    const next = applyFilter(clauses, searchTerm, categoryFilter)
    setFilteredClauses(next)
    setSelectedClause((prev) => {
      if (!next.length) return null
      return prev && next.find((clause) => clause.id === prev.id) ? prev : next[0]
    })
  }, [clauses, searchTerm, categoryFilter, applyFilter])

  useEffect(() => {
    if (addClauseDialogOpen) {
      setAddFormStatus("idle")
      setAddFormError(null)
      setAddFormState({
        categoryOption: availableCategories[0] ?? CUSTOM_CATEGORY_VALUE,
        customCategory: "",
        clauseItem: "",
        standard: "",
        riskLevel: "",
      })
    }
  }, [addClauseDialogOpen, availableCategories])

  useEffect(() => {
    if (editDialogOpen) {
      if (!selectedClause) {
        setEditDialogOpen(false)
        return
      }
      const exists = availableCategories.includes(selectedClause.category)
      setEditFormStatus("idle")
      setEditFormError(null)
      setEditFormState({
        categoryOption: exists ? selectedClause.category : CUSTOM_CATEGORY_VALUE,
        customCategory: exists ? "" : selectedClause.category,
        clauseItem: selectedClause.clauseItem,
        standard: selectedClause.standard,
        riskLevel: selectedClause.riskLevel ?? "",
      })
    }
  }, [editDialogOpen, selectedClause, availableCategories])

  useEffect(() => {
    if (createTemplateDialogOpen) {
      setCreateTemplateStatus("idle")
      setCreateTemplateError(null)
      setCreateTemplateForm({ name: "", description: "" })
    }
  }, [createTemplateDialogOpen])

  useEffect(() => {
    if (!deleteDialogOpen) {
      setDeleteFormStatus("idle")
      setDeleteFormError(null)
    }
  }, [deleteDialogOpen])

  const handleAddClauseSubmit = useCallback(async () => {
    if (!selectedTemplateId) {
      setAddFormStatus("error")
      setAddFormError("请先选择审核模板")
      return
    }

    const category =
      addFormState.categoryOption === CUSTOM_CATEGORY_VALUE
        ? addFormState.customCategory.trim()
        : addFormState.categoryOption
    const clauseItem = addFormState.clauseItem.trim()
    const standard = addFormState.standard.trim()
    const riskLevel = addFormState.riskLevel.trim()

    if (!category) {
      setAddFormStatus("error")
      setAddFormError("条款类别为必填")
      return
    }
    if (!clauseItem) {
      setAddFormStatus("error")
      setAddFormError("条款项名称为必填")
      return
    }
    if (!standard) {
      setAddFormStatus("error")
      setAddFormError("标准约定内容不能为空")
      return
    }

    setAddFormStatus("saving")
    setAddFormError(null)

    try {
      const response = await fetch("/api/standard-clauses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          category,
          clauseItem,
          standard,
          riskLevel: riskLevel ? riskLevel : null,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? "新增标准条款失败")
      }

      const created = (await response.json()) as StandardClause
      setAddClauseDialogOpen(false)
      setAddFormStatus("idle")
      await loadClauses(selectedTemplateId, undefined, created.id)
    } catch (error) {
      setAddFormStatus("error")
      setAddFormError(error instanceof Error ? error.message : "新增标准条款失败")
    }
  }, [addFormState, loadClauses, selectedTemplateId])

  const handleEditClauseSubmit = useCallback(async () => {
    if (!selectedClause) {
      setEditFormStatus("error")
      setEditFormError("请先选择要修改的条款")
      return
    }

    const category =
      editFormState.categoryOption === CUSTOM_CATEGORY_VALUE
        ? editFormState.customCategory.trim()
        : editFormState.categoryOption
    const clauseItem = editFormState.clauseItem.trim()
    const standard = editFormState.standard.trim()
    const riskLevel = editFormState.riskLevel.trim()

    if (!category) {
      setEditFormStatus("error")
      setEditFormError("条款类别为必填")
      return
    }
    if (!clauseItem) {
      setEditFormStatus("error")
      setEditFormError("条款项名称为必填")
      return
    }
    if (!standard) {
      setEditFormStatus("error")
      setEditFormError("标准约定内容不能为空")
      return
    }

    setEditFormStatus("saving")
    setEditFormError(null)

    try {
      const response = await fetch(`/api/standard-clauses/${selectedClause.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          clauseItem,
          standard,
          riskLevel: riskLevel ? riskLevel : null,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? "更新标准条款失败")
      }

      setEditDialogOpen(false)
      setEditFormStatus("idle")
      if (selectedTemplateId) {
        await loadClauses(selectedTemplateId, undefined, selectedClause.id)
      } else {
        await loadClauses(null)
      }
    } catch (error) {
      setEditFormStatus("error")
      setEditFormError(error instanceof Error ? error.message : "更新标准条款失败")
    }
  }, [editFormState, loadClauses, selectedClause, selectedTemplateId])

  const handleCreateTemplateSubmit = useCallback(async () => {
    const name = createTemplateForm.name.trim()
    const description = createTemplateForm.description.trim()

    if (!name) {
      setCreateTemplateStatus("error")
      setCreateTemplateError("模板名称为必填")
      return
    }

    setCreateTemplateStatus("saving")
    setCreateTemplateError(null)

    try {
      const response = await fetch("/api/contract-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description: description || null,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? "创建审核模板失败")
      }

      const template = (await response.json()) as ContractTemplate
      setTemplates((prev) => [...prev, template])
      setCreateTemplateDialogOpen(false)
      setCreateTemplateStatus("idle")
      await loadTemplates()
      setSelectedTemplateId(template.id)
    } catch (error) {
      setCreateTemplateStatus("error")
      setCreateTemplateError(error instanceof Error ? error.message : "创建审核模板失败")
    }
  }, [createTemplateForm, loadTemplates])

  const handleImportChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ""
      if (!file) return

      if (!selectedTemplateId) {
        setImportStatus("error")
        setImportMessage("请先选择审核模板")
        return
      }

      setImportStatus("uploading")
      setImportMessage(null)

      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("templateId", selectedTemplateId)

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
        await loadClauses(selectedTemplateId, undefined, selectedClause?.id ?? null)
      } catch (error) {
        setImportStatus("error")
        setImportMessage(error instanceof Error ? error.message : "导入失败，请稍后重试")
      }
    },
    [loadClauses, selectedTemplateId, selectedClause],
  )

  const handleExport = useCallback(async () => {
    setExportStatus("downloading")
    setExportError(null)
    try {
      if (!selectedTemplateId) {
        throw new Error("请先选择审核模板")
      }

      const response = await fetch(`/api/standard-clauses/export?templateId=${encodeURIComponent(selectedTemplateId)}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? `导出失败，状态码 ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const template = templates.find((item) => item.id === selectedTemplateId)
      const suffix = template?.slug || template?.name || "template"
      link.download = `standard-clauses-${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setExportStatus("idle")
    } catch (error) {
      setExportStatus("error")
      setExportError(error instanceof Error ? error.message : "导出失败，请稍后重试")
    }
  }, [selectedTemplateId, templates])

  const handleRefresh = useCallback(() => {
    loadClauses(selectedTemplateId, undefined, selectedClause?.id ?? null).catch(() => {
      setStatus("error")
      setError("加载标准条款失败")
    })
  }, [loadClauses, selectedTemplateId, selectedClause])

  const handleDeleteClause = useCallback(async () => {
    if (!selectedClause) {
      setDeleteFormStatus("error")
      setDeleteFormError("请先选择要删除的条款")
      return
    }

    setDeleteFormStatus("saving")
    setDeleteFormError(null)

    try {
      const response = await fetch("/api/standard-clauses/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clauseIds: [selectedClause.id] }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? "删除标准条款失败")
      }

      setDeleteDialogOpen(false)
      setDeleteFormStatus("idle")
      setSelectedClause(null)
      await loadClauses(selectedTemplateId)
    } catch (error) {
      setDeleteFormStatus("error")
      setDeleteFormError(error instanceof Error ? error.message : "删除标准条款失败")
    }
  }, [loadClauses, selectedClause, selectedTemplateId])

  const summary = useMemo(() => {
    const total = clauses.length
    const categoriesCount = new Set(clauses.map((clause) => clause.category)).size
    return { total, categories: categoriesCount }
  }, [clauses])

  return (
    <>
      <Dialog
        open={addClauseDialogOpen}
        onOpenChange={(open) => {
          setAddClauseDialogOpen(open)
          if (!open) {
            setAddFormStatus("idle")
            setAddFormError(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新增标准条款</DialogTitle>
            <DialogDescription>在当前模板下添加新的标准条款。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>条款类别</Label>
              <Select
                value={addFormState.categoryOption}
                onValueChange={(value) => setAddFormState((prev) => ({ ...prev, categoryOption: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择或新增类别" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_CATEGORY_VALUE}>新增类别</SelectItem>
                </SelectContent>
              </Select>
              {addFormState.categoryOption === CUSTOM_CATEGORY_VALUE && (
                <Input
                  placeholder="输入新的条款类别"
                  value={addFormState.customCategory}
                  onChange={(event) =>
                    setAddFormState((prev) => ({ ...prev, customCategory: event.target.value }))
                  }
                />
              )}
            </div>
            <div className="grid gap-2">
              <Label>条款项名称</Label>
              <Input
                placeholder="例如：争议解决与适用法"
                value={addFormState.clauseItem}
                onChange={(event) =>
                  setAddFormState((prev) => ({ ...prev, clauseItem: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>标准约定</Label>
              <Textarea
                rows={6}
                placeholder="填写标准约定的具体内容"
                value={addFormState.standard}
                onChange={(event) =>
                  setAddFormState((prev) => ({ ...prev, standard: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>风险等级说明（可选）</Label>
              <Input
                placeholder="例如：高、中、低或其他描述"
                value={addFormState.riskLevel}
                onChange={(event) =>
                  setAddFormState((prev) => ({ ...prev, riskLevel: event.target.value }))
                }
              />
            </div>
            {addFormError && <p className="text-sm text-destructive">{addFormError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddClauseDialogOpen(false)}
              disabled={addFormStatus === "saving"}
            >
              取消
            </Button>
            <Button type="button" onClick={handleAddClauseSubmit} disabled={addFormStatus === "saving"}>
              {addFormStatus === "saving" ? "保存中..." : "保存条款"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) {
            setEditFormStatus("idle")
            setEditFormError(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>修改标准条款</DialogTitle>
            <DialogDescription>
              {selectedClause ? `调整条款 "${selectedClause.clauseItem}" 的标准内容。` : "选择一个条款后可进行修改。"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>条款类别</Label>
              <Select
                value={editFormState.categoryOption}
                onValueChange={(value) => setEditFormState((prev) => ({ ...prev, categoryOption: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择或新增类别" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_CATEGORY_VALUE}>新增类别</SelectItem>
                </SelectContent>
              </Select>
              {editFormState.categoryOption === CUSTOM_CATEGORY_VALUE && (
                <Input
                  placeholder="输入新的条款类别"
                  value={editFormState.customCategory}
                  onChange={(event) =>
                    setEditFormState((prev) => ({ ...prev, customCategory: event.target.value }))
                  }
                />
              )}
            </div>
            <div className="grid gap-2">
              <Label>条款项名称</Label>
              <Input
                placeholder="例如：争议解决与适用法"
                value={editFormState.clauseItem}
                onChange={(event) =>
                  setEditFormState((prev) => ({ ...prev, clauseItem: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>标准约定</Label>
              <Textarea
                rows={6}
                placeholder="填写标准约定的具体内容"
                value={editFormState.standard}
                onChange={(event) =>
                  setEditFormState((prev) => ({ ...prev, standard: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>风险等级说明（可选）</Label>
              <Textarea
                rows={2}
                placeholder="例如：高、中、低或其他描述"
                value={editFormState.riskLevel}
                onChange={(event) =>
                  setEditFormState((prev) => ({ ...prev, riskLevel: event.target.value }))
                }
              />
            </div>
            {editFormError && <p className="text-sm text-destructive">{editFormError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={editFormStatus === "saving"}
            >
              取消
            </Button>
            <Button type="button" onClick={handleEditClauseSubmit} disabled={editFormStatus === "saving"}>
              {editFormStatus === "saving" ? "保存中..." : "保存修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setDeleteFormStatus("idle")
            setDeleteFormError(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除条款</DialogTitle>
            <DialogDescription>
              删除后将无法恢复，是否继续删除当前选中的条款？
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              条款名称：<span className="text-foreground font-medium">{selectedClause?.clauseItem ?? ""}</span>
            </p>
            <p>
              所属类别：<span className="text-foreground font-medium">{selectedClause?.category ?? ""}</span>
            </p>
            {deleteFormError && <p className="text-destructive">{deleteFormError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteFormStatus === "saving"}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteClause}
              disabled={deleteFormStatus === "saving"}
            >
              {deleteFormStatus === "saving" ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createTemplateDialogOpen}
        onOpenChange={(open) => {
          setCreateTemplateDialogOpen(open)
          if (!open) {
            setCreateTemplateStatus("idle")
            setCreateTemplateError(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新建审核模板</DialogTitle>
            <DialogDescription>创建后可在模板列表中选择并维护专属条款。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>模板名称</Label>
              <Input
                placeholder="例如：医疗设备采购模板"
                value={createTemplateForm.name}
                onChange={(event) =>
                  setCreateTemplateForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>模板描述（可选）</Label>
              <Textarea
                rows={4}
                placeholder="补充说明此模板适用的业务范围或注意事项"
                value={createTemplateForm.description}
                onChange={(event) =>
                  setCreateTemplateForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            {createTemplateError && <p className="text-sm text-destructive">{createTemplateError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateTemplateDialogOpen(false)}
              disabled={createTemplateStatus === "saving"}
            >
              取消
            </Button>
            <Button type="button" onClick={handleCreateTemplateSubmit} disabled={createTemplateStatus === "saving"}>
              {createTemplateStatus === "saving" ? "创建中..." : "创建模板"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />审核标准知识库
                </CardTitle>
                <CardDescription>导入真实条款库或下载模板，支持批量维护</CardDescription>
              </div>
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Label className="text-xs text-muted-foreground">审核模板</Label>
                <Select
                  value={selectedTemplateId ?? undefined}
                  onValueChange={(value) => setSelectedTemplateId(value)}
                  disabled={templatesStatus === "loading" || templates.length === 0}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue
                      placeholder={
                        templatesStatus === "loading"
                          ? "加载模板..."
                          : templates.length === 0
                            ? "暂无可用模板"
                            : "选择审核模板"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-1"
                  onClick={() => setCreateTemplateDialogOpen(true)}
                  disabled={templatesStatus === "loading"}
                >
                  <Layers className="h-4 w-4" /> 新建模板
                </Button>
              </div>
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
                size="sm"
                onClick={() => setAddClauseDialogOpen(true)}
                disabled={!selectedTemplateId}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> 新增条款
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => importInputRef.current?.click()}
                disabled={importStatus === "uploading" || !selectedTemplateId}
              >
                <FileUp className="mr-2 h-4 w-4" /> 导入Excel
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={
                  !selectedTemplateId ||
                  status !== "success" ||
                  clauses.length === 0 ||
                  exportStatus === "downloading"
                }
              >
                <FileDown className="mr-2 h-4 w-4" />
                {exportStatus === "downloading" ? "导出中..." : "导出Excel"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleRefresh} disabled={!selectedTemplateId}>
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
          {templatesStatus === "error" && templatesError && (
            <CardContent className="pt-0 text-sm">
              <p className="text-destructive">{templatesError}</p>
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
              {templatesStatus === "loading" && (
                <div className="py-12 text-center text-sm text-muted-foreground">正在加载审核模板...</div>
              )}
              {templatesStatus === "success" && templates.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">暂无可用的审核模板，请先创建。</div>
              )}
              {templatesStatus === "success" && templates.length > 0 && !selectedTemplateId && (
                <div className="py-12 text-center text-sm text-muted-foreground">请选择上方的审核模板以查看标准条款。</div>
              )}
              {templatesStatus === "success" && selectedTemplateId && (
                <>
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
                                        className={`w-full text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md ${isSelected ? "bg-muted" : ""
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
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>条款详情</CardTitle>
                <CardDescription>查看标准约定、最近更新时间等信息</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-1"
                  onClick={() => setEditDialogOpen(true)}
                  disabled={!selectedClause || !selectedTemplateId}
                >
                  <Pencil className="h-4 w-4" /> 编辑条款
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="inline-flex items-center gap-1"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={!selectedClause || !selectedTemplateId}
                >
                  <Trash2 className="h-4 w-4" /> 删除条款
                </Button>
              </div>
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
    </>
  )
}

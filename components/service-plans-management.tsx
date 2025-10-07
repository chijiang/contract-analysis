"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Download, Eye, Loader2, Pencil, Plus, Trash2, Upload, ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import {
  servicePlanPayloadSchema,
  type SerializedServicePlan,
  type SerializedServicePlanClause,
  type ServicePlanPayload,
} from "@/lib/service-plans"

type ClauseFormState = {
  localId: string
  category: string
  clauseItem: string
  requirement: string
  notes: string
}

type PlanFormState = {
  id?: string
  name: string
  description: string
  clauses: ClauseFormState[]
}

const createClauseForm = (overrides: Partial<ClauseFormState> = {}): ClauseFormState => ({
  localId:
    typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `clause-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  category: "",
  clauseItem: "",
  requirement: "",
  notes: "",
  ...overrides,
})

const createEmptyPlanForm = (): PlanFormState => ({
  name: "",
  description: "",
  clauses: [createClauseForm()],
})

const formatDateTime = (input: string) => new Date(input).toLocaleString()

const clauseCount = (clauses: SerializedServicePlanClause[]) => clauses.length

const mapPlanToFormState = (plan: SerializedServicePlan): PlanFormState => ({
  id: plan.id,
  name: plan.name,
  description: plan.description ?? "",
  clauses: plan.clauses.map((clause) =>
    createClauseForm({
      category: clause.category ?? "",
      clauseItem: clause.clauseItem,
      requirement: clause.requirement,
      notes: clause.notes ?? "",
    }),
  ),
})

const buildPayload = (state: PlanFormState): ServicePlanPayload => {
  const clauses = state.clauses.map((clause, index) => ({
    category: clause.category.trim() || undefined,
    clauseItem: clause.clauseItem.trim(),
    requirement: clause.requirement.trim(),
    notes: clause.notes.trim() || undefined,
    orderIndex: index,
  }))

  const payload: ServicePlanPayload = {
    name: state.name.trim(),
    description: state.description.trim() || undefined,
    clauses,
  }

  const validation = servicePlanPayloadSchema.safeParse(payload)
  if (!validation.success) {
    const issue = validation.error.issues[0]
    const message = issue ? `${issue.path.join(".")}: ${issue.message}` : "表单信息不完整"
    throw new Error(message)
  }

  return validation.data
}

export function ServicePlansManagement() {
  const [plans, setPlans] = useState<SerializedServicePlan[]>([])
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [formState, setFormState] = useState<PlanFormState>(createEmptyPlanForm())
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [detailPlan, setDetailPlan] = useState<SerializedServicePlan | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<SerializedServicePlan | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()

  const fetchPlans = useCallback(async () => {
    setStatus("loading")
    setError(null)
    try {
      const response = await fetch("/api/service-plans")
      if (!response.ok) {
        throw new Error(`加载失败：${response.status}`)
      }
      const data = (await response.json()) as SerializedServicePlan[]
      setPlans(data)
      setStatus("idle")
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "加载服务计划失败")
    }
  }, [])

  useEffect(() => {
    void fetchPlans()
  }, [fetchPlans])

  const sortedPlans = useMemo(
    () => plans.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [plans],
  )

  const resetForm = () => {
    setFormState(createEmptyPlanForm())
    setFormError(null)
  }

  const openCreateDialog = () => {
    setFormMode("create")
    resetForm()
    setFormOpen(true)
  }

  const openEditDialog = (plan: SerializedServicePlan) => {
    setFormMode("edit")
    setFormState(mapPlanToFormState(plan))
    setFormError(null)
    setFormOpen(true)
  }

  const handleClauseChange =
    (index: number, field: keyof Omit<ClauseFormState, "localId">) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value
      setFormState((prev) => {
        const clauses = [...prev.clauses]
        clauses[index] = { ...clauses[index], [field]: value }
        return { ...prev, clauses }
      })
    }

  const handleAddClause = () => {
    setFormState((prev) => ({ ...prev, clauses: [...prev.clauses, createClauseForm()] }))
  }

  const handleRemoveClause = (index: number) => {
    setFormState((prev) => {
      const clauses = prev.clauses.filter((_, idx) => idx !== index)
      return { ...prev, clauses }
    })
  }

  const handleMoveClause = (index: number, direction: "up" | "down") => {
    setFormState((prev) => {
      const clauses = [...prev.clauses]
      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= clauses.length) {
        return prev
      }
      ;[clauses[index], clauses[targetIndex]] = [clauses[targetIndex], clauses[index]]
      return { ...prev, clauses }
    })
  }

  const handleFormSubmit = async () => {
    setFormSubmitting(true)
    setFormError(null)
    try {
      const payload = buildPayload(formState)
      const endpoint =
        formMode === "create" ? "/api/service-plans" : `/api/service-plans/${formState.id}`
      const response = await fetch(endpoint, {
        method: formMode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(data?.message ?? "保存失败")
      }

      setFormOpen(false)
      resetForm()
      await fetchPlans()
      toast({ description: formMode === "create" ? "服务计划已创建" : "服务计划已更新" })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "保存失败")
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteSubmitting(true)
    try {
      const response = await fetch(`/api/service-plans/${deleteTarget.id}`, { method: "DELETE" })
      if (!response.ok && response.status !== 204) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(data?.message ?? "删除失败")
      }

      setDeleteTarget(null)
      await fetchPlans()
      toast({ description: "服务计划已删除" })
    } catch (err) {
      toast({ description: err instanceof Error ? err.message : "删除失败", variant: "destructive" })
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch("/api/service-plans/export")
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(data?.message ?? "导出失败")
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `service-plans-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast({ description: "导出完成" })
    } catch (err) {
      toast({ description: err instanceof Error ? err.message : "导出失败", variant: "destructive" })
    } finally {
      setExporting(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/service-plans/import", {
        method: "POST",
        body: formData,
      })

      const data = (await response.json().catch(() => null)) as
        | { message?: string; errors?: string[]; created?: number; updated?: number }
        | null

      if (!response.ok) {
        throw new Error(data?.message ?? "导入失败")
      }

      await fetchPlans()
      toast({
        description: `导入完成：新增 ${data?.created ?? 0} 条，更新 ${data?.updated ?? 0} 条`,
      })

      if (data?.errors && data.errors.length > 0) {
        console.warn("导入时部分条目失败", data.errors)
        toast({
          description: `部分条目导入失败，共 ${data.errors.length} 条，请检查日志。`,
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({ description: err instanceof Error ? err.message : "导入失败", variant: "destructive" })
    } finally {
      setImporting(false)
      event.target.value = ""
    }
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleImportChange}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-xl">Service Plans</CardTitle>
            <CardDescription>维护与合同条款同构的标准服务条款，便于匹配合适的合同模版。</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || status === "loading"}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              导出
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportClick} disabled={importing || status === "loading"}>
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              导入
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              新建
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {status === "loading" && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              正在加载...
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <p>{error ?? "加载失败"}</p>
              <Button variant="outline" size="sm" onClick={() => fetchPlans()}>
                重试
              </Button>
            </div>
          )}

          {status === "idle" && sortedPlans.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <p>尚未创建任何服务计划</p>
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                新建服务计划
              </Button>
            </div>
          )}

          {status === "idle" && sortedPlans.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead className="w-[120px] text-center">条款数</TableHead>
                    <TableHead className="w-[180px]">更新时间</TableHead>
                    <TableHead className="w-[160px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {plan.description ? plan.description : <span className="text-sm text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{clauseCount(plan.clauses)}</Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(plan.updatedAt)}</TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setDetailPlan(plan)}>
                          <Eye className="mr-2 h-4 w-4" />
                          查看
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(plan)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(plan)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={(next) => (next ? setFormOpen(true) : setFormOpen(false))}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{formMode === "create" ? "新建服务计划" : "编辑服务计划"}</DialogTitle>
            <DialogDescription>填写服务计划基本信息以及条款说明。</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">名称</Label>
              <Input
                id="plan-name"
                placeholder="例如：智优保"
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-description">描述（选填）</Label>
              <Textarea
                id="plan-description"
                placeholder="用于辅助识别或备注的说明"
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>服务条款</Label>
                  <p className="text-sm text-muted-foreground">
                    与合同审核条款一一对应，支持自定义分类与条目名称。
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddClause}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加条款
                </Button>
              </div>

              {formState.clauses.length === 0 && (
                <Card>
                  <CardContent className="py-6 text-sm text-muted-foreground">
                    尚未添加条款，请点击“添加条款”按钮。
                  </CardContent>
                </Card>
              )}

              {formState.clauses.map((clause, index) => (
                <Card key={clause.localId}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">条款 {index + 1}</CardTitle>
                      <CardDescription>
                        用于匹配合同中的对应条目，可填写分类 + 条目名称 + 具体要求。
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveClause(index, "up")}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveClause(index, "down")}
                        disabled={index === formState.clauses.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleRemoveClause(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>分类（选填）</Label>
                        <Input
                          placeholder="如：服务SLA / 备件保障"
                          value={clause.category}
                          onChange={handleClauseChange(index, "category")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>条目名称</Label>
                        <Input
                          placeholder="例如：到场响应时间"
                          value={clause.clauseItem}
                          onChange={handleClauseChange(index, "clauseItem")}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>条款要求</Label>
                      <Textarea
                        placeholder="示例：现场工程师需在报修后2小时内到场，提供7x24电话支持"
                        value={clause.requirement}
                        onChange={handleClauseChange(index, "requirement")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>备注（选填）</Label>
                      <Textarea
                        placeholder="补充说明或匹配提示"
                        value={clause.notes}
                        onChange={handleClauseChange(index, "notes")}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={formSubmitting}>
              取消
            </Button>
            <Button onClick={handleFormSubmit} disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {formMode === "create" ? "创建" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailPlan !== null} onOpenChange={(next) => (next ? null : setDetailPlan(null))}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detailPlan?.name ?? "服务计划详情"}</DialogTitle>
            <DialogDescription>
              {detailPlan?.description ? detailPlan.description : "当前服务计划的条款列表。"}
            </DialogDescription>
          </DialogHeader>

          {detailPlan && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                最近更新：{formatDateTime(detailPlan.updatedAt)}
              </div>

              {detailPlan.clauses.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-sm text-muted-foreground">尚未配置条款。</CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {detailPlan.clauses.map((clause, index) => (
                    <Card key={clause.id}>
                      <CardHeader className="space-y-1">
                        <CardTitle className="text-base">
                          {index + 1}. {clause.clauseItem}
                        </CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-2">
                          {clause.category && <Badge variant="secondary">{clause.category}</Badge>}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-xs uppercase text-muted-foreground">条款要求</Label>
                          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{clause.requirement}</p>
                        </div>
                        {clause.notes && (
                          <div>
                            <Label className="text-xs uppercase text-muted-foreground">备注</Label>
                            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                              {clause.notes}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => (open ? null : setDeleteTarget(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除服务计划？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复，该计划下的所有条款会一并删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSubmitting}
            >
              {deleteSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

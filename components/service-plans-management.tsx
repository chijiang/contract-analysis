"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import {
  MODULE_STATUS_OPTIONS,
  MODALITY_OPTIONS,
  SERVICE_MODULE_TYPES,
  type ServiceModuleType,
  type SerializedServicePlan,
  type SerializedServicePlanModule,
  type SerializedServiceModuleTemplate,
} from "@/lib/service-plans"
import { planModuleSelectionSchema, type PlanModuleSelection } from "@/lib/service-plan-modules"
import {
  SERVICE_MODULE_FORM_CONFIG,
  createDefaultModuleFormValues,
  formValuesToModulePayload,
  modulePayloadToFormValues,
  type ModuleFormValues,
} from "@/lib/service-module-form-config"
import { Download, Loader2, Pencil, Plus, RefreshCw, Trash2, Upload } from "lucide-react"

const MODULE_TITLES: Record<ServiceModuleType, string> = {
  responseArrival: "现场维修服务SLA",
  yearlyMaintenance: "年度保养",
  remoteMaintenance: "远程维护",
  detectorEcg: "探测器/ECG 保修",
  training: "培训服务",
  uptime: "开机率保障",
}

const MODULE_DESCRIPTIONS: Record<ServiceModuleType, string> = {
  responseArrival: "响应时间、到场时间、升级链、支持渠道等",
  yearlyMaintenance: "年度保养频次与覆盖范围",
  remoteMaintenance: "远程平台、监测频次、远程PM",
  detectorEcg: "备件保修策略、物流责任、时效",
  training: "培训类型、场次/席位、差旅政策",
  uptime: "开机率目标、统计窗口、补偿机制",
}

type PlanModuleForm = {
  localId: string
  type: ServiceModuleType
  templateId: string | null
  status: string
  overridesText: string
  isDefault: boolean
}

type PlanFormState = {
  id?: string
  name: string
  termMonths: string
  sitesInput: string
  metadataInput: string
  modalities: string[]
  modules: PlanModuleForm[]
}

type TemplatePayloadMode = "form" | "json"

type TemplateFormState = {
  id: string
  type: ServiceModuleType
  name: string
  status: string
  payloadMode: TemplatePayloadMode
  payloadText: string
  payloadFormValues: ModuleFormValues
  notes: string
}

const createPlanModuleForm = (
  type: ServiceModuleType,
  overrides: Partial<Omit<PlanModuleForm, "localId" | "type">> = {},
  options?: { localId?: string },
): PlanModuleForm => ({
  localId:
    options?.localId ??
    (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `module-${Date.now()}-${Math.random().toString(16).slice(2)}`),
  type,
  templateId: null,
  status: "included",
  overridesText: "",
  isDefault: type === "responseArrival",
  ...overrides,
})

const createEmptyPlanForm = (): PlanFormState => ({
  name: "",
  termMonths: "",
  sitesInput: "",
  metadataInput: "",
  modalities: [],
  modules: SERVICE_MODULE_TYPES.map((type) =>
    createPlanModuleForm(type, { isDefault: type === "responseArrival" }),
  ),
})

const defaultTemplateType = SERVICE_MODULE_TYPES[0] as ServiceModuleType
const UNSELECTED_TEMPLATE_VALUE = "__UNSELECTED__"

const createTemplateFormState = (type: ServiceModuleType = defaultTemplateType): TemplateFormState => ({
  id: "",
  type,
  name: "",
  status: "included",
  payloadMode: "form",
  payloadText: "",
  payloadFormValues: createDefaultModuleFormValues(type),
  notes: "",
})

const formatDateTime = (value: string) => new Date(value).toLocaleString()

const stringifyJson = (value: unknown) => {
  if (value === undefined || value === null) return ""
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value)
  }
}

const parseJsonUnsafe = (value: string, fieldLabel: string) => {
  if (!value.trim()) {
    return undefined
  }
  try {
    return JSON.parse(value)
  } catch (error) {
    throw new Error(`${fieldLabel} 不是合法的 JSON`)
  }
}

export function ServicePlansManagement() {
  const [tab, setTab] = useState("plans")
  const [plans, setPlans] = useState<SerializedServicePlan[]>([])
  const [planStatus, setPlanStatus] = useState<"idle" | "loading" | "error">("idle")
  const [planError, setPlanError] = useState<string | null>(null)

  const [templates, setTemplates] = useState<SerializedServiceModuleTemplate[]>([])
  const [templateStatus, setTemplateStatus] = useState<"idle" | "loading" | "error">("idle")
  const [templateError, setTemplateError] = useState<string | null>(null)

  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [planFormMode, setPlanFormMode] = useState<"create" | "edit">("create")
  const [planFormState, setPlanFormState] = useState<PlanFormState>(createEmptyPlanForm())
  const [newModuleType, setNewModuleType] = useState<ServiceModuleType>(SERVICE_MODULE_TYPES[0])
  const [planSubmitting, setPlanSubmitting] = useState(false)
  const [planSubmitError, setPlanSubmitError] = useState<string | null>(null)
  const [planToDelete, setPlanToDelete] = useState<SerializedServicePlan | null>(null)

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateFormMode, setTemplateFormMode] = useState<"create" | "edit">("create")
  const [templateFormState, setTemplateFormState] = useState<TemplateFormState>(createTemplateFormState())
  const [templateSubmitting, setTemplateSubmitting] = useState(false)
  const [templateSubmitError, setTemplateSubmitError] = useState<string | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<SerializedServiceModuleTemplate | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()

  const fetchPlans = useCallback(async () => {
    setPlanStatus("loading")
    setPlanError(null)
    try {
      const response = await fetch("/api/service-plans")
      if (!response.ok) {
        throw new Error(`加载失败：${response.status}`)
      }
      const data = (await response.json()) as SerializedServicePlan[]
      setPlans(data)
      setPlanStatus("idle")
    } catch (error) {
      setPlanStatus("error")
      setPlanError(error instanceof Error ? error.message : "加载服务计划失败")
    }
  }, [])

  const fetchTemplates = useCallback(async () => {
    setTemplateStatus("loading")
    setTemplateError(null)
    try {
      const response = await fetch("/api/service-modules")
      if (!response.ok) {
        throw new Error(`加载失败：${response.status}`)
      }
      const data = (await response.json()) as SerializedServiceModuleTemplate[]
      setTemplates(data)
      setTemplateStatus("idle")
    } catch (error) {
      setTemplateStatus("error")
      setTemplateError(error instanceof Error ? error.message : "加载服务模块失败")
    }
  }, [])

  const addPlanModule = useCallback((type: ServiceModuleType) => {
    setPlanFormState((prev) => {
      const next = [...prev.modules]
      const lastIndex = next.reduce((last, item, idx) => (item.type === type ? idx : last), -1)
      const insertIndex = lastIndex >= 0 ? lastIndex + 1 : next.length
      next.splice(insertIndex, 0, createPlanModuleForm(type, { isDefault: false }))
      return { ...prev, modules: next }
    })
  }, [])

  const removePlanModule = useCallback((localId: string) => {
    setPlanFormState((prev) => {
      const next = prev.modules.filter((item) => item.localId !== localId)
      if (next.length === prev.modules.length) {
        return prev
      }
      return { ...prev, modules: next }
    })
  }, [])

  useEffect(() => {
    void fetchPlans()
    void fetchTemplates()
  }, [fetchPlans, fetchTemplates])

  const openCreatePlan = () => {
    setPlanFormMode("create")
    setPlanFormState(createEmptyPlanForm())
    setNewModuleType(SERVICE_MODULE_TYPES[0])
    setPlanSubmitError(null)
    setPlanDialogOpen(true)
  }

  const openEditPlan = (plan: SerializedServicePlan) => {
    const modulesFromPlan = plan.modules.map((module) =>
      createPlanModuleForm(
        module.type,
        {
          templateId: module.templateId,
          status: module.status ?? module.templateStatus ?? "included",
          overridesText: stringifyJson(module.overrides ?? undefined),
          isDefault: module.isDefault,
        },
        { localId: module.id },
      ),
    )

    const existingTypes = new Set(modulesFromPlan.map((module) => module.type))
    SERVICE_MODULE_TYPES.forEach((type) => {
      if (!existingTypes.has(type)) {
        modulesFromPlan.push(createPlanModuleForm(type, { isDefault: type === "responseArrival" }))
      }
    })

    const next: PlanFormState = {
      id: plan.id,
      name: plan.name,
      termMonths: plan.termMonths ? String(plan.termMonths) : "",
      sitesInput: plan.sites.join(", "),
      metadataInput: stringifyJson(plan.metadata),
      modalities: plan.modalities,
      modules: modulesFromPlan,
    }

    setPlanFormMode("edit")
    setPlanFormState(next)
    setNewModuleType(SERVICE_MODULE_TYPES[0])
    setPlanSubmitError(null)
    setPlanDialogOpen(true)
  }

  const handleSubmitPlan = async () => {
    setPlanSubmitError(null)

    try {
      const termMonths = planFormState.termMonths.trim()
      const termValue = termMonths ? Number.parseInt(termMonths, 10) : null
      if (termValue !== null && (Number.isNaN(termValue) || termValue <= 0)) {
        throw new Error("合同期（月）必须是正整数")
      }

      const metadata = parseJsonUnsafe(planFormState.metadataInput, "扩展元数据")
      const modulesPayload: PlanModuleSelection[] = planFormState.modules
        .filter((module) => module.templateId)
        .map((module, index) => {
          const overrides = parseJsonUnsafe(module.overridesText, `${MODULE_TITLES[module.type]} 覆写内容`)
          return planModuleSelectionSchema.parse({
            templateId: module.templateId,
            status: module.status,
            overrides: overrides ?? undefined,
            isDefault: module.isDefault,
            orderIndex: index,
          })
        })

      if (modulesPayload.length === 0) {
        throw new Error("请至少为一个服务模块选择条款")
      }

      const payload = {
        name: planFormState.name,
        termMonths: termValue,
        sites: planFormState.sitesInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        modalities: planFormState.modalities,
        metadata: metadata ?? undefined,
        modules: modulesPayload,
      }

      const endpoint = planFormMode === "create" ? "/api/service-plans" : `/api/service-plans/${planFormState.id}`
      const method = planFormMode === "create" ? "POST" : "PATCH"

      setPlanSubmitting(true)
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(data?.message ?? "提交失败")
      }

      setPlanDialogOpen(false)
      toast({ title: planFormMode === "create" ? "已创建服务计划" : "已更新服务计划" })
      await fetchPlans()
    } catch (error) {
      setPlanSubmitError(error instanceof Error ? error.message : "提交失败")
    } finally {
      setPlanSubmitting(false)
    }
  }

  const handleDeletePlan = async () => {
    if (!planToDelete) return
    try {
      const response = await fetch(`/api/service-plans/${planToDelete.id}`, { method: "DELETE" })
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(data?.message ?? "删除失败")
      }
      toast({ title: "已删除服务计划" })
      setPlanToDelete(null)
      await fetchPlans()
    } catch (error) {
      toast({
        title: "删除服务计划失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      })
    }
  }

  const planSummary = useMemo(
    () =>
      plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        modalities: plan.modalities,
        moduleCount: plan.modules.length,
        updatedAt: plan.updatedAt,
      })),
    [plans],
  )

  const groupedTemplates = useMemo(() => {
    return SERVICE_MODULE_TYPES.reduce<Record<ServiceModuleType, SerializedServiceModuleTemplate[]>>((acc, type) => {
      acc[type] = templates.filter((template) => template.type === type)
      return acc
    }, {
      responseArrival: [],
      yearlyMaintenance: [],
      remoteMaintenance: [],
      detectorEcg: [],
      training: [],
      uptime: [],
    })
  }, [templates])

  const currentTemplateConfig = useMemo(
    () => SERVICE_MODULE_FORM_CONFIG[templateFormState.type],
    [templateFormState.type],
  )

  const openCreateTemplate = () => {
    setTemplateFormMode("create")
    setTemplateFormState(createTemplateFormState())
    setTemplateSubmitError(null)
    setTemplateDialogOpen(true)
  }

  const openEditTemplate = (template: SerializedServiceModuleTemplate) => {
    setTemplateFormMode("edit")
    const formValues = modulePayloadToFormValues(template.type, template.payload)
    setTemplateFormState({
      id: template.id,
      type: template.type,
      name: template.name,
      status: template.status,
      payloadMode: formValues ? "form" : "json",
      payloadFormValues: formValues ?? createDefaultModuleFormValues(template.type),
      payloadText: stringifyJson(template.payload),
      notes: template.notes ?? "",
    })
    setTemplateSubmitError(null)
    setTemplateDialogOpen(true)
  }

  const handleTogglePayloadMode = () => {
    setTemplateSubmitError(null)
    if (templateFormState.payloadMode === "form") {
      let nextText = templateFormState.payloadText
      try {
        const draftPayload = formValuesToModulePayload(templateFormState.type, templateFormState.payloadFormValues, {
          strict: false,
        })
        nextText = stringifyJson(draftPayload)
      } catch (error) {
        nextText = stringifyJson(templateFormState.payloadFormValues)
        console.error("Failed to build JSON from form values", error)
      }
      setTemplateFormState((prev) => ({ ...prev, payloadMode: "json", payloadText: nextText }))
      return
    }

    try {
      const parsed = parseJsonUnsafe(templateFormState.payloadText, "模块条款 JSON") ?? {}
      const values = modulePayloadToFormValues(templateFormState.type, parsed)
      if (!values) {
        throw new Error("当前 JSON 无法转换为表单，请检查字段结构")
      }
      setTemplateFormState((prev) => ({ ...prev, payloadMode: "form", payloadFormValues: values }))
    } catch (error) {
      setTemplateSubmitError(error instanceof Error ? error.message : "无法将 JSON 转换为表单，请检查格式")
    }
  }

  const handleSubmitTemplate = async () => {
    try {
      setTemplateSubmitError(null)
      const payloadData =
        templateFormState.payloadMode === "form"
          ? formValuesToModulePayload(templateFormState.type, templateFormState.payloadFormValues)
          : parseJsonUnsafe(templateFormState.payloadText, "模块条款 JSON") ?? {}
      const payload = {
        type: templateFormState.type,
        name: templateFormState.name,
        status: templateFormState.status,
        payload: payloadData,
        notes: templateFormState.notes.trim() || undefined,
      }

      const endpoint =
        templateFormMode === "create"
          ? "/api/service-modules"
          : `/api/service-modules/${templateFormState.id}`
      const method = templateFormMode === "create" ? "POST" : "PATCH"

      setTemplateSubmitting(true)
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(data?.message ?? "提交失败")
      }

      setTemplateDialogOpen(false)
      toast({ title: templateFormMode === "create" ? "已创建服务模块" : "已更新服务模块" })
      await fetchTemplates()
    } catch (error) {
      setTemplateSubmitError(error instanceof Error ? error.message : "提交失败")
    } finally {
      setTemplateSubmitting(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return
    try {
      const response = await fetch(`/api/service-modules/${templateToDelete.id}`, { method: "DELETE" })
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(data?.message ?? "删除失败")
      }
      toast({ title: "已删除服务模块" })
      setTemplateToDelete(null)
      await fetchTemplates()
    } catch (error) {
      toast({
        title: "删除服务模块失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      })
    }
  }

  const handleExportPlans = async () => {
    try {
      const response = await fetch("/api/service-plans/export")
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? "导出失败")
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
    } catch (error) {
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      })
    }
  }

  const handleImportPlans = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/service-plans/import", { method: "POST", body: formData })
      const data = (await response.json().catch(() => null)) as { message?: string; errors?: string[] } | null
      if (!response.ok) {
        throw new Error(data?.message ?? "导入失败")
      }
      toast({
        title: "导入完成",
        description: data?.errors && data.errors.length > 0 ? data.errors.slice(0, 3).join("；") : undefined,
      })
      await fetchPlans()
    } catch (error) {
      toast({
        title: "导入服务计划失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">服务条款管理</h1>
            <p className="text-muted-foreground">集中维护服务计划与服务模块模板，支持模板复用与批量操作</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportPlans} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> 导入计划
            </Button>
            <Button variant="outline" onClick={handleExportPlans}>
              <Download className="mr-2 h-4 w-4" /> 导出计划
            </Button>
            <Button variant="outline" onClick={() => fetchPlans()}>
              <RefreshCw className="mr-2 h-4 w-4" /> 刷新
            </Button>
            <Button onClick={openCreatePlan}>
              <Plus className="mr-2 h-4 w-4" /> 新建服务计划
            </Button>
          </div>
        </div>

        <TabsList className="mt-4">
          <TabsTrigger value="plans">服务计划</TabsTrigger>
          <TabsTrigger value="modules">服务项库</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>服务计划列表</CardTitle>
              <CardDescription>查看和维护各类服务方案，支持模板化条款引用</CardDescription>
            </CardHeader>
            <CardContent>
              {planStatus === "error" && planError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {planError}
                </div>
              ) : null}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>服务计划</TableHead>
                      <TableHead>适配机型</TableHead>
                      <TableHead>服务模块</TableHead>
                      <TableHead>最近更新</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planSummary.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          {planStatus === "loading" ? "加载中..." : "暂无服务计划"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      planSummary.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium">{plan.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {plan.modalities.length === 0 ? (
                                <Badge variant="outline">未指定</Badge>
                              ) : (
                                plan.modalities.map((modality) => (
                                  <Badge key={modality} variant="secondary">
                                    {modality}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{plan.moduleCount} 项</TableCell>
                          <TableCell>{formatDateTime(plan.updatedAt)}</TableCell>
                          <TableCell className="space-x-2 text-right">
                            <Button variant="outline" size="sm" onClick={() => openEditPlan(plans.find((item) => item.id === plan.id)!)}>
                              <Pencil className="mr-1 h-4 w-4" /> 编辑
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setPlanToDelete(plans.find((item) => item.id === plan.id)!)}>
                              <Trash2 className="mr-1 h-4 w-4" /> 删除
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>服务项库</CardTitle>
                <CardDescription>维护可复用的服务条款模板，服务计划可引用复用</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => fetchTemplates()}>
                  <RefreshCw className="mr-2 h-4 w-4" /> 刷新
                </Button>
                <Button onClick={openCreateTemplate}>
                  <Plus className="mr-2 h-4 w-4" /> 新建服务项
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {templateStatus === "error" && templateError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {templateError}
                </div>
              ) : null}
              {SERVICE_MODULE_TYPES.map((type) => {
                const items = groupedTemplates[type]
                return (
                  <div key={type} className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold">{MODULE_TITLES[type]}</h3>
                      <p className="text-sm text-muted-foreground">{MODULE_DESCRIPTIONS[type]}</p>
                    </div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>名称</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>引用次数</TableHead>
                            <TableHead>更新时间</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                                暂无模板
                              </TableCell>
                            </TableRow>
                          ) : (
                            items.map((template) => (
                              <TableRow key={template.id}>
                                <TableCell className="font-medium">{template.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{template.status}</Badge>
                                </TableCell>
                                <TableCell>{template.usageCount}</TableCell>
                                <TableCell>{formatDateTime(template.updatedAt)}</TableCell>
                                <TableCell className="space-x-2 text-right">
                                  <Button variant="outline" size="sm" onClick={() => openEditTemplate(template)}>
                                    <Pencil className="mr-1 h-4 w-4" /> 编辑
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={template.usageCount > 0}
                                    onClick={() => setTemplateToDelete(template)}
                                  >
                                    <Trash2 className="mr-1 h-4 w-4" /> 删除
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{planFormMode === "create" ? "新建服务计划" : "编辑服务计划"}</DialogTitle>
            <DialogDescription>
              {planFormMode === "create" ? "创建一个新的服务计划，包含多个服务模块" : "编辑现有服务计划的配置信息"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="plan-name">服务计划名称</Label>
                <Input
                  id="plan-name"
                  value={planFormState.name}
                  onChange={(event) => setPlanFormState((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="plan-term">合同期（月）</Label>
                <Input
                  id="plan-term"
                  value={planFormState.termMonths}
                  onChange={(event) => setPlanFormState((prev) => ({ ...prev, termMonths: event.target.value }))}
                  placeholder="如：36"
                />
              </div>
              <div>
                <Label>适用院区 / 站点</Label>
                <Input
                  value={planFormState.sitesInput}
                  onChange={(event) => setPlanFormState((prev) => ({ ...prev, sitesInput: event.target.value }))}
                  placeholder="使用逗号分隔"
                />
              </div>
              <div>
                <Label>适配机型</Label>
                <div className="flex flex-wrap gap-2 pt-2">
                  {MODALITY_OPTIONS.map((modality) => {
                    const selected = planFormState.modalities.includes(modality)
                    return (
                      <Button
                        key={modality}
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        onClick={() =>
                          setPlanFormState((prev) => ({
                            ...prev,
                            modalities: selected
                              ? prev.modalities.filter((item) => item !== modality)
                              : [...prev.modalities, modality],
                          }))
                        }
                      >
                        {modality}
                      </Button>
                    )
                  })}
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>扩展元数据 (JSON)</Label>
                <Textarea
                  value={planFormState.metadataInput}
                  onChange={(event) => setPlanFormState((prev) => ({ ...prev, metadataInput: event.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-semibold">模块选择</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={newModuleType} onValueChange={(value: ServiceModuleType) => setNewModuleType(value)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="选择模块类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_MODULE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {MODULE_TITLES[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={() => addPlanModule(newModuleType)}>
                    <Plus className="mr-1 h-4 w-4" /> 添加模块
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                {planFormState.modules.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    暂无模块，请通过上方按钮添加
                  </div>
                ) : (
                  planFormState.modules.map((module, index) => {
                    const availableTemplates = groupedTemplates[module.type]
                    const selectedTemplate = module.templateId
                      ? availableTemplates.find((item) => item.id === module.templateId) ?? null
                      : null
                    const typeModules = planFormState.modules.filter((item) => item.type === module.type)
                    const typeIndex = typeModules.findIndex((item) => item.localId === module.localId)
                    return (
                      <div key={module.localId} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="text-base font-medium">{MODULE_TITLES[module.type]}</div>
                              {typeModules.length > 1 ? (
                                <Badge variant="outline">第 {typeIndex + 1} 个</Badge>
                              ) : null}
                            </div>
                            <div className="text-sm text-muted-foreground">{MODULE_DESCRIPTIONS[module.type]}</div>
                          </div>
                          <div className="flex flex-col gap-2 md:w-[320px]">
                            <div className="flex items-center gap-2">
                              <Select
                                value={module.templateId ?? UNSELECTED_TEMPLATE_VALUE}
                                onValueChange={(value) =>
                                  setPlanFormState((prev) => ({
                                    ...prev,
                                    modules: prev.modules.map((item, idx) =>
                                      idx === index
                                        ? {
                                            ...item,
                                            templateId: value === UNSELECTED_TEMPLATE_VALUE ? null : value,
                                            status:
                                              value === UNSELECTED_TEMPLATE_VALUE
                                                ? item.status
                                                : availableTemplates.find((tpl) => tpl.id === value)?.status ?? item.status,
                                          }
                                        : item,
                                    ),
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="选择服务模板" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={UNSELECTED_TEMPLATE_VALUE}>未选择</SelectItem>
                                  {availableTemplates.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                      {template.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removePlanModule(module.localId)}
                                disabled={planFormState.modules.length <= 1}
                                title="删除模块"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            {selectedTemplate ? (
                              <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline">模板状态：{selectedTemplate.status}</Badge>
                                  <Badge variant="outline">引用次数：{selectedTemplate.usageCount}</Badge>
                                </div>
                                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">
                                  {JSON.stringify(selectedTemplate.payload, null, 2)}
                                </pre>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div>
                            <Label>状态覆写</Label>
                            <Select
                              value={module.status}
                              onValueChange={(value) =>
                                setPlanFormState((prev) => ({
                                  ...prev,
                                  modules: prev.modules.map((item, idx) =>
                                    idx === index
                                      ? {
                                          ...item,
                                          status: value,
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="使用模板状态" />
                              </SelectTrigger>
                              <SelectContent>
                                {MODULE_STATUS_OPTIONS.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2 pt-6">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={module.isDefault}
                              onChange={(event) =>
                                setPlanFormState((prev) => ({
                                  ...prev,
                                  modules: prev.modules.map((item, idx) =>
                                    idx === index
                                      ? {
                                          ...item,
                                          isDefault: event.target.checked,
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            />
                            <span className="text-sm text-muted-foreground">设为默认选项（部分模块可忽略）</span>
                          </div>
                          <div className="md:col-span-2">
                            <Label>覆写 JSON（可选）</Label>
                            <Textarea
                              value={module.overridesText}
                              onChange={(event) =>
                                setPlanFormState((prev) => ({
                                  ...prev,
                                  modules: prev.modules.map((item, idx) =>
                                    idx === index
                                      ? {
                                          ...item,
                                          overridesText: event.target.value,
                                        }
                                      : item,
                                  ),
                                }))
                              }
                              placeholder="仅保留需要与模板差异的字段"
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
            {planSubmitError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {planSubmitError}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)} disabled={planSubmitting}>
              取消
            </Button>
            <Button onClick={handleSubmitPlan} disabled={planSubmitting}>
              {planSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {planFormMode === "create" ? "创建服务计划" : "保存修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!planToDelete} onOpenChange={(open) => (!open ? setPlanToDelete(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除服务计划？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作会删除“{planToDelete?.name}”及其关联配置，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeletePlan}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{templateFormMode === "create" ? "新建服务模块" : "编辑服务模块"}</DialogTitle>
            <DialogDescription>
              {templateFormMode === "create" ? "创建一个新的服务模块模板，可在服务计划中复用" : "编辑现有服务模块的配置参数"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>模块类型</Label>
                <Select
                  value={templateFormState.type}
                  onValueChange={(value: ServiceModuleType) =>
                    setTemplateFormState((prev) => ({
                      ...prev,
                      type: value,
                      payloadMode: "form",
                      payloadFormValues: createDefaultModuleFormValues(value),
                      payloadText: "",
                    }))
                  }
                  disabled={templateFormMode === "edit"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_MODULE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {MODULE_TITLES[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>默认状态</Label>
                <Select
                  value={templateFormState.status}
                  onValueChange={(value) => setTemplateFormState((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>名称</Label>
                <Input
                  value={templateFormState.name}
                  onChange={(event) => setTemplateFormState((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label>条款内容</Label>
                  <Button variant="ghost" size="sm" type="button" onClick={handleTogglePayloadMode}>
                    {templateFormState.payloadMode === "form" ? "使用 JSON 编辑" : "返回表单模式"}
                  </Button>
                </div>
                {templateFormState.payloadMode === "form" ? (
                  <div className="space-y-4 rounded-md border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">{currentTemplateConfig.summary}</p>
                    <div className="space-y-3">
                      {currentTemplateConfig.fields.map((field) => {
                        const rawValue = templateFormState.payloadFormValues[field.key]
                        if (field.type === "checkbox") {
                          return (
                            <label key={field.key} className="flex items-start gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4"
                                checked={Boolean(rawValue)}
                                onChange={(event) =>
                                  setTemplateFormState((prev) => ({
                                    ...prev,
                                    payloadFormValues: {
                                      ...prev.payloadFormValues,
                                      [field.key]: event.target.checked,
                                    },
                                  }))
                                }
                              />
                              <span>
                                <span className="font-medium">{field.label}</span>
                                {field.description ? (
                                  <span className="block text-muted-foreground">{field.description}</span>
                                ) : null}
                              </span>
                            </label>
                          )
                        }

                        if (field.type === "textarea") {
                          return (
                            <div key={field.key} className="space-y-1">
                              <Label className="text-sm font-medium">{field.label}</Label>
                              <Textarea
                                value={typeof rawValue === "string" ? rawValue : ""}
                                onChange={(event) =>
                                  setTemplateFormState((prev) => ({
                                    ...prev,
                                    payloadFormValues: {
                                      ...prev.payloadFormValues,
                                      [field.key]: event.target.value,
                                    },
                                  }))
                                }
                                placeholder={field.placeholder}
                                rows={3}
                              />
                              {field.description ? (
                                <p className="text-xs text-muted-foreground">{field.description}</p>
                              ) : null}
                            </div>
                          )
                        }

                        if (field.type === "multiselect") {
                          if (!field.options) {
                            return null
                          }
                          const selectedValues = Array.isArray(rawValue) ? rawValue : []
                          return (
                            <div key={field.key} className="space-y-1">
                              <Label className="text-sm font-medium">{field.label}</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    role="combobox"
                                    className="flex w-full items-center justify-between h-auto min-h-[36px] px-3 py-2 text-sm border border-input bg-transparent rounded-md shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <div className="flex flex-wrap gap-1">
                                      {selectedValues.length === 0 ? (
                                        <span className="text-muted-foreground">{field.placeholder}</span>
                                      ) : (
                                        selectedValues.map((value) => (
                                          <Badge key={value} variant="secondary" className="text-xs">
                                            {value}
                                          </Badge>
                                        ))
                                      )}
                                    </div>
                                    <div className="ml-2 h-4 w-4 shrink-0 opacity-50">
                                      ▼
                                    </div>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder={`搜索${field.label}...`} />
                                    <CommandEmpty>未找到选项</CommandEmpty>
                                    <CommandGroup>
                                      {field.options.map((option) => {
                                        const isSelected = selectedValues.includes(option)
                                        return (
                                          <CommandItem
                                            key={option}
                                            onSelect={() => {
                                              const newValues = isSelected
                                                ? selectedValues.filter((v) => v !== option)
                                                : [...selectedValues, option]
                                              setTemplateFormState((prev) => ({
                                                ...prev,
                                                payloadFormValues: {
                                                  ...prev.payloadFormValues,
                                                  [field.key]: newValues,
                                                },
                                              }))
                                            }}
                                          >
                                            <Checkbox
                                              checked={isSelected}
                                              className="mr-2"
                                            />
                                            {option}
                                          </CommandItem>
                                        )
                                      })}
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              {field.description ? (
                                <p className="text-xs text-muted-foreground">{field.description}</p>
                              ) : null}
                            </div>
                          )
                        }

                        return (
                          <div key={field.key} className="space-y-1">
                            <Label className="text-sm font-medium">{field.label}</Label>
                            <Input
                              type={field.type === "number" ? "number" : "text"}
                              value={typeof rawValue === "string" ? rawValue : ""}
                              onChange={(event) =>
                                setTemplateFormState((prev) => ({
                                  ...prev,
                                  payloadFormValues: {
                                    ...prev.payloadFormValues,
                                    [field.key]: event.target.value,
                                  },
                                }))
                              }
                              placeholder={field.placeholder}
                              inputMode={field.type === "number" ? "decimal" : undefined}
                            />
                            {field.description ? (
                              <p className="text-xs text-muted-foreground">{field.description}</p>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <Textarea
                    value={templateFormState.payloadText}
                    onChange={(event) => setTemplateFormState((prev) => ({ ...prev, payloadText: event.target.value }))}
                    rows={10}
                  />
                )}
              </div>
              <div className="md:col-span-2">
                <Label>备注</Label>
                <Textarea
                  value={templateFormState.notes}
                  onChange={(event) => setTemplateFormState((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            {templateSubmitError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {templateSubmitError}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)} disabled={templateSubmitting}>
              取消
            </Button>
            <Button onClick={handleSubmitTemplate} disabled={templateSubmitting}>
              {templateSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {templateFormMode === "create" ? "创建服务模块" : "保存修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => (!open ? setTemplateToDelete(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除服务模块？</AlertDialogTitle>
            <AlertDialogDescription>
              {templateToDelete?.usageCount && templateToDelete?.usageCount > 0
                ? "该模块正在被服务计划使用，无法删除。"
                : "此操作不可逆，请确认。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!templateToDelete || templateToDelete.usageCount > 0}
              onClick={handleDeleteTemplate}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

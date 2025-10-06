"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, RefreshCw, Search } from "lucide-react"

const ACTION_OPTIONS = [
  { value: "ALL", label: "全部动作" },
  { value: "CONTRACT_UPLOAD", label: "合同上传" },
  { value: "OCR_CONVERSION", label: "OCR 转换" },
  { value: "BASIC_INFO_EXTRACTION", label: "基础信息提取" },
  { value: "CONTRACT_COMPLIANCE", label: "合同分析" },
]

const SOURCE_OPTIONS = [
  { value: "ALL", label: "全部来源" },
  { value: "DATABASE", label: "数据库" },
  { value: "AI", label: "AI 服务" },
]

const STATUS_OPTIONS = [
  { value: "ALL", label: "全部状态" },
  { value: "SUCCESS", label: "成功" },
  { value: "ERROR", label: "失败" },
  { value: "SKIPPED", label: "跳过" },
]

type ProcessingLogRecord = {
  id: string
  contractId: string | null
  action: string
  description: string | null
  source: string | null
  status: string | null
  durationMs: number | null
  metadata: unknown
  createdAt: string
  contract: {
    id: string
    originalFileName: string
  } | null
}

type FetchState = "idle" | "loading" | "success" | "error"

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

const formatDuration = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—"
  }
  if (value >= 1000) {
    const seconds = value / 1000
    return seconds >= 10 ? `${seconds.toFixed(1)}s` : `${seconds.toFixed(2)}s`
  }
  return `${value}ms`
}

const resolveActionLabel = (action: string | null | undefined) => {
  if (!action) return "未记录"
  const found = ACTION_OPTIONS.find((option) => option.value === action)
  return found ? found.label : action
}

const resolveStatusVariant = (status: string | null | undefined) => {
  switch (status) {
    case "SUCCESS":
      return "success"
    case "ERROR":
      return "destructive"
    case "SKIPPED":
      return "secondary"
    default:
      return "outline"
  }
}

const resolveStatusLabel = (status: string | null | undefined) => {
  switch (status) {
    case "SUCCESS":
      return "成功"
    case "ERROR":
      return "失败"
    case "SKIPPED":
      return "跳过"
    default:
      return status || "未知"
  }
}

const resolveSourceLabel = (source: string | null | undefined) => {
  switch (source) {
    case "DATABASE":
      return "数据库"
    case "AI":
      return "AI 服务"
    default:
      return source || "未指定"
  }
}

const metadataPreview = (metadata: unknown) => {
  if (metadata == null) {
    return "—"
  }
  if (typeof metadata === "string") {
    return metadata.length > 120 ? `${metadata.slice(0, 117)}...` : metadata
  }
  try {
    const serialized = JSON.stringify(metadata)
    return serialized.length > 120 ? `${serialized.slice(0, 117)}...` : serialized
  } catch (error) {
    return "无法展示"
  }
}

const stringifyMetadata = (metadata: unknown) => {
  if (metadata == null) {
    return "无附加信息"
  }
  if (typeof metadata === "string") {
    return metadata
  }
  try {
    return JSON.stringify(metadata, null, 2)
  } catch (error) {
    return "无法解析元数据"
  }
}

export function ProcessingLogsViewer() {
  const [logs, setLogs] = useState<ProcessingLogRecord[]>([])
  const [state, setState] = useState<FetchState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("ALL")
  const [sourceFilter, setSourceFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [selectedLog, setSelectedLog] = useState<ProcessingLogRecord | null>(null)

  const fetchLogs = useCallback(async () => {
    setState("loading")
    setError(null)
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim())
      }
      if (actionFilter !== "ALL") {
        params.set("action", actionFilter)
      }
      if (sourceFilter !== "ALL") {
        params.set("source", sourceFilter)
      }
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter)
      }

      const response = await fetch(`/api/processing-logs?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`加载日志失败，状态码 ${response.status}`)
      }

      const payload = (await response.json()) as { data?: ProcessingLogRecord[] }
      const items = Array.isArray(payload?.data) ? payload.data : []
      setLogs(items)
      setState("success")
    } catch (err) {
      console.error("Failed to load processing logs", err)
      setError(err instanceof Error ? err.message : "加载日志失败")
      setState("error")
    }
  }, [searchTerm, actionFilter, sourceFilter, statusFilter])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  const actionSummary = useMemo(() => {
    const summary = logs.reduce<Record<string, number>>((acc, log) => {
      const key = log.action
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
    return summary
  }, [logs])

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold">处理日志</CardTitle>
            <CardDescription>追踪合同上传、OCR、基础信息提取及合同分析的完整流程</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (state === "loading") return
                void fetchLogs()
              }}
            >
              {state === "loading" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              刷新
            </Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="col-span-2 flex items-center gap-2 rounded-md border bg-muted/40 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              className="border-0 bg-transparent focus-visible:ring-0"
              placeholder="搜索描述、元数据或来源"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="过滤动作" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="过滤来源" />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="过滤状态" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {logs.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {Object.entries(actionSummary).map(([action, count]) => (
              <span key={action} className="rounded-md bg-muted px-2 py-1">
                {resolveActionLabel(action)}：{count}
              </span>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">时间</TableHead>
                <TableHead>动作</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>耗时</TableHead>
                <TableHead>关联合同</TableHead>
                <TableHead>元数据</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state === "loading" && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在加载日志...
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    暂无日志记录
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell>{resolveActionLabel(log.action)}</TableCell>
                    <TableCell>{log.description || "—"}</TableCell>
                    <TableCell>{resolveSourceLabel(log.source)}</TableCell>
                    <TableCell>
                      <Badge variant={resolveStatusVariant(log.status)}>{resolveStatusLabel(log.status)}</Badge>
                    </TableCell>
                    <TableCell>{formatDuration(log.durationMs)}</TableCell>
                    <TableCell>{log.contract?.originalFileName ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm text-muted-foreground" title={metadataPreview(log.metadata)}>
                          {metadataPreview(log.metadata)}
                        </span>
                        {!!log.metadata && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setSelectedLog(log)}
                          >
                            查看
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground">
          共 {logs.length} 条记录，展示最近 100 条。
        </p>
      </CardContent>
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>日志详情</DialogTitle>
            <DialogDescription>
              {selectedLog ? `${resolveActionLabel(selectedLog.action)} · ${formatDateTime(selectedLog.createdAt)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 rounded-md border p-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">来源</span>
                  <span>{resolveSourceLabel(selectedLog.source)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">状态</span>
                  <span>{resolveStatusLabel(selectedLog.status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">耗时</span>
                  <span>{formatDuration(selectedLog.durationMs)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">关联合同</span>
                  <span>{selectedLog.contract?.originalFileName ?? "—"}</span>
                </div>
              </div>
              <div>
                <h4 className="mb-2 font-medium">元数据</h4>
                <Separator className="mb-3" />
                <pre className="max-h-72 overflow-auto rounded-md bg-muted/40 p-3 text-xs">
                  {stringifyMetadata(selectedLog.metadata)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

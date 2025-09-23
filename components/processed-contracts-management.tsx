"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar, FileText, Loader2, RefreshCw, Trash2 } from "lucide-react"

type ContractBasicInfoRecord = {
  id: string
  contractId: string
  contractNumber: string | null
  contractName: string | null
  partyA: string | null
  partyB: string | null
  contractStartDate: string | null
  contractEndDate: string | null
  contractTotalAmount: number | null
  contractPaymentMethod: string | null
  contractCurrency: string | null
  createdAt: string
  updatedAt: string
}

type ContractListItem = {
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
  basicInfo: ContractBasicInfoRecord | null
}

type FetchStatus = "idle" | "loading" | "success" | "error"

const toTimestamp = (value: string | null | undefined) => {
  if (!value) return 0
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString()
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

const formatAmount = (amount: number | null | undefined, currency: string | null | undefined) => {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "—"
  }
  const rounded = Number.isInteger(amount) ? amount : Number(amount.toFixed(2))
  if (!currency) {
    return `${rounded}`
  }
  return `${currency} ${rounded}`
}

const formatDateRange = (start: string | null | undefined, end: string | null | undefined) => {
  const startLabel = formatDate(start)
  const endLabel = formatDate(end)

  if (startLabel === "—" && endLabel === "—") {
    return "—"
  }

  if (startLabel !== "—" && endLabel !== "—") {
    return `${startLabel} ~ ${endLabel}`
  }

  if (startLabel !== "—") {
    return `${startLabel} 起`
  }

  return `${endLabel} 截止`
}

const deriveDisplayName = (contract: ContractListItem) => {
  return contract.basicInfo?.contractName?.trim() || contract.originalFileName
}

export function ProcessedContractsManagement() {
  const [contracts, setContracts] = useState<ContractListItem[]>([])
  const [status, setStatus] = useState<FetchStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedContract, setSelectedContract] = useState<ContractListItem | null>(null)
  const [deleteDialogContract, setDeleteDialogContract] = useState<ContractListItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [parsingId, setParsingId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchContracts = useCallback(async () => {
    setStatus("loading")
    setError(null)
    setActionMessage(null)

    try {
      const response = await fetch("/api/contracts")
      if (!response.ok) {
        throw new Error("加载合同列表失败")
      }

      const data = (await response.json()) as unknown
      if (!Array.isArray(data)) {
        throw new Error("合同列表格式不正确")
      }

      const normalized = data as ContractListItem[]
      const sorted = [...normalized].sort((a, b) => toTimestamp(b.convertedAt || b.createdAt) - toTimestamp(a.convertedAt || a.createdAt))
      setContracts(sorted)
      setStatus("success")
    } catch (err) {
      console.error("Failed to load contract list", err)
      setError(err instanceof Error ? err.message : "加载合同列表失败")
      setStatus("error")
    }
  }, [])

  useEffect(() => {
    void fetchContracts()
  }, [fetchContracts])

  const filteredContracts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) {
      return contracts
    }

    return contracts.filter((contract) => {
      const name = deriveDisplayName(contract).toLowerCase()
      const original = contract.originalFileName.toLowerCase()
      const partyA = contract.basicInfo?.partyA?.toLowerCase() ?? ""
      const partyB = contract.basicInfo?.partyB?.toLowerCase() ?? ""
      const contractNumber = contract.basicInfo?.contractNumber?.toLowerCase() ?? ""
      return name.includes(term) || original.includes(term) || partyA.includes(term) || partyB.includes(term) || contractNumber.includes(term)
    })
  }, [contracts, searchTerm])

  const stats = useMemo(() => {
    const total = contracts.length
    const withBasicInfo = contracts.filter((contract) => !!contract.basicInfo).length
    const latestTimestamp = contracts[0] ? toTimestamp(contracts[0].convertedAt || contracts[0].createdAt) : null
    return {
      total,
      withBasicInfo,
      latest: latestTimestamp ? formatDateTime(new Date(latestTimestamp).toISOString()) : "—",
    }
  }, [contracts])

  const handleRefresh = () => {
    if (status === "loading") {
      return
    }
    void fetchContracts()
  }

  const handleParseBasicInfo = useCallback(
    async (contract: ContractListItem) => {
      if (parsingId) {
        return
      }

      setParsingId(contract.id)
      setActionMessage(null)

      try {
        const response = await fetch(`/api/contracts/${contract.id}/basic-info`, {
          method: "POST",
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.message ?? "解析基础信息失败")
        }

        const data = (await response.json()) as { basicInfo: ContractBasicInfoRecord | null }
        const normalizedBasicInfo = data.basicInfo ?? null

        setContracts((prev) =>
          prev.map((item) =>
            item.id === contract.id ? { ...item, basicInfo: normalizedBasicInfo } : item,
          ),
        )
        setSelectedContract((prev) =>
          prev && prev.id === contract.id ? { ...prev, basicInfo: normalizedBasicInfo } : prev,
        )
        setActionMessage({ type: "success", text: "基础信息解析成功" })
      } catch (err) {
        const message = err instanceof Error ? err.message : "解析基础信息失败"
        setActionMessage({ type: "error", text: message })
      } finally {
        setParsingId(null)
      }
    },
    [parsingId],
  )

  const handleDeleteContract = useCallback(async (contract: ContractListItem) => {
    setDeletingId(contract.id)
    setActionMessage(null)

    try {
      const response = await fetch(`/api/contracts/${contract.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? "删除合同失败")
      }

      setContracts((prev) => prev.filter((item) => item.id !== contract.id))
      setSelectedContract((prev) => (prev && prev.id === contract.id ? null : prev))
      setDeleteDialogContract(null)
      setActionMessage({ type: "success", text: "合同已删除" })
    } catch (err) {
      const message = err instanceof Error ? err.message : "删除合同失败"
      setActionMessage({ type: "error", text: message })
    } finally {
      setDeletingId(null)
    }
  }, [])

  const renderTableBody = () => {
    if (status === "loading" && contracts.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="text-center text-muted-foreground">
            正在加载合同列表...
          </TableCell>
        </TableRow>
      )
    }

    if (status === "error") {
      return (
        <TableRow>
          <TableCell colSpan={7} className="text-center">
            <div className="flex flex-col items-center gap-3 py-6">
              <span className="text-muted-foreground">{error ?? "加载合同列表失败"}</span>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                重试
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )
    }

    if (filteredContracts.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="text-center text-muted-foreground">
            {contracts.length === 0 ? "还没有上传过合同" : "没有找到匹配的合同"}
          </TableCell>
        </TableRow>
      )
    }

    return filteredContracts.map((contract) => {
      const displayName = deriveDisplayName(contract)
      const partyA = contract.basicInfo?.partyA?.trim() || "—"
      // const partyB = contract.basicInfo?.partyB?.trim() || "—"
      const contractNumber = contract.basicInfo?.contractNumber?.trim()
      const hasBasicInfo = !!contract.basicInfo
      const isParsing = parsingId === contract.id
      const isDeleting = deletingId === contract.id

      return (
        <TableRow key={contract.id}>
          <TableCell>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{displayName}</p>
                {/* <p className="text-xs text-muted-foreground">{contract.originalFileName}</p> */}
                {contractNumber ? (
                  <p className="text-xs text-muted-foreground">编号：{contractNumber}</p>
                ) : null}
              </div>
            </div>
          </TableCell>
          <TableCell>{partyA}</TableCell>
          {/* <TableCell>{partyB}</TableCell> */}
          <TableCell>{formatDateRange(contract.basicInfo?.contractStartDate, contract.basicInfo?.contractEndDate)}</TableCell>
          {/* <TableCell>{formatAmount(contract.basicInfo?.contractTotalAmount, contract.basicInfo?.contractCurrency)}</TableCell> */}
          <TableCell>{formatDateTime(contract.convertedAt || contract.createdAt)}</TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={hasBasicInfo || isParsing}
                onClick={() => handleParseBasicInfo(contract)}
              >
                {isParsing ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : null}
                解析基础信息
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeleteDialogContract(contract)}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                )}
                删除
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedContract(contract)}>
                查看详情
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">上传合同</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已提取基础信息</p>
                <p className="text-2xl font-bold">{stats.withBasicInfo}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">最新处理时间</p>
                <p className="text-2xl font-bold text-balance text-right md:text-left">{stats.latest}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>合同列表</CardTitle>
          <CardDescription>查看已上传合同及其提取的基础信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <Input
              placeholder="搜索合同名称、编号或甲乙方"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline" onClick={handleRefresh} disabled={status === "loading"}>
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新列表
            </Button>
          </div>

          {actionMessage ? (
            <div
              className={
                actionMessage.type === "success"
                  ? "mb-4 text-sm text-green-600"
                  : "mb-4 text-sm text-destructive"
              }
            >
              {actionMessage.text}
            </div>
          ) : null}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>合同名称</TableHead>
                  <TableHead>客户</TableHead>
                  {/* <TableHead>乙方</TableHead> */}
                  <TableHead>合同期限</TableHead>
                  {/* <TableHead>合同金额</TableHead> */}
                  <TableHead>处理时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderTableBody()}</TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedContract ? deriveDisplayName(selectedContract) : "合同详情"}
            </DialogTitle>
            {selectedContract ? (
              <DialogDescription>{selectedContract.originalFileName}</DialogDescription>
            ) : null}
          </DialogHeader>

          {selectedContract ? (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">文件信息</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    转换时间：{formatDateTime(selectedContract.convertedAt || selectedContract.createdAt)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">文件大小：</span>
                    <span>{(selectedContract.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">存储方式：</span>
                    <Badge variant="secondary">{selectedContract.storageProvider}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">合同ID：</span>
                    <span className="break-all">{selectedContract.id}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">基础信息</h4>
                {selectedContract.basicInfo ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">合同编号：</span>
                      <span>{selectedContract.basicInfo.contractNumber || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">合同名称：</span>
                      <span>{selectedContract.basicInfo.contractName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">客户：</span>
                      <span>{selectedContract.basicInfo.partyA || "—"}</span>
                    </div>
                    {/* <div>
                      <span className="text-muted-foreground">乙方：</span>
                      <span>{selectedContract.basicInfo.partyB || "—"}</span>
                    </div> */}
                    <div>
                      <span className="text-muted-foreground">合同期限：</span>
                      <span>
                        {formatDateRange(
                          selectedContract.basicInfo.contractStartDate,
                          selectedContract.basicInfo.contractEndDate,
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">合同金额：</span>
                      <span>
                        {formatAmount(
                          selectedContract.basicInfo.contractTotalAmount,
                          selectedContract.basicInfo.contractCurrency,
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">付款方式：</span>
                      <span>{selectedContract.basicInfo.contractPaymentMethod || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">币种：</span>
                      <span>{selectedContract.basicInfo.contractCurrency || "—"}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂未提取到该合同的基础信息。</p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteDialogContract}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogContract(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该合同？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将移除合同文件以及相关分析数据，且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId === deleteDialogContract?.id}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!deleteDialogContract || deletingId === deleteDialogContract.id}
              onClick={(event) => {
                event.preventDefault()
                if (deleteDialogContract) {
                  void handleDeleteContract(deleteDialogContract)
                }
              }}
            >
              {deletingId === deleteDialogContract?.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

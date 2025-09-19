"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Filter,
  Download,
  Eye,
  MoreHorizontal,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Archive,
  Trash2,
  Share,
  BarChart3,
} from "lucide-react"

// 模拟已处理合同数据
const mockProcessedContracts = [
  {
    id: "1",
    name: "软件开发服务合同.pdf",
    client: "北京科技有限公司",
    contractType: "服务合同",
    processedDate: "2024-01-15",
    reviewer: "张律师",
    status: "已完成",
    riskLevel: "medium",
    totalClauses: 15,
    flaggedClauses: 3,
    complianceScore: 85,
    fileSize: "2.3 MB",
    tags: ["软件开发", "技术服务"],
    summary: "整体风险可控，建议修改违约金条款和知识产权归属条款",
  },
  {
    id: "2",
    name: "采购合同_办公设备.pdf",
    client: "上海贸易公司",
    contractType: "采购合同",
    processedDate: "2024-01-14",
    reviewer: "李律师",
    status: "已完成",
    riskLevel: "low",
    totalClauses: 12,
    flaggedClauses: 1,
    complianceScore: 92,
    fileSize: "1.8 MB",
    tags: ["采购", "办公设备"],
    summary: "合同条款规范，仅需关注交付时间条款",
  },
  {
    id: "3",
    name: "房屋租赁合同.pdf",
    client: "深圳地产公司",
    contractType: "租赁合同",
    processedDate: "2024-01-13",
    reviewer: "王律师",
    status: "需修改",
    riskLevel: "high",
    totalClauses: 18,
    flaggedClauses: 6,
    complianceScore: 68,
    fileSize: "3.1 MB",
    tags: ["房屋租赁", "商业地产"],
    summary: "存在多项高风险条款，建议重新协商租金调整和违约责任条款",
  },
  {
    id: "4",
    name: "劳动合同_技术岗位.pdf",
    client: "广州互联网公司",
    contractType: "劳动合同",
    processedDate: "2024-01-12",
    reviewer: "陈律师",
    status: "已完成",
    riskLevel: "low",
    totalClauses: 10,
    flaggedClauses: 0,
    complianceScore: 96,
    fileSize: "1.2 MB",
    tags: ["劳动合同", "技术岗位"],
    summary: "合同条款完全符合劳动法规定，无需修改",
  },
  {
    id: "5",
    name: "销售代理合同.pdf",
    client: "成都销售公司",
    contractType: "代理合同",
    processedDate: "2024-01-11",
    reviewer: "刘律师",
    status: "审核中",
    riskLevel: "medium",
    totalClauses: 14,
    flaggedClauses: 2,
    complianceScore: 78,
    fileSize: "2.7 MB",
    tags: ["销售代理", "渠道合作"],
    summary: "正在审核中，初步发现佣金计算和区域限制条款需要关注",
  },
]

const getRiskColor = (level: string) => {
  switch (level) {
    case "high":
      return "destructive"
    case "medium":
      return "secondary"
    case "low":
      return "default"
    default:
      return "default"
  }
}

const getRiskIcon = (level: string) => {
  switch (level) {
    case "high":
      return <XCircle className="h-4 w-4" />
    case "medium":
      return <AlertTriangle className="h-4 w-4" />
    case "low":
      return <CheckCircle className="h-4 w-4" />
    default:
      return <CheckCircle className="h-4 w-4" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "已完成":
      return "default"
    case "需修改":
      return "destructive"
    case "审核中":
      return "secondary"
    default:
      return "default"
  }
}

const getComplianceColor = (score: number) => {
  if (score >= 90) return "text-green-600"
  if (score >= 70) return "text-yellow-600"
  return "text-red-600"
}

export function ProcessedContractsManagement() {
  const [selectedContract, setSelectedContract] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterRisk, setFilterRisk] = useState("all")

  const filteredContracts = mockProcessedContracts.filter((contract) => {
    const matchesSearch =
      contract.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.client.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || contract.status === filterStatus
    const matchesRisk = filterRisk === "all" || contract.riskLevel === filterRisk
    return matchesSearch && matchesStatus && matchesRisk
  })

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总合同数</p>
                <p className="text-2xl font-bold">{mockProcessedContracts.length}</p>
              </div>
              <Archive className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已完成</p>
                <p className="text-2xl font-bold text-green-600">
                  {mockProcessedContracts.filter((c) => c.status === "已完成").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">需修改</p>
                <p className="text-2xl font-bold text-red-600">
                  {mockProcessedContracts.filter((c) => c.status === "需修改").length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">平均合规分</p>
                <p className="text-2xl font-bold">
                  {Math.round(
                    mockProcessedContracts.reduce((sum, c) => sum + c.complianceScore, 0) /
                      mockProcessedContracts.length,
                  )}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardHeader>
          <CardTitle>合同列表</CardTitle>
          <CardDescription>管理和查看已处理的合同文件</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="搜索合同名称或客户..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="已完成">已完成</SelectItem>
                  <SelectItem value="需修改">需修改</SelectItem>
                  <SelectItem value="审核中">审核中</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterRisk} onValueChange={setFilterRisk}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="风险" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部风险</SelectItem>
                  <SelectItem value="high">高风险</SelectItem>
                  <SelectItem value="medium">中风险</SelectItem>
                  <SelectItem value="low">低风险</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>合同名称</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>处理日期</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>风险等级</TableHead>
                  <TableHead>合规分</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{contract.name}</p>
                          <p className="text-sm text-muted-foreground">{contract.fileSize}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{contract.client}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{contract.contractType}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {contract.processedDate}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(contract.status)}>{contract.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRiskIcon(contract.riskLevel)}
                        <Badge variant={getRiskColor(contract.riskLevel)}>
                          {contract.riskLevel === "high"
                            ? "高风险"
                            : contract.riskLevel === "medium"
                              ? "中风险"
                              : "低风险"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${getComplianceColor(contract.complianceScore)}`}>
                        {contract.complianceScore}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setSelectedContract(contract)}>
                            <Eye className="mr-2 h-4 w-4" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            下载合同
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share className="mr-2 h-4 w-4" />
                            分享
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 合同详情对话框 */}
      <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedContract?.name}
            </DialogTitle>
            <DialogDescription>合同审核详情和分析结果</DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">基本信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">客户：</span>
                      <span>{selectedContract.client}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">合同类型：</span>
                      <Badge variant="outline">{selectedContract.contractType}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">处理日期：</span>
                      <span>{selectedContract.processedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">审核人：</span>
                      <span>{selectedContract.reviewer}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">审核结果</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">状态：</span>
                      <Badge variant={getStatusColor(selectedContract.status)}>{selectedContract.status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">风险等级：</span>
                      <div className="flex items-center gap-1">
                        {getRiskIcon(selectedContract.riskLevel)}
                        <Badge variant={getRiskColor(selectedContract.riskLevel)}>
                          {selectedContract.riskLevel === "high"
                            ? "高风险"
                            : selectedContract.riskLevel === "medium"
                              ? "中风险"
                              : "低风险"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">合规分数：</span>
                      <span className={`font-medium ${getComplianceColor(selectedContract.complianceScore)}`}>
                        {selectedContract.complianceScore}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">风险条款：</span>
                      <span>
                        {selectedContract.flaggedClauses}/{selectedContract.totalClauses}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 审核摘要 */}
              <div>
                <h4 className="font-medium mb-2">审核摘要</h4>
                <p className="text-sm bg-muted p-3 rounded-md leading-relaxed">{selectedContract.summary}</p>
              </div>

              {/* 标签 */}
              <div>
                <h4 className="font-medium mb-2">标签</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedContract.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  下载报告
                </Button>
                <Button variant="outline">
                  <Share className="h-4 w-4 mr-2" />
                  分享
                </Button>
                <Button>
                  <Eye className="h-4 w-4 mr-2" />
                  查看合同
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

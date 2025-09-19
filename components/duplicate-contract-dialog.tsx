"use client"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { FileText, Clock, CheckCircle } from "lucide-react"

type ExistingContract = {
  id: string
  originalFileName: string
  createdAt: string
  markdown: string
  hasAnalysis: boolean
}

type DuplicateContractDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingContract: ExistingContract | null
  onUseExisting: () => void
  onCreateNew: () => void
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) {
    return dateString
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit", 
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}

export function DuplicateContractDialog({
  open,
  onOpenChange,
  existingContract,
  onUseExisting,
  onCreateNew
}: DuplicateContractDialogProps) {
  if (!existingContract) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            检测到重复合同
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm">
              <p>
                您上传的文件与之前上传的合同相同，系统已为您找到之前的处理结果。
              </p>
              
              <div className="border rounded-lg p-3 bg-muted/30">
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 space-y-2">
                    <div className="font-medium text-foreground">
                      {existingContract.originalFileName}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      上传时间：{formatDateTime(existingContract.createdAt)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        已转换为Markdown
                      </Badge>
                      {existingContract.hasAnalysis && (
                        <Badge variant="default" className="text-xs flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          已完成分析
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                您可以选择使用之前的处理结果，或者重新处理这份合同。
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onCreateNew} className="w-full sm:w-auto">
            重新处理
          </AlertDialogCancel>
          <AlertDialogAction onClick={onUseExisting} className="w-full sm:w-auto">
            使用之前的结果
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

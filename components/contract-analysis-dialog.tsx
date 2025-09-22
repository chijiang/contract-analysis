import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ContractTemplate } from "@/app/types/contract-analysis"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { useCallback } from "react"


type ContractAnalysisDialogProps = {
    templateDialogOpen: boolean
    pendingAnalysisAction: "analyze" | "reprocess" | null
    templates: ContractTemplate[]
    templateDialogError: string | null
    pendingTemplateSelection: string[]
    templatesStatus: "success" | "idle" | "loading" | "error"

    setPendingTemplateSelection: React.Dispatch<React.SetStateAction<string[]>>
    handleTemplateDialogOpenChange: (open: boolean) => void
    handleTemplateDialogConfirm: () => void
}


export function ContractAnalysisDialog({
    templateDialogOpen,
    pendingAnalysisAction,
    templates,
    templateDialogError,
    pendingTemplateSelection,
    templatesStatus,
    setPendingTemplateSelection,
    handleTemplateDialogOpenChange,
    handleTemplateDialogConfirm,
}: ContractAnalysisDialogProps) {

    const templateDialogTitle = pendingAnalysisAction === "reprocess" ? "重新处理前选择模板" : "选择产品合同模板"
    const templateDialogDescription =
        pendingAnalysisAction === "reprocess"
            ? "选择本次重新处理需要启用的标准条款模板。"
            : "请选择本次分析需要启用的标准条款模板，至少勾选一个。"
    const templateDialogConfirmDisabled = pendingTemplateSelection.length === 0

    const toggleTemplateSelection = useCallback((templateId: string) => {
        setPendingTemplateSelection((prev) =>
            prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId],
        )
    }, [])

    const handleSelectAllTemplates = useCallback(() => {
        setPendingTemplateSelection(templates.map((template) => template.id))
    }, [templates])

    const handleClearTemplates = useCallback(() => {
        setPendingTemplateSelection([])
    }, [])

    return (
        <Dialog open={templateDialogOpen} onOpenChange={handleTemplateDialogOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>{templateDialogTitle}</DialogTitle>
                    <DialogDescription>{templateDialogDescription}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                    {templates.map((template) => {
                        const checked = pendingTemplateSelection.includes(template.id)
                        return (
                            <div
                                key={template.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleTemplateSelection(template.id)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault()
                                        toggleTemplateSelection(template.id)
                                    }
                                }}
                                className={`w-full rounded-lg border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/50 ${checked ? "border-primary bg-primary/5" : "border-border bg-background"
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        onClick={(event) => event.stopPropagation()}
                                        onKeyDown={(event) => event.stopPropagation()}
                                    >
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={() => toggleTemplateSelection(template.id)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-foreground">{template.name}</p>
                                        {template.description && (
                                            <p className="text-xs text-muted-foreground">{template.description}</p>
                                        )}
                                        <p className="text-[11px] text-muted-foreground">
                                            创建于 {new Date(template.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {templatesStatus === "success" && templates.length === 0 && (
                        <p className="text-sm text-muted-foreground">暂无可用模板，请先在标准条款管理页面创建。</p>
                    )}
                </div>
                {templateDialogError && <p className="text-sm text-destructive">{templateDialogError}</p>}
                <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAllTemplates}
                            disabled={templates.length === 0}
                        >
                            全选
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearTemplates}
                            disabled={pendingTemplateSelection.length === 0}
                        >
                            清空
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" onClick={() => handleTemplateDialogOpenChange(false)}>
                            取消
                        </Button>
                        <Button type="button" onClick={handleTemplateDialogConfirm} disabled={templateDialogConfirmDisabled}>
                            确认
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
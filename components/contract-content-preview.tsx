import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import { MarkdownViewer, MarkdownViewerRef } from "@/components/markdown-viewer"
import { ContractRecord } from "./contract-clauses-list"
import { SaveStatus } from "./contract-clauses-list"
import { CommonStatus } from "@/app/types/contract-analysis"


type ContractContentPreviewProps = {
    pdfPreviewUrl: string | null
    previewMode: "pdf" | "markdown"
    saveStatus: SaveStatus
    saveError: string | null
    contractRecord: ContractRecord | null
    markdownStatus: CommonStatus
    markdownError: string | null,
    markdownContent: string,
    markdownViewerRef: React.RefObject<MarkdownViewerRef>
    setPreviewMode: (mode: "pdf" | "markdown") => void
}

export function ContractContentPreview(
    {
        pdfPreviewUrl,
        previewMode,
        saveStatus,
        saveError,
        contractRecord,
        markdownStatus,
        markdownError,
        markdownContent,
        markdownViewerRef,
        setPreviewMode
    }: ContractContentPreviewProps
) {

    return (
        <Card className="flex flex-col min-h-[700px]">
            <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>合同内容预览</CardTitle>
                        <CardDescription>
                            {previewMode === "pdf" ? "实时查看合同PDF页面" : "查看文本化识别版内容"}
                        </CardDescription>
                    </div>
                    <div className="inline-flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant={previewMode === "pdf" ? "default" : "outline"}
                            disabled={previewMode === "pdf"}
                            onClick={() => setPreviewMode("pdf")}
                        >
                            PDF版
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={previewMode === "markdown" ? "default" : "outline"}
                            disabled={previewMode === "markdown"}
                            onClick={() => setPreviewMode("markdown")}
                        >
                            文本识别版
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="mb-4 space-y-2 text-sm">
                    {saveStatus === "saving" && (
                        <p className="text-muted-foreground">合同数据保存中...</p>
                    )}
                    {saveStatus === "error" && saveError && (
                        <p className="text-destructive">{saveError}</p>
                    )}
                    {saveStatus === "success" && contractRecord && (
                        <p className="text-emerald-600">
                            合同已保存（ID: {contractRecord.id}）
                        </p>
                    )}
                </div>
                {previewMode === "pdf" ? (
                    pdfPreviewUrl ? (
                        <iframe
                            src={pdfPreviewUrl}
                            title="PDF预览"
                            className="h-[600px] w-full rounded-lg border bg-background"
                        />
                    ) : (
                        <div className="bg-muted/30 rounded-lg p-8 min-h-[600px] flex items-center justify-center">
                            <div className="text-center">
                                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">无法预览当前文件</p>
                                <p className="text-sm text-muted-foreground mt-2">请确认已上传PDF文件</p>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="h-[600px] rounded-lg border bg-background">
                        {markdownStatus === "loading" && (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                正在转换为Markdown...
                            </div>
                        )}
                        {markdownStatus === "error" && (
                            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-destructive">
                                {markdownError ?? "转换失败，请稍后重试"}
                            </div>
                        )}
                        {markdownStatus === "success" && markdownContent && (
                            <MarkdownViewer
                                ref={markdownViewerRef}
                                content={markdownContent}
                            />
                        )}
                        {markdownStatus === "idle" && (
                            <div className="flex h-full items-center justify-center px-6 text-sm text-muted-foreground">
                                正在准备Markdown内容...
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
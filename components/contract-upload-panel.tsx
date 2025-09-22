import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "./ui/button"
import { Upload, FileText, Eye, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ContractRecord } from "@/app/types/contract-analysis"

type ContractUploadPanelProps = {
    encodedFileUrl: string | null
    contractRecord: ContractRecord | null
    displayFileName: string | null
    hasContractSession: boolean
    saveStatus: "success" | "idle" | "error" | "saving"
    handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
    handleStartNewAnalysis: () => void
}

export function ContractUploadPanel({
    encodedFileUrl,
    contractRecord,
    displayFileName,
    hasContractSession,
    saveStatus,
    handleFileUpload,
    handleStartNewAnalysis
}: ContractUploadPanelProps) {

    return (
        <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        合同上传
                    </CardTitle>
                    <CardDescription>上传PDF文件进行智能分析</CardDescription>
                </div>
                {hasContractSession && (
                    <Button type="button" variant="outline" size="sm" onClick={handleStartNewAnalysis}>
                        新建分析
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {!hasContractSession ? (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center">
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">上传合同文件</h3>
                        <p className="text-muted-foreground mb-4">支持PDF格式，最大50MB</p>
                        <label htmlFor="file-upload">
                            <Button asChild>
                                <span>选择文件</span>
                            </Button>
                        </label>
                        <input id="file-upload" type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                <span className="font-medium">{displayFileName ?? "未命名合同"}</span>
                                <Badge variant={contractRecord ? "default" : "secondary"}>{contractRecord ? "已保存" : "已上传"}</Badge>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!encodedFileUrl || saveStatus !== "success"}
                                    onClick={() => {
                                        if (encodedFileUrl) window.open(encodedFileUrl, "_blank")
                                    }}
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    预览
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!encodedFileUrl || saveStatus !== "success"}
                                    onClick={() => {
                                        if (encodedFileUrl) window.open(encodedFileUrl, "_blank")
                                    }}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    下载
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
import { Navigation } from "@/components/navigation"
import { ProcessingLogsViewer } from "@/components/processing-logs-viewer"

export default function LogsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-balance">处理日志</h1>
          <p className="text-muted-foreground text-pretty">
            查看合同上传、OCR、基础信息提取及非标分析的详细执行记录
          </p>
        </div>
        <ProcessingLogsViewer />
      </main>
    </div>
  )
}

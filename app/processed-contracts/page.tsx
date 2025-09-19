import { Navigation } from "@/components/navigation"
import { ProcessedContractsManagement } from "@/components/processed-contracts-management"

export default function ProcessedContractsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-balance">已处理合同</h1>
          <p className="text-muted-foreground text-pretty">查看和管理已完成审核的合同文件及其分析结果</p>
        </div>
        <ProcessedContractsManagement />
      </main>
    </div>
  )
}

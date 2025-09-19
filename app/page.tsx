import { Navigation } from "@/components/navigation"
import { ContractReviewInterface } from "@/components/contract-review-interface"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-balance">合同审核</h1>
          <p className="text-muted-foreground text-pretty">上传PDF合同文件，进行智能条款分析和风险评估</p>
        </div>
        <ContractReviewInterface />
      </main>
    </div>
  )
}

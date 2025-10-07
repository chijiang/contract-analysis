import { Navigation } from "@/components/navigation"
import { StandardTermsManagement } from "@/components/standard-terms-management"

export default function StandardTermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-balance">审核标准管理</h1>
          <p className="text-muted-foreground text-pretty">管理和维护审核标准库，建立三级条款体系</p>
        </div>
        <StandardTermsManagement />
      </main>
    </div>
  )
}

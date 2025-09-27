import { Navigation } from "@/components/navigation"
import { ServicePlansManagement } from "@/components/service-plans-management"

export default function ServicePlansPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto py-6">
        <ServicePlansManagement />
      </main>
    </div>
  )
}

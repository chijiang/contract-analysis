import { notFound } from "next/navigation"

import { Navigation } from "@/components/navigation"
import { ContractAnalysisDetail } from "@/components/contract-analysis-detail"
import { prisma } from "@/lib/prisma"
import { parseSelectedTemplateIds } from "@/lib/contract-analysis-utils"
import type { ContractRecord, ContractTemplate } from "@/app/types/contract-analysis"
import type {
  Contract as PrismaContract,
  ContractAnalysis as PrismaContractAnalysis,
  ContractBasicInfo as PrismaContractBasicInfo,
  ContractTemplate as PrismaContractTemplate,
} from "@prisma/client"

const buildEncodedFileUrl = (filePath: string | null) => {
  if (!filePath) return null
  return `/api/files/${filePath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`
}

type AnalysisPayload = {
  id: string
  contractId: string
  result: string | null
  standardClauses: string | null
  selectedTemplateIds: string | null
  createdAt: string
  updatedAt: string
}

type PageParams = {
  params: {
    contractId: string
  }
}

type ContractWithRelations = PrismaContract & { basicInfo: PrismaContractBasicInfo | null; analysis: PrismaContractAnalysis | null }

const mapContractToRecord = (contract: ContractWithRelations): ContractRecord => ({
  id: contract.id,
  originalFileName: contract.originalFileName,
  mimeType: contract.mimeType,
  fileSize: contract.fileSize,
  storageProvider: (contract.storageProvider ?? "LOCAL") as "LOCAL" | "S3",
  filePath: contract.filePath,
  s3Key: contract.s3Key,
  markdown: contract.markdown,
  convertedAt: contract.convertedAt.toISOString(),
  createdAt: contract.createdAt.toISOString(),
  updatedAt: contract.updatedAt.toISOString(),
  basicInfo: contract.basicInfo
    ? {
        ...contract.basicInfo,
        createdAt: contract.basicInfo.createdAt.toISOString(),
        updatedAt: contract.basicInfo.updatedAt.toISOString(),
      }
    : null,
})

const mapTemplates = (templates: PrismaContractTemplate[]): ContractTemplate[] =>
  templates.map((template) => ({
    id: template.id,
    name: template.name,
    slug: template.slug,
    description: template.description,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }))

export default async function ContractAnalysisPage({ params }: PageParams) {
  const contract = await prisma.contract.findUnique({
    where: { id: params.contractId },
    include: {
      basicInfo: true,
      analysis: true,
    },
  })

  if (!contract) {
    notFound()
  }

  const contractRecord = mapContractToRecord(contract)

  const analysisPayload: AnalysisPayload | null = contract.analysis
    ? {
        id: contract.analysis.id,
        contractId: contract.analysis.contractId,
        result: contract.analysis.result,
        standardClauses: contract.analysis.standardClauses ?? null,
        selectedTemplateIds: contract.analysis.selectedTemplateIds ?? null,
        createdAt: contract.analysis.createdAt.toISOString(),
        updatedAt: contract.analysis.updatedAt.toISOString(),
      }
    : null

  const selectedTemplateIds = parseSelectedTemplateIds(analysisPayload?.selectedTemplateIds ?? null)
  const templateRecords = selectedTemplateIds.length
    ? await prisma.contractTemplate.findMany({ where: { id: { in: selectedTemplateIds } } })
    : []
  const templates = mapTemplates(templateRecords)
  const pdfUrl = buildEncodedFileUrl(contract.filePath)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto py-6">
        <ContractAnalysisDetail
          contract={contractRecord}
          pdfUrl={pdfUrl}
          analysis={analysisPayload}
          templates={templates}
        />
      </main>
    </div>
  )
}

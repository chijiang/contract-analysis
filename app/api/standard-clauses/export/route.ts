import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { standardClausesToWorkbook } from "@/lib/excel"

export async function GET() {
  const clauses = await prisma.standardClause.findMany({
    orderBy: [{ category: "asc" }, { clauseItem: "asc" }],
  })

  const buffer = standardClausesToWorkbook(
    clauses.map((clause) => ({
      category: clause.category,
      clauseItem: clause.clauseItem,
      standard: clause.standard,
      riskLevel: clause.riskLevel ?? undefined,
    })),
  )
  const fileName = `standard-clauses-${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  })
}

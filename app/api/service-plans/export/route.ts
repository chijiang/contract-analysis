import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { servicePlansToWorkbook } from "@/lib/service-plans-excel"
import { serializeServicePlan, servicePlanDetailInclude } from "@/lib/service-plans"

export async function GET() {
  const plans = await prisma.servicePlan.findMany({
    orderBy: { createdAt: "desc" },
    include: servicePlanDetailInclude,
  })

  if (plans.length === 0) {
    return NextResponse.json({ message: "暂无服务计划可导出" }, { status: 404 })
  }

  const serialized = plans.map(serializeServicePlan)
  const buffer = servicePlansToWorkbook(serialized)
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="service-plans-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Content-Length": buffer.length.toString(),
    },
  })
}

import { NextRequest, NextResponse } from "next/server"

import { parseServiceInfoSnapshotPayload } from "@/app/api/contracts/_helpers/service-info"
import {
  buildClauseInputs,
  fetchServicePlanCandidates,
  requestServicePlanRecommendation,
} from "@/app/api/contracts/_helpers/service-plan-recommendation"
import type { ServicePlanRecommendationResult } from "@/app/types/service-plan-recommendation"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{
    contractId: string
  }>
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { contractId } = await params
  if (!contractId) {
    return NextResponse.json({ message: "缺少合同ID" }, { status: 400 })
  }

  const snapshotRecord = await prisma.contractServiceInfoSnapshot.findUnique({ where: { contractId } })
  if (!snapshotRecord) {
    return NextResponse.json({ message: "未找到合同的服务信息拆解结果，请先触发服务信息分析。" }, { status: 404 })
  }

  const snapshot = parseServiceInfoSnapshotPayload(snapshotRecord.payload)
  const clauses = buildClauseInputs(snapshot)

  if (!clauses.length) {
    const result: ServicePlanRecommendationResult = {
      summary: "合同条款均已标注服务计划，未触发推荐逻辑。",
      overallPlanId: snapshot.servicePlanRecommendation?.overallPlanId ?? null,
      overallPlanName: snapshot.servicePlanRecommendation?.overallPlanName ?? null,
      overallAdjustmentNotes: snapshot.servicePlanRecommendation?.overallAdjustmentNotes ?? null,
      matches: [],
    }
    return NextResponse.json(result)
  }

  const candidates = await fetchServicePlanCandidates()
  if (!candidates.length) {
    return NextResponse.json({ message: "未配置服务计划，请先在管理界面创建服务计划。" }, { status: 503 })
  }

  try {
    const recommendation = await requestServicePlanRecommendation(clauses, candidates)
    const updatedSnapshot = {
      ...snapshot,
      servicePlanRecommendation: recommendation,
    }

    await prisma.contractServiceInfoSnapshot.update({
      where: { contractId },
      data: { payload: JSON.stringify(updatedSnapshot) },
    })

    return NextResponse.json(recommendation)
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务计划匹配失败"
    return NextResponse.json({ message }, { status: 502 })
  }
}


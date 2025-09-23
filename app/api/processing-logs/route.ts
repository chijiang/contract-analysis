import { NextRequest, NextResponse } from "next/server"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

const MAX_LIMIT = 200

const parseMetadata = (raw: string | null) => {
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as unknown
  } catch (error) {
    console.warn("Failed to parse processing log metadata", error)
    return raw
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "50", 10)
  const offsetParam = Number.parseInt(searchParams.get("offset") ?? "0", 10)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), MAX_LIMIT) : 50
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0
  const contractId = searchParams.get("contractId")?.trim() || undefined
  const action = searchParams.get("action")?.trim() || undefined
  const source = searchParams.get("source")?.trim() || undefined
  const status = searchParams.get("status")?.trim() || undefined
  const searchTerm = searchParams.get("search")?.trim() || undefined

  const where: Prisma.ContractProcessingLogWhereInput = {}

  if (contractId) {
    where.contractId = contractId
  }
  if (action) {
    where.action = action
  }
  if (source) {
    where.source = source
  }
  if (status) {
    where.status = status
  }
  if (searchTerm) {
    where.OR = [
      { description: { contains: searchTerm } },
      { metadata: { contains: searchTerm } },
      { action: { contains: searchTerm } },
      { source: { contains: searchTerm } },
    ]
  }

  const [logs, total] = await Promise.all([
    prisma.contractProcessingLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        contract: {
          select: {
            id: true,
            originalFileName: true,
          },
        },
      },
    }),
    prisma.contractProcessingLog.count({ where }),
  ])

  const normalized = logs.map((log) => ({
    id: log.id,
    contractId: log.contractId,
    action: log.action,
    description: log.description,
    source: log.source,
    status: log.status,
    durationMs: log.durationMs,
    metadata: parseMetadata(log.metadata),
    createdAt: log.createdAt,
    contract: log.contract,
  }))

  return NextResponse.json({
    data: normalized,
    meta: {
      total,
      limit,
      offset,
    },
  })
}

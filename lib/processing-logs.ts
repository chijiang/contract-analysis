import { prisma } from "@/lib/prisma"

type ProcessingLogStatus = "SUCCESS" | "ERROR" | "SKIPPED" | string

type ProcessingLogInput = {
  contractId?: string | null
  action: string
  description?: string | null
  source?: string | null
  status?: ProcessingLogStatus
  durationMs?: number | null
  metadata?: Record<string, unknown> | Array<unknown> | string | null
}

const toMetadataString = (value: ProcessingLogInput["metadata"]) => {
  if (value == null) {
    return null
  }

  if (typeof value === "string") {
    return value.slice(0, 65535)
  }

  try {
    const sanitized = JSON.parse(JSON.stringify(value)) as unknown
    const serialized = JSON.stringify(sanitized)
    return serialized.slice(0, 65535)
  } catch (error) {
    console.warn("Failed to serialize processing log metadata", error)
    return null
  }
}

export const createProcessingLog = async ({
  contractId,
  action,
  description,
  source,
  status = "SUCCESS",
  durationMs,
  metadata,
}: ProcessingLogInput) => {
  try {
    await prisma.contractProcessingLog.create({
      data: {
        contractId: contractId ?? null,
        action,
        description: description ?? null,
        source: source ?? null,
        status,
        durationMs: typeof durationMs === "number" ? Math.round(durationMs) : null,
        metadata: toMetadataString(metadata),
      },
    })
  } catch (error) {
    console.error("Failed to create processing log", { action, contractId, error })
  }
}

export type { ProcessingLogInput, ProcessingLogStatus }

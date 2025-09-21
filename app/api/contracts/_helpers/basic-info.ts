import { prisma } from "@/lib/prisma"
import { buildBackendUrl } from "@/lib/backend-service"

export type BasicInfoApiResponse = {
  contract_number?: unknown
  contract_name?: unknown
  party_a?: unknown
  party_b?: unknown
  contract_start_date?: unknown
  contract_end_date?: unknown
  contract_total_amount?: unknown
  contract_payment_method?: unknown
  contract_currency?: unknown
}

const normalizeNullableString = (value: unknown) => {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const normalizeNullableNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const sanitized = value.replace(/,/g, "").trim()
    if (!sanitized) {
      return null
    }
    const parsed = Number(sanitized)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

type ExtractOptions = {
  suppressErrors?: boolean
  requireRemote?: boolean
}

export const extractAndPersistBasicInfo = async (
  contractId: string,
  markdown: string,
  options: ExtractOptions = {},
) => {
  const { suppressErrors = true, requireRemote = false } = options
  const existingRecord = await prisma.contractBasicInfo.findUnique({ where: { contractId } })

  if (!markdown || !markdown.trim()) {
    return existingRecord
  }

  let basicInfoApiUrl: string

  try {
    // 如果显式配置了 BASIC_INFO_API_BASE_URL，则优先使用
    basicInfoApiUrl = buildBackendUrl(
      "/api/v1/basic_info_extraction",
      process.env.BASIC_INFO_API_BASE_URL,
    )
  } catch (error) {
    if (requireRemote || !suppressErrors) {
      throw new Error("基础信息提取服务未配置")
    }
    console.warn(
      "Skipped basic info extraction: missing BASIC_INFO_API_BASE_URL or INTERNAL_BACKEND_URL",
      error instanceof Error ? error.message : error,
    )
    return existingRecord
  }

  try {
    const response = await fetch(basicInfoApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: markdown }),
    })

    if (!response.ok) {
      throw new Error(`基础信息提取接口调用失败，状态码 ${response.status}`)
    }

    const payload = (await response.json()) as BasicInfoApiResponse
    const normalized = {
      contractNumber: normalizeNullableString(payload.contract_number),
      contractName: normalizeNullableString(payload.contract_name),
      partyA: normalizeNullableString(payload.party_a),
      partyB: normalizeNullableString(payload.party_b),
      contractStartDate: normalizeNullableString(payload.contract_start_date),
      contractEndDate: normalizeNullableString(payload.contract_end_date),
      contractTotalAmount: normalizeNullableNumber(payload.contract_total_amount),
      contractPaymentMethod: normalizeNullableString(payload.contract_payment_method),
      contractCurrency: normalizeNullableString(payload.contract_currency),
    }

    const record = await prisma.contractBasicInfo.upsert({
      where: { contractId },
      update: normalized,
      create: {
        contractId,
        ...normalized,
      },
    })

    return record
  } catch (error) {
    console.error("Failed to extract and persist contract basic info", error)
    if (suppressErrors) {
      return existingRecord
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error("基础信息提取失败")
  }
}

export type { BasicInfoApiResponse as BasicInfoApiResponseType }

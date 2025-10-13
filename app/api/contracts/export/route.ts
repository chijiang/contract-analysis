import { NextRequest } from "next/server"

import { normalizeContractIds, prepareContractsExport } from "@/app/api/contracts/_helpers/exporter"

const pickStatusCode = (message: string | undefined) => {
  if (!message) return 500
  if (message.includes("请选择至少一个合同")) return 400
  if (message.includes("未找到匹配的合同记录")) return 404
  return 500
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const contractIds = normalizeContractIds(body?.contractIds)

  try {
    const { buffer, filename } = await prepareContractsExport(contractIds)

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "导出失败"
    const status = pickStatusCode(message)
    return new Response(JSON.stringify({ message }), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  }
}

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ContractRecord } from "@/app/types/contract-analysis"

type DeviceRow = {
  id: string
  deviceName: string | null
  registrationNumber: string | null
  deviceModel: string | null
  geHostSystemNumber: string | null
  installationDate: string | null
  serviceStartDate: string | null
  serviceEndDate: string | null
  maintenanceFrequency: number | null
  responseTime: number | null
  arrivalTime: number | null
}

type MaintenanceRow = {
  id: string
  maintenanceScope: string | null
  includedPartsJson: string | null
  sparePartsSupport: string | null
  deepMaintenance: boolean | null
}

type DigitalRow = {
  id: string
  softwareProductName: string | null
  hardwareProductName: string | null
  quantity: number | null
  servicePeriod: string | null
}

type TrainingRow = {
  id: string
  trainingCategory: string | null
  applicableDevicesJson: string | null
  trainingTimes: number | null
  trainingPeriod: string | null
  trainingDays: number | null
  trainingSeats: number | null
  trainingCost: string | null
}

type ServiceInfoPayload = {
  devices: DeviceRow[]
  maintenanceServices: MaintenanceRow[]
  digitalSolutions: DigitalRow[]
  trainingSupports: TrainingRow[]
  complianceInfo?: {
    informationConfidentialityRequirements: boolean | null
    liabilityOfBreach: string | null
    partsReturnRequirements: string | null
    deliveryRequirements: string | null
    transportationInsurance: string | null
    deliveryLocation: string | null
  } | null
  afterSalesSupport?: {
    guaranteeRunningRate: number | null
    guaranteeMechanism: string | null
    serviceReportForm: string | null
    remoteService: string | null
    hotlineSupport: string | null
    taxFreePartsPriority: boolean | null
  } | null
}

export function ContractServiceInfoPanel({ contract, markdown }: { contract: ContractRecord | null; markdown: string }) {
  const [loading, setLoading] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ServiceInfoPayload | null>(null)

  const hasContract = Boolean(contract?.id)

  const load = useCallback(async () => {
    if (!hasContract) return
    try {
      setLoading("loading")
      setError(null)
      const res = await fetch(`/api/contracts/${contract!.id}/service-info`)
      if (!res.ok) throw new Error(`加载失败 ${res.status}`)
      const payload = (await res.json()) as ServiceInfoPayload
      setData(payload)
      setLoading("success")
    } catch (e) {
      setLoading("error")
      setError(e instanceof Error ? e.message : "加载失败")
    }
  }, [hasContract, contract])

  useEffect(() => {
    if (!hasContract) return
    void load()
  }, [hasContract, load])

  const handleAnalyze = useCallback(async () => {
    if (!hasContract) return
    try {
      setLoading("loading")
      setError(null)
      const res = await fetch(`/api/contracts/${contract!.id}/service-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      })
      if (!res.ok) throw new Error(`分析失败 ${res.status}`)
      const payload = (await res.json()) as ServiceInfoPayload & { source?: string }
      setData({
        devices: payload.devices ?? [],
        maintenanceServices: payload.maintenanceServices ?? [],
        digitalSolutions: payload.digitalSolutions ?? [],
        trainingSupports: payload.trainingSupports ?? [],
        complianceInfo: payload.complianceInfo ?? null,
        afterSalesSupport: payload.afterSalesSupport ?? null,
      })
      setLoading("success")
    } catch (e) {
      setLoading("error")
      setError(e instanceof Error ? e.message : "分析失败")
    }
  }, [hasContract, contract, markdown])

  const includedParts = useCallback((json: string | null) => {
    if (!json) return [] as string[]
    try {
      const arr = JSON.parse(json)
      return Array.isArray(arr) ? (arr.filter((x) => typeof x === "string") as string[]) : []
    } catch {
      return []
    }
  }, [])

  const applicableDevices = includedParts

  const banner = useMemo(() => {
    if (!hasContract) {
      return <div className="rounded border p-3 text-sm text-muted-foreground">请先上传并保存合同，再进行服务信息分析。</div>
    }
    return null
  }, [hasContract])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">合同服务信息拆解</h2>
          <p className="text-muted-foreground text-sm">拆解合同服务信息，包括设备信息、保养服务信息、数字化解决方案信息、培训支持信息、合同与合规信息、售后支持信息</p>
        </div>
        <button
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          onClick={handleAnalyze}
          disabled={!hasContract || loading === "loading"}
        >
          {loading === "loading" ? "分析中..." : "分析"}
        </button>
      </div>

      {banner}
      {error && <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      <div className="space-y-4">
        <section className="rounded-md border p-4">
          <h3 className="mb-2 text-lg font-medium">设备信息</h3>
          {data?.devices?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th>设备名称</th>
                    <th>注册证号</th>
                    <th>型号</th>
                    <th>系统编号</th>
                    <th>装机日期</th>
                    <th>服务期</th>
                    <th>保养/响应/到场</th>
                  </tr>
                </thead>
                <tbody>
                  {data.devices.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td>{d.deviceName ?? "-"}</td>
                      <td>{d.registrationNumber ?? "-"}</td>
                      <td>{d.deviceModel ?? "-"}</td>
                      <td>{d.geHostSystemNumber ?? "-"}</td>
                      <td>{d.installationDate ?? "-"}</td>
                      <td>{[d.serviceStartDate, d.serviceEndDate].filter(Boolean).join(" ~ ") || "-"}</td>
                      <td>{[d.maintenanceFrequency ?? "-", d.responseTime ?? "-", d.arrivalTime ?? "-"].join(" / ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">暂无数据</div>
          )}
        </section>

        <section className="rounded-md border p-4">
          <h3 className="mb-2 text-lg font-medium">保养服务</h3>
          {data?.maintenanceServices?.length ? (
            <ul className="space-y-2 text-sm">
              {data.maintenanceServices.map((m) => (
                <li key={m.id} className="border-t pt-2 first:border-0 first:pt-0">
                  <div>范围：{m.maintenanceScope ?? "-"}</div>
                  <div>包含部件：{includedParts(m.includedPartsJson).join("、") || "-"}</div>
                  <div>零备件支持：{m.sparePartsSupport ?? "-"}</div>
                  <div>深度保养：{m.deepMaintenance === null ? "-" : m.deepMaintenance ? "是" : "否"}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">暂无数据</div>
          )}
        </section>

        <section className="rounded-md border p-4">
          <h3 className="mb-2 text-lg font-medium">数字化解决方案</h3>
          {data?.digitalSolutions?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th>软件产品</th>
                    <th>硬件产品</th>
                    <th>数量</th>
                    <th>服务期间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.digitalSolutions.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td>{r.softwareProductName ?? "-"}</td>
                      <td>{r.hardwareProductName ?? "-"}</td>
                      <td>{r.quantity ?? "-"}</td>
                      <td>{r.servicePeriod ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">暂无数据</div>
          )}
        </section>

        <section className="rounded-md border p-4">
          <h3 className="mb-2 text-lg font-medium">培训支持</h3>
          {data?.trainingSupports?.length ? (
            <ul className="space-y-2 text-sm">
              {data.trainingSupports.map((t) => (
                <li key={t.id} className="border-t pt-2 first:border-0 first:pt-0">
                  <div>类别：{t.trainingCategory ?? "-"}</div>
                  <div>适用设备：{applicableDevices(t.applicableDevicesJson).join("、") || "-"}</div>
                  <div>培训次数：{t.trainingTimes ?? "-"}</div>
                  <div>培训周期：{t.trainingPeriod ?? "-"}</div>
                  <div>每次培训天数：{t.trainingDays ?? "-"}</div>
                  <div>每次培训名额：{t.trainingSeats ?? "-"}</div>
                  <div>费用信息：{t.trainingCost ?? "-"}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">暂无数据</div>
          )}
        </section>

        <section className="rounded-md border p-4">
          <h3 className="mb-2 text-lg font-medium">合同与合规信息</h3>
          {data?.complianceInfo ? (
            <ul className="space-y-2 text-sm">
              <li>信息保密要求：{data.complianceInfo.informationConfidentialityRequirements === null ? "-" : data.complianceInfo.informationConfidentialityRequirements ? "是" : "否"}</li>
              <li>违约责任：{data.complianceInfo.liabilityOfBreach ?? "-"}</li>
              <li>配件退还要求：{data.complianceInfo.partsReturnRequirements ?? "-"}</li>
              <li>交付要求：{data.complianceInfo.deliveryRequirements ?? "-"}</li>
              <li>运输保险：{data.complianceInfo.transportationInsurance ?? "-"}</li>
              <li>到货地点：{data.complianceInfo.deliveryLocation ?? "-"}</li>
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">暂无数据</div>
          )}
        </section>

        <section className="rounded-md border p-4">
          <h3 className="mb-2 text-lg font-medium">售后支持信息</h3>
          {data?.afterSalesSupport ? (
            <ul className="space-y-2 text-sm">
              <li>开机保证率：{data.afterSalesSupport.guaranteeRunningRate ?? "-"} %</li>
              <li>保证机制：{data.afterSalesSupport.guaranteeMechanism ?? "-"}</li>
              <li>服务报告形式：{data.afterSalesSupport.serviceReportForm ?? "-"}</li>
              <li>远程服务：{data.afterSalesSupport.remoteService ?? "-"}</li>
              <li>热线支持：{data.afterSalesSupport.hotlineSupport ?? "-"}</li>
              <li>保税库备件优先：{data.afterSalesSupport.taxFreePartsPriority === null ? "-" : data.afterSalesSupport.taxFreePartsPriority ? "是" : "否"}</li>
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">暂无数据</div>
          )}
        </section>
      </div>
    </div>
  )
}



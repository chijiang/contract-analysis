"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ContractRecord } from "@/app/types/contract-analysis"
import {
  createEmptyServiceInfoSnapshot,
  type AfterSalesSupportItem,
  type ContractComplianceItem,
  type DeviceInfo,
  type KeySparePartItem,
  type OnsiteSlaItem,
  type RemoteMaintenanceItem,
  type ServiceInfoSnapshotPayload,
  type TrainingSupportItem,
  type YearlyMaintenanceItem,
} from "@/app/types/service-info"

type FetchState = "idle" | "loading" | "success" | "error"

type ApiResponse = {
  source?: string
  snapshot?: unknown
}

const formatNumber = (value: number | null, options: { unit?: string; fractionDigits?: number } = {}) => {
  if (value === null || Number.isNaN(value)) {
    return "—"
  }
  const { unit, fractionDigits } = options
  const formatted =
    typeof fractionDigits === "number" ? Number(value).toFixed(fractionDigits) : Number(value).toString()
  return unit ? `${formatted} ${unit}` : formatted
}

const formatBoolean = (value: boolean | null, labels: { positive?: string; negative?: string } = {}) => {
  if (value === null) return "—"
  return value ? labels.positive ?? "是" : labels.negative ?? "否"
}

const formatList = (list: string[]) => (list.length ? list.join("、") : "—")

const renderLocateButton = (snippet: string | null, onLocateText?: (snippet: string) => void) => {
  if (!snippet || !onLocateText) return null
  return (
    <button
      type="button"
      onClick={() => onLocateText(snippet)}
      className="inline-flex h-7 items-center rounded-md border border-primary/40 bg-primary/5 px-2 text-xs text-primary transition hover:bg-primary/10"
    >
      在文本中定位
    </button>
  )
}

const renderDeviceTable = (devices: DeviceInfo[]) => {
  if (!devices.length) {
    return <div className="text-sm text-muted-foreground">暂无设备数据</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th>设备名称</th>
            <th>注册证号</th>
            <th>设备型号</th>
            <th>系统编号</th>
            <th>装机日期</th>
            <th>服务开始</th>
            <th>服务结束</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device, index) => (
            <tr key={`${device.geHostSystemNumber ?? index}`} className="border-t">
              <td>{device.deviceName ?? "-"}</td>
              <td>{device.registrationNumber ?? "-"}</td>
              <td>{device.deviceModel ?? "-"}</td>
              <td>{device.geHostSystemNumber ?? "-"}</td>
              <td>{device.installationDate ?? "-"}</td>
              <td>{device.serviceStartDate ?? "-"}</td>
              <td>{device.serviceEndDate ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const normalizeSnapshot = (input: unknown): ServiceInfoSnapshotPayload => {
  if (!input || typeof input !== "object") {
    return createEmptyServiceInfoSnapshot()
  }

  const snapshot = input as Partial<ServiceInfoSnapshotPayload>
  return {
    onsiteSla: Array.isArray(snapshot.onsiteSla) ? snapshot.onsiteSla : [],
    yearlyMaintenance: Array.isArray(snapshot.yearlyMaintenance) ? snapshot.yearlyMaintenance : [],
    remoteMaintenance: Array.isArray(snapshot.remoteMaintenance) ? snapshot.remoteMaintenance : [],
    trainingSupports: Array.isArray(snapshot.trainingSupports) ? snapshot.trainingSupports : [],
    contractCompliance: (snapshot.contractCompliance ?? null) as ContractComplianceItem | null,
    afterSalesSupport: (snapshot.afterSalesSupport ?? null) as AfterSalesSupportItem | null,
    keySpareParts: Array.isArray(snapshot.keySpareParts) ? snapshot.keySpareParts : [],
  }
}

const OnsiteSlaSection = ({ items, onLocateText }: { items: OnsiteSlaItem[]; onLocateText?: (snippet: string) => void }) => (
  <section className="rounded-md border p-4">
    <h3 className="mb-2 text-lg font-medium">到场维修服务 SLA</h3>
    {items.length === 0 ? (
      <div className="text-sm text-muted-foreground">暂无数据</div>
    ) : (
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={`onsite-${index}`} className="space-y-3 rounded-md border border-border/60 p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium">
                  服务类型：{item.serviceType ? item.serviceType : "未明确"}
                </div>
                <div className="text-sm text-muted-foreground">覆盖时段：{item.coverage ?? "—"}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm md:text-right">
                <div>响应时间：{formatNumber(item.responseTimeHours, { unit: "h" })}</div>
                <div>到场时间：{formatNumber(item.onSiteTimeHours, { unit: "h" })}</div>
              </div>
            </div>
            {renderDeviceTable(item.devices)}
            {renderLocateButton(item.originalContractSnippet, onLocateText)}
          </div>
        ))}
      </div>
    )}
  </section>
)

const YearlyMaintenanceSection = ({ items, onLocateText }: { items: YearlyMaintenanceItem[]; onLocateText?: (snippet: string) => void }) => (
  <section className="rounded-md border p-4">
    <h3 className="mb-2 text-lg font-medium">年度保养规划</h3>
    {items.length === 0 ? (
      <div className="text-sm text-muted-foreground">暂无数据</div>
    ) : (
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={`yearly-${index}`} className="space-y-3 rounded-md border border-border/60 p-3">
            <div className="font-medium">服务类型：{item.serviceType ?? "未明确"}</div>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div>标准保养次数：{formatNumber(item.standardPmPerYear)}</div>
              <div>精智保养次数：{formatNumber(item.smartPmPerYear)}</div>
              <div>远程保养次数：{formatNumber(item.remotePmPerYear)}</div>
              <div>保养范围：{formatList(item.scope)}</div>
              <div>交付物：{item.deliverables ?? "—"}</div>
              <div>排期要求：{item.scheduling ?? "—"}</div>
            </div>
            {renderDeviceTable(item.devices)}
            {renderLocateButton(item.originalContractSnippet, onLocateText)}
          </div>
        ))}
      </div>
    )}
  </section>
)

const RemoteMaintenanceSection = ({ items, onLocateText }: { items: RemoteMaintenanceItem[]; onLocateText?: (snippet: string) => void }) => (
  <section className="rounded-md border p-4">
    <h3 className="mb-2 text-lg font-medium">远程维护服务</h3>
    {items.length === 0 ? (
      <div className="text-sm text-muted-foreground">暂无数据</div>
    ) : (
      <div className="space-y-4">
        {items.map((item, index) => {
          const modalityCounts: Array<[string, number | null]> = [
            ["CT", item.ctRemotePmPerYear],
            ["MR", item.mrRemotePmPerYear],
            ["IGS", item.igsRemotePmPerYear],
            ["DR", item.drRemotePmPerYear],
            ["Mammo", item.mammoRemotePmPerYear],
            ["移动 DR", item.mobileDrRemotePmPerYear],
            ["骨密度", item.boneDensityRemotePmPerYear],
            ["超声", item.usRemotePmPerYear],
            ["其他", item.otherRemotePmPerYear],
          ]

          return (
            <div key={`remote-${index}`} className="space-y-3 rounded-md border border-border/60 p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="font-medium">服务类型：{item.serviceType ?? "未明确"}</div>
                <div className="text-sm text-muted-foreground">远程平台：{item.platform ?? "—"}</div>
              </div>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                {modalityCounts.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span>{label} 年度远程保养：</span>
                    <span>{formatNumber(value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <span>账号上限：</span>
                  <span>{formatNumber(item.prerequisitesMaxUsersPerDevice)}</span>
                </div>
                <div className="md:col-span-2">报告类型：{formatList(item.reports)}</div>
              </div>
              {renderLocateButton(item.originalContractSnippet, onLocateText)}
            </div>
          )
        })}
      </div>
    )}
  </section>
)

const TrainingSupportSection = ({ items, onLocateText }: { items: TrainingSupportItem[]; onLocateText?: (snippet: string) => void }) => (
  <section className="rounded-md border p-4">
    <h3 className="mb-2 text-lg font-medium">培训与交付支持</h3>
    {items.length === 0 ? (
      <div className="text-sm text-muted-foreground">暂无数据</div>
    ) : (
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={`training-${index}`} className="space-y-3 rounded-md border border-border/60 p-3">
            <div className="font-medium">培训类别：{item.trainingCategory ?? "未明确"}</div>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div>服务类型：{item.serviceType ?? "—"}</div>
              <div>适用设备：{formatList(item.applicableDevices)}</div>
              <div>培训次数：{formatNumber(item.trainingTimes)}</div>
              <div>培训周期：{item.trainingPeriod ?? "—"}</div>
              <div>每次天数：{formatNumber(item.trainingDays)}</div>
              <div>每次名额：{formatNumber(item.trainingSeats)}</div>
              <div className="md:col-span-2">费用说明：{item.trainingCost ?? "—"}</div>
            </div>
            {renderLocateButton(item.originalContractSnippet, onLocateText)}
          </div>
        ))}
      </div>
    )}
  </section>
)

const KeySparePartsSection = ({ items, onLocateText }: { items: KeySparePartItem[]; onLocateText?: (snippet: string) => void }) => (
  <section className="rounded-md border p-4">
    <h3 className="mb-2 text-lg font-medium">关键备件与部件保修</h3>
    {items.length === 0 ? (
      <div className="text-sm text-muted-foreground">暂无数据</div>
    ) : (
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={`spare-${index}`} className="space-y-3 rounded-md border border-border/60 p-3">
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div>服务类型：{item.serviceType ?? "—"}</div>
              <div>覆盖部件：{formatList(item.coveredItems)}</div>
              <div>更换策略：{item.replacementPolicy ?? "—"}</div>
              <div>旧件回收：{formatBoolean(item.oldPartReturnRequired)}</div>
              <div>不回收赔付上限：{formatNumber(item.nonReturnPenaltyPct, { unit: "%" })}</div>
              <div>物流承担方：{item.logisticsBy ?? "—"}</div>
              <div>发货/更换时效：{formatNumber(item.leadTimeBusinessDays, { unit: "个工作日" })}</div>
            </div>
            {item.tubes.length ? (
              <div>
                <h4 className="mb-2 font-medium">球管</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th>设备型号</th>
                        <th>系统编号</th>
                        <th>球管料号</th>
                        <th>生产企业</th>
                        <th>注册证号</th>
                        <th>合同开始</th>
                        <th>合同结束</th>
                        <th>响应时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.tubes.map((tube, tubeIndex) => (
                        <tr key={`tube-${tubeIndex}`} className="border-t">
                          <td>{tube.deviceModel ?? "-"}</td>
                          <td>{tube.geHostSystemNumber ?? "-"}</td>
                          <td>{tube.xrTubeId ?? "-"}</td>
                          <td>{tube.manufacturer ?? "-"}</td>
                          <td>{tube.registrationNumber ?? "-"}</td>
                          <td>{tube.contractStartDate ?? "-"}</td>
                          <td>{tube.contractEndDate ?? "-"}</td>
                          <td>{formatNumber(tube.responseTime, { unit: "h" })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">未识别球管信息</div>
            )}

            {item.coils.length ? (
              <div>
                <h4 className="mb-2 font-medium">线圈</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th>系统编号</th>
                        <th>订单号</th>
                        <th>线圈名称</th>
                        <th>序列号</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.coils.map((coil, coilIndex) => (
                        <tr key={`coil-${coilIndex}`} className="border-t">
                          <td>{coil.geHostSystemNumber ?? "-"}</td>
                          <td>{coil.coilOrderNumber ?? "-"}</td>
                          <td>{coil.coilName ?? "-"}</td>
                          <td>{coil.coilSerialNumber ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">未识别线圈信息</div>
            )}

            {renderLocateButton(item.originalContractSnippet, onLocateText)}
          </div>
        ))}
      </div>
    )}
  </section>
)

const ContractComplianceSection = ({ item }: { item: ContractComplianceItem | null }) => (
  <section className="rounded-md border p-4">
    <h3 className="mb-2 text-lg font-medium">合同与合规信息</h3>
    {!item ? (
      <div className="text-sm text-muted-foreground">暂无数据</div>
    ) : (
      <ul className="space-y-2 text-sm">
        <li>信息保密要求：{formatBoolean(item.informationConfidentialityRequirements)}</li>
        <li>违约责任：{item.liabilityOfBreach ?? "—"}</li>
        <li>配件退还要求：{item.partsReturnRequirements ?? "—"}</li>
        <li>交付要求：{item.deliveryRequirements ?? "—"}</li>
        <li>运输保险：{item.transportationInsurance ?? "—"}</li>
        <li>到货地点：{item.deliveryLocation ?? "—"}</li>
      </ul>
    )}
  </section>
)

const AfterSalesSupportSection = ({ item }: { item: AfterSalesSupportItem | null }) => (
  <section className="rounded-md border p-4">
    <h3 className="mb-2 text-lg font-medium">售后支持服务</h3>
    {!item ? (
      <div className="text-sm text-muted-foreground">暂无数据</div>
    ) : (
      <ul className="space-y-2 text-sm">
        <li>开机保证率：{formatNumber(item.guaranteeRunningRate, { unit: "%" })}</li>
        <li>保证机制：{item.guaranteeMechanism ?? "—"}</li>
        <li>服务报告形式：{item.serviceReportForm ?? "—"}</li>
        <li>远程服务：{item.remoteService ?? "—"}</li>
        <li>热线支持：{item.hotlineSupport ?? "—"}</li>
        <li>保税库备件优先：{formatBoolean(item.taxFreePartsPriority)}</li>
      </ul>
    )}
  </section>
)

export function ContractServiceInfoPanel({
  contract,
  markdown,
  onLocateText,
}: {
  contract: ContractRecord | null
  markdown: string
  onLocateText?: (snippet: string) => void
}) {
  const hasContract = Boolean(contract?.id)
  const [loading, setLoading] = useState<FetchState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<ServiceInfoSnapshotPayload>(() => createEmptyServiceInfoSnapshot())

  const load = useCallback(async () => {
    if (!hasContract) return
    try {
      setLoading("loading")
      setError(null)
      const res = await fetch(`/api/contracts/${contract!.id}/service-info`)
      if (!res.ok) throw new Error(`加载失败 ${res.status}`)
      const payload = (await res.json()) as ApiResponse
      setSnapshot(normalizeSnapshot(payload?.snapshot))
      setLoading("success")
    } catch (e) {
      setLoading("error")
      setError(e instanceof Error ? e.message : "加载失败")
      setSnapshot(createEmptyServiceInfoSnapshot())
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
      const payload = (await res.json()) as ApiResponse
      setSnapshot(normalizeSnapshot(payload?.snapshot))
      setLoading("success")
    } catch (e) {
      setLoading("error")
      setError(e instanceof Error ? e.message : "分析失败")
    }
  }, [hasContract, contract, markdown])

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
          <p className="text-muted-foreground text-sm">拆解合同中的维保、SLA、培训、备件与合规等关键信息，辅助交付团队理解合同承诺</p>
        </div>
        <button
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          onClick={handleAnalyze}
          disabled={!hasContract || loading === "loading"}
        >
          {loading === "loading" ? "分析中..." : "重新分析"}
        </button>
      </div>

      {banner}
      {error && <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      <div className="space-y-4">
        <OnsiteSlaSection items={snapshot.onsiteSla} onLocateText={onLocateText} />
        <YearlyMaintenanceSection items={snapshot.yearlyMaintenance} onLocateText={onLocateText} />
        <RemoteMaintenanceSection items={snapshot.remoteMaintenance} onLocateText={onLocateText} />
        <TrainingSupportSection items={snapshot.trainingSupports} onLocateText={onLocateText} />
        <KeySparePartsSection items={snapshot.keySpareParts} onLocateText={onLocateText} />
        <ContractComplianceSection item={snapshot.contractCompliance} />
        <AfterSalesSupportSection item={snapshot.afterSalesSupport} />
      </div>
    </div>
  )
}

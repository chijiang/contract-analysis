"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ContractRecord } from "@/app/types/contract-analysis"
import type { ServicePlanRecommendationResult } from "@/app/types/service-plan-recommendation"
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

const RATIONALE_MAX_LENGTH = 30

const truncateRationale = (text: string) => {
  const trimmed = text.trim()
  const chars = Array.from(trimmed)
  if (chars.length <= RATIONALE_MAX_LENGTH) return trimmed
  return `${chars.slice(0, RATIONALE_MAX_LENGTH).join("")}…`
}

const normalizeRecommendation = (value: ServicePlanRecommendationResult): ServicePlanRecommendationResult => ({
  summary: value.summary?.trim() ?? "",
  overallPlanId: value.overallPlanId ?? null,
  overallPlanName: value.overallPlanName ?? null,
  overallAdjustmentNotes: value.overallAdjustmentNotes?.trim() || null,
  matches: value.matches.map((match) => ({
    clauseId: match.clauseId,
    clauseType: match.clauseType,
    recommendedPlanId: match.recommendedPlanId,
    recommendedPlanName: match.recommendedPlanName,
    rationale: truncateRationale(match.rationale ?? ""),
    alternativePlanIds: match.alternativePlanIds?.map((id) => id.trim()).filter(Boolean) ?? [],
    alternativePlanNames: match.alternativePlanNames?.map((name) => name.trim()).filter(Boolean) ?? [],
  })),
})

function isRecommendationResult(value: unknown): value is ServicePlanRecommendationResult {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return typeof record.summary === "string" && Array.isArray(record.matches)
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
    servicePlanRecommendation: isRecommendationResult((snapshot as Record<string, unknown>).servicePlanRecommendation)
      ? normalizeRecommendation(
          (snapshot as { servicePlanRecommendation: ServicePlanRecommendationResult }).servicePlanRecommendation,
        )
      : null,
  }
}

const clauseTypeLabels: Record<string, string> = {
  onsite_sla: "现场SLA",
  yearly_maintenance: "年度保养",
  remote_maintenance: "远程维护",
  training_support: "培训支持",
  key_spare_parts: "关键备件",
}

const hasExplicitServiceType = (value: string | null | undefined) => Boolean(value && value.trim().length > 0)

const OnsiteSlaSection = ({ items, onLocateText }: { items: OnsiteSlaItem[]; onLocateText?: (snippet: string) => void }) => (
  <section className="rounded-md border p-4">
    <h3 className="mb-2 text-lg font-medium">到场维修服务 SLA</h3>
    {items.length === 0 ? (
      <div className="text-sm text-muted-foreground">暂无数据</div>
    ) : (
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={`onsite-${index}`} className="space-y-3 rounded-md border border-border/60 p-3">
              <div className="grid gap-x-4 gap-y-2 text-sm md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground shrink-0">服务类型</span>
                  <span className="rounded-md bg-primary/5 px-2 py-1 text-sm font-medium text-primary">
                    {item.serviceType ? item.serviceType : "未明确"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground shrink-0">覆盖时段</span>
                  <span className="text-sm">{item.coverage ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground shrink-0">响应时间</span>
                  <span className="rounded-md bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                    {formatNumber(item.responseTimeHours, { unit: "h" })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground shrink-0">到场时间</span>
                  <span className="rounded-md bg-green-50 px-2 py-1 text-sm font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-300">
                    {formatNumber(item.onSiteTimeHours, { unit: "h" })}
                  </span>
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
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-muted-foreground min-w-[4rem]">服务类型</span>
                <span className="rounded-md bg-primary/5 px-2 py-1 text-sm font-medium text-primary">
                  {item.serviceType ?? "未明确"}
                </span>
              </div>
            </div>
            <div className="grid gap-x-4 gap-y-2 text-sm md:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">标准保养次数</span>
                <span className="rounded-md bg-orange-50 px-2 py-1 font-semibold text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                  {formatNumber(item.standardPmPerYear)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">精智保养次数</span>
                <span className="rounded-md bg-purple-50 px-2 py-1 font-semibold text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                  {formatNumber(item.smartPmPerYear)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">远程保养次数</span>
                <span className="rounded-md bg-indigo-50 px-2 py-1 font-semibold text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
                  {formatNumber(item.remotePmPerYear)}
                </span>
              </div>
              <div className="flex items-center gap-2 lg:col-span-3">
                <span className="font-medium text-muted-foreground shrink-0">保养范围</span>
                <span className="rounded-md bg-gray-50 px-2 py-1 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300">
                  {formatList(item.scope)}
                </span>
              </div>
              <div className="flex items-center gap-2 lg:col-span-3">
                <span className="font-medium text-muted-foreground shrink-0">交付物</span>
                <span className="text-sm">{item.deliverables ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2 lg:col-span-3">
                <span className="font-medium text-muted-foreground shrink-0">排期要求</span>
                <span className="text-sm">{item.scheduling ?? "—"}</span>
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
              <div className="grid gap-x-4 gap-y-2 text-sm md:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground shrink-0">服务类型</span>
                  <span className="rounded-md bg-primary/5 px-2 py-1 text-sm font-medium text-primary">
                    {item.serviceType ?? "未明确"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground shrink-0">远程平台</span>
                  <span className="text-sm">{item.platform ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground shrink-0">账号上限</span>
                  <span className="rounded-md bg-teal-50 px-2 py-1 text-sm font-semibold text-teal-700 dark:bg-teal-900/20 dark:text-teal-300">
                    {formatNumber(item.prerequisitesMaxUsersPerDevice)}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="grid gap-x-4 gap-y-2 text-sm md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {modalityCounts.map(([label, value]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground shrink-0">{label} 年度远程保养</span>
                      <span className="rounded-md bg-cyan-50 px-2 py-1 font-semibold text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300">
                        {formatNumber(value)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t mt-3">
                  <span className="font-medium text-muted-foreground shrink-0">报告类型</span>
                  <span className="text-sm">{formatList(item.reports)}</span>
                </div>
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
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-muted-foreground min-w-[4rem]">培训类别</span>
                <span className="rounded-md bg-primary/5 px-2 py-1 text-sm font-medium text-primary">
                  {item.trainingCategory ?? "未明确"}
                </span>
              </div>
            </div>
            <div className="grid gap-x-4 gap-y-2 text-sm md:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">服务类型</span>
                <span className="text-sm">{item.serviceType ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">适用设备</span>
                <span className="rounded-md bg-gray-50 px-2 py-1 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300">
                  {formatList(item.applicableDevices)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">培训次数</span>
                <span className="rounded-md bg-pink-50 px-2 py-1 font-semibold text-pink-700 dark:bg-pink-900/20 dark:text-pink-300">
                  {formatNumber(item.trainingTimes)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">培训周期</span>
                <span className="text-sm">{item.trainingPeriod ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">每次天数</span>
                <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                  {formatNumber(item.trainingDays)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">每次名额</span>
                <span className="rounded-md bg-violet-50 px-2 py-1 font-semibold text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
                  {formatNumber(item.trainingSeats)}
                </span>
              </div>
              <div className="flex items-center gap-2 lg:col-span-3">
                <span className="font-medium text-muted-foreground shrink-0">费用说明</span>
                <span className="text-sm">{item.trainingCost ?? "—"}</span>
              </div>
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
            <div className="grid gap-x-4 gap-y-2 text-sm md:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">服务类型</span>
                <span className="text-sm">{item.serviceType ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">覆盖部件</span>
                <span className="rounded-md bg-gray-50 px-2 py-1 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300">
                  {formatList(item.coveredItems)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">更换策略</span>
                <span className="text-sm">{item.replacementPolicy ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">旧件回收</span>
                <span className="rounded-md bg-slate-50 px-2 py-1 text-slate-700 dark:bg-slate-900/20 dark:text-slate-300">
                  {formatBoolean(item.oldPartReturnRequired)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">不回收赔付上限</span>
                <span className="rounded-md bg-red-50 px-2 py-1 font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-300">
                  {formatNumber(item.nonReturnPenaltyPct, { unit: "%" })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">物流承担方</span>
                <span className="text-sm">{item.logisticsBy ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2 lg:col-span-3">
                <span className="font-medium text-muted-foreground shrink-0">发货/更换时效</span>
                <span className="rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                  {formatNumber(item.leadTimeBusinessDays, { unit: "个工作日" })}
                </span>
              </div>
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
      <div className="grid gap-x-4 gap-y-2 text-sm md:grid-cols-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-muted-foreground shrink-0">信息保密要求</span>
          <span className="rounded-md bg-slate-50 px-2 py-1 text-slate-700 dark:bg-slate-900/20 dark:text-slate-300">
            {formatBoolean(item.informationConfidentialityRequirements)}
          </span>
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <span className="font-medium text-muted-foreground shrink-0">违约责任</span>
          <span className="text-sm">{item.liabilityOfBreach ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <span className="font-medium text-muted-foreground shrink-0">配件退还要求</span>
          <span className="text-sm">{item.partsReturnRequirements ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <span className="font-medium text-muted-foreground shrink-0">交付要求</span>
          <span className="text-sm">{item.deliveryRequirements ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-muted-foreground shrink-0">运输保险</span>
          <span className="text-sm">{item.transportationInsurance ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-muted-foreground shrink-0">到货地点</span>
          <span className="text-sm">{item.deliveryLocation ?? "—"}</span>
        </div>
      </div>
    )}
  </section>
)

const AfterSalesSupportSection = ({ item }: { item: AfterSalesSupportItem | null }) => (
  <section className="rounded-md border p-4">
    <h3 className="mb-2 text-lg font-medium">售后支持服务</h3>
    {!item ? (
      <div className="text-sm text-muted-foreground">暂无数据</div>
    ) : (
      <div className="grid gap-x-4 gap-y-2 text-sm md:grid-cols-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-muted-foreground shrink-0">开机保证率</span>
          <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            {formatNumber(item.guaranteeRunningRate, { unit: "%" })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-muted-foreground shrink-0">保税库备件优先</span>
          <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
            {formatBoolean(item.taxFreePartsPriority)}
          </span>
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <span className="font-medium text-muted-foreground shrink-0">保证机制</span>
          <span className="text-sm">{item.guaranteeMechanism ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <span className="font-medium text-muted-foreground shrink-0">服务报告形式</span>
          <span className="text-sm">{item.serviceReportForm ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <span className="font-medium text-muted-foreground shrink-0">远程服务</span>
          <span className="text-sm">{item.remoteService ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <span className="font-medium text-muted-foreground shrink-0">热线支持</span>
          <span className="text-sm">{item.hotlineSupport ?? "—"}</span>
        </div>
      </div>
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
  const [recommendation, setRecommendation] = useState<ServicePlanRecommendationResult | null>(null)
  const [recommendationState, setRecommendationState] = useState<FetchState>("idle")
  const [recommendationError, setRecommendationError] = useState<string | null>(null)

  const ambiguousCounts = useMemo(() => {
    const countMissing = <T extends { serviceType: string | null }>(items: T[]) =>
      items.filter((item) => !hasExplicitServiceType(item.serviceType)).length
    const onsite = countMissing(snapshot.onsiteSla)
    const yearly = countMissing(snapshot.yearlyMaintenance)
    const remote = countMissing(snapshot.remoteMaintenance)
    const training = countMissing(snapshot.trainingSupports)
    const spare = countMissing(snapshot.keySpareParts)
    return {
      onsite,
      yearly,
      remote,
      training,
      spare,
      total: onsite + yearly + remote + training + spare,
    }
  }, [snapshot])

  const hasAmbiguousClauses = ambiguousCounts.total > 0

  const aggregates = useMemo(() => {
    if (!recommendation) return []
    const map = new Map<
      string,
      {
        planId: string
        planName: string
        count: number
      }
    >()
    for (const match of recommendation.matches) {
      if (!match.recommendedPlanId || !match.recommendedPlanName) continue
      const entry = map.get(match.recommendedPlanId)
      if (entry) {
        entry.count += 1
      } else {
        map.set(match.recommendedPlanId, { planId: match.recommendedPlanId, planName: match.recommendedPlanName, count: 1 })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [recommendation])

  const recommendButtonDisabled =
    !hasContract || loading === "loading" || recommendationState === "loading" || !hasAmbiguousClauses
  const recommendButtonTitle = !hasContract
    ? "请先上传合同"
    : !hasAmbiguousClauses
      ? "条款已包含服务类型，可直接参考下方结果"
      : undefined
  const recommendButtonLabel =
    recommendationState === "loading"
      ? "匹配中..."
      : recommendation
        ? "重新匹配服务计划"
        : "匹配服务计划"

  const load = useCallback(async () => {
    if (!hasContract) return
    try {
      setLoading("loading")
      setError(null)
      const res = await fetch(`/api/contracts/${contract!.id}/service-info`)
      if (!res.ok) throw new Error(`加载失败 ${res.status}`)
      const payload = (await res.json()) as ApiResponse
      const normalized = normalizeSnapshot(payload?.snapshot)
      setSnapshot(normalized)
      setRecommendation(normalized.servicePlanRecommendation)
      setRecommendationState(normalized.servicePlanRecommendation ? "success" : "idle")
      setRecommendationError(null)
      setLoading("success")
    } catch (e) {
      setLoading("error")
      setError(e instanceof Error ? e.message : "加载失败")
      setSnapshot(createEmptyServiceInfoSnapshot())
      setRecommendation(null)
      setRecommendationState("idle")
      setRecommendationError(null)
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
      setRecommendation(null)
      setRecommendationState("idle")
      setRecommendationError(null)
      const res = await fetch(`/api/contracts/${contract!.id}/service-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      })
      if (!res.ok) throw new Error(`分析失败 ${res.status}`)
      const payload = (await res.json()) as ApiResponse
      const normalized = normalizeSnapshot(payload?.snapshot)
      setSnapshot(normalized)
      setRecommendation(normalized.servicePlanRecommendation)
      setRecommendationState(normalized.servicePlanRecommendation ? "success" : "idle")
      setRecommendationError(null)
      setLoading("success")
    } catch (e) {
      setLoading("error")
      setError(e instanceof Error ? e.message : "分析失败")
      setRecommendation(null)
      setRecommendationState("idle")
      setRecommendationError(null)
    }
  }, [hasContract, contract, markdown])

  const handleRecommend = useCallback(async () => {
    if (!hasContract) return
    try {
      setRecommendationState("loading")
      setRecommendationError(null)
      const res = await fetch(`/api/contracts/${contract!.id}/service-plan-recommendation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        const message =
          payload && typeof payload === "object" && payload && typeof (payload as Record<string, unknown>).message === "string"
            ? String((payload as Record<string, unknown>).message)
            : `服务计划匹配失败 ${res.status}`
        throw new Error(message)
      }
      if (isRecommendationResult(payload)) {
        const normalized = normalizeRecommendation(payload)
        setRecommendation(normalized)
        setSnapshot((prev) => ({ ...prev, servicePlanRecommendation: normalized }))
        setRecommendationState("success")
      } else if (
        payload &&
        typeof payload === "object" &&
        typeof (payload as Record<string, unknown>).message === "string"
      ) {
        throw new Error(String((payload as Record<string, unknown>).message))
      } else {
        throw new Error("服务计划匹配结果格式异常")
      }
    } catch (e) {
      setRecommendation(null)
      setRecommendationState("error")
      setRecommendationError(e instanceof Error ? e.message : "服务计划匹配失败")
    }
  }, [hasContract, contract])

  const handleClearRecommendation = useCallback(() => {
    setRecommendation(null)
    setRecommendationState("idle")
    setRecommendationError(null)
  }, [])

  const banner = useMemo(() => {
    if (!hasContract) {
      return <div className="rounded border p-3 text-sm text-muted-foreground">请先上传并保存合同，再进行服务信息分析。</div>
    }
    return null
  }, [hasContract])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">合同服务信息拆解</h2>
          <p className="text-muted-foreground text-sm">
            拆解合同中的维保、SLA、培训、备件与合规等关键信息，辅助交付团队理解合同承诺
          </p>
          {hasContract && (
            <p className="mt-2 text-xs text-muted-foreground">
              {hasAmbiguousClauses
                ? recommendation
                  ? `已自动匹配服务计划，覆盖 ${ambiguousCounts.total} 条条款（${[
                      ambiguousCounts.onsite ? `现场SLA ${ambiguousCounts.onsite}` : null,
                      ambiguousCounts.yearly ? `年度保养 ${ambiguousCounts.yearly}` : null,
                      ambiguousCounts.remote ? `远程维护 ${ambiguousCounts.remote}` : null,
                      ambiguousCounts.training ? `培训支持 ${ambiguousCounts.training}` : null,
                      ambiguousCounts.spare ? `关键备件 ${ambiguousCounts.spare}` : null,
                    ]
                      .filter(Boolean)
                      .join(" / ") || "—"}）。`
                  : `检测到 ${ambiguousCounts.total} 条条款缺少服务类型，包含：${[
                      ambiguousCounts.onsite ? `现场SLA ${ambiguousCounts.onsite}` : null,
                      ambiguousCounts.yearly ? `年度保养 ${ambiguousCounts.yearly}` : null,
                      ambiguousCounts.remote ? `远程维护 ${ambiguousCounts.remote}` : null,
                      ambiguousCounts.training ? `培训支持 ${ambiguousCounts.training}` : null,
                      ambiguousCounts.spare ? `关键备件 ${ambiguousCounts.spare}` : null,
                    ]
                      .filter(Boolean)
                      .join(" / ") || "—"}。`
                : "当前条款均已附带服务类型，可直接查看下方明细。"}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleRecommend}
            disabled={recommendButtonDisabled}
            title={recommendButtonTitle}
          >
            {recommendButtonLabel}
          </button>
          <button
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleAnalyze}
            disabled={!hasContract || loading === "loading"}
          >
            {loading === "loading" ? "分析中..." : "重新分析"}
          </button>
        </div>
      </div>

      {banner}
      {error && <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {recommendationError && (
        <div className="rounded border border-orange-300/70 bg-orange-50 p-3 text-sm text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200">
          {recommendationError}
        </div>
      )}
      {recommendation && (
        <section className="space-y-4 rounded-md border border-primary/40 bg-primary/5 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-primary">服务计划匹配结果</h3>
                <p className="text-sm text-muted-foreground">{recommendation.summary || "暂无总结"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-primary font-medium">
                  推荐整体计划：{recommendation.overallPlanName ?? "暂未明确"}
                </span>
                {recommendation.overallAdjustmentNotes && (
                  <span className="text-xs text-muted-foreground">
                    调整建议：{recommendation.overallAdjustmentNotes}
                  </span>
                )}
              </div>
            </div>
            <button
              className="self-start rounded-md border border-primary/60 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/10"
              onClick={handleClearRecommendation}
            >
              隐藏结果
            </button>
          </div>
          {aggregates.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              {aggregates.map((entry) => (
                <span
                  key={entry.planId}
                  className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-primary"
                >
                  {entry.planName} × {entry.count}
                </span>
              ))}
            </div>
          )}
          <div className="overflow-x-auto">
            {recommendation.matches.length === 0 ? (
              <div className="text-sm text-muted-foreground">未识别到需要匹配的条款。</div>
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="pb-2">条款类型</th>
                    <th className="pb-2">推荐计划</th>
                    <th className="pb-2">匹配说明</th>
                    <th className="pb-2">备选计划</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendation.matches.map((match, index) => (
                    <tr key={`${match.clauseId}-${index}`} className="border-t border-border/60">
                      <td className="py-2 align-top text-sm font-medium text-muted-foreground">
                        {clauseTypeLabels[match.clauseType] ?? match.clauseType}
                      </td>
                      <td className="py-2 align-top text-sm">
                        {match.recommendedPlanName ?? (
                          <span className="text-muted-foreground">未推荐</span>
                        )}
                      </td>
                      <td className="py-2 align-top text-sm leading-relaxed">{match.rationale}</td>
                      <td className="py-2 align-top text-sm">
                        {match.alternativePlanNames.length
                          ? match.alternativePlanNames.join("、")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      <div className="space-y-4">
        {snapshot.onsiteSla.length > 0 && <OnsiteSlaSection items={snapshot.onsiteSla} onLocateText={onLocateText} />}
        {snapshot.yearlyMaintenance.length > 0 && (
          <YearlyMaintenanceSection items={snapshot.yearlyMaintenance} onLocateText={onLocateText} />
        )}
        {snapshot.remoteMaintenance.length > 0 && (
          <RemoteMaintenanceSection items={snapshot.remoteMaintenance} onLocateText={onLocateText} />
        )}
        {snapshot.trainingSupports.length > 0 && (
          <TrainingSupportSection items={snapshot.trainingSupports} onLocateText={onLocateText} />
        )}
        {snapshot.keySpareParts.length > 0 && (
          <KeySparePartsSection items={snapshot.keySpareParts} onLocateText={onLocateText} />
        )}
        {snapshot.contractCompliance && <ContractComplianceSection item={snapshot.contractCompliance} />}
        {snapshot.afterSalesSupport && <AfterSalesSupportSection item={snapshot.afterSalesSupport} />}
      </div>
    </div>
  )
}

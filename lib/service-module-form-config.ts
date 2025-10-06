import type { ServiceModuleType } from "@/lib/service-plans"

type FieldType = "text" | "textarea" | "number" | "checkbox" | "multiselect"

export type ServiceModuleFieldDefinition = {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  description?: string
  unit?: string
  options?: string[] // 用于多选下拉框的选项列表
}

export type ServiceModuleFormConfig = {
  summary: string
  fields: ServiceModuleFieldDefinition[]
}

type ModuleFormValues = Record<string, string | boolean | string[]>

export const SERVICE_MODULE_FORM_CONFIG: Record<ServiceModuleType, ServiceModuleFormConfig> = {
  responseArrival: {
    summary: "响应时间、到场时效与支持渠道配置",
    fields: [
      {
        key: "responseTimeHours",
        label: "响应时间 (小时)",
        type: "number",
        placeholder: "如 4",
      },
      {
        key: "onSiteTimeHours",
        label: "到场时间 (小时)",
        type: "number",
        placeholder: "如 12",
      },
      {
        key: "coverage",
        label: "服务覆盖时段",
        type: "text",
        placeholder: "如 24x7",
      },
      {
        key: "supportChannels",
        label: "支持与联系渠道",
        type: "multiselect",
        placeholder: "选择支持渠道",
        options: ["热线电话", "远程支持", "现场服务"],
      },
    ],
  },
  yearlyMaintenance: {
    summary: "年度保养频次与范围",
    fields: [
      {
        key: "standardPmPerYear",
        label: "标准保养频次 (次/年)",
        type: "number",
        placeholder: "如 3",
      },
      {
        key: "smartPmPerYear",
        label: "精智保养频次 (次/年)",
        type: "number",
        placeholder: "如 1",
      },
      {
        key: "remotePmPerYear",
        label: "远程保养频次 (次/年)",
        type: "number",
        placeholder: "如 2",
      },
      {
        key: "pmScope",
        label: "保养覆盖范围",
        type: "multiselect",
        placeholder: "选择保养覆盖范围",
        options: ["设备清洁", "性能测试", "校准", "机械检查", "电气检查", "深度保养", "非紧急性质的预防性维护"],
      },
      {
        key: "pmDeliverables",
        label: "交付物与报告",
        type: "textarea",
        placeholder: "如保养报告、质控记录等",
      },
      {
        key: "pmScheduling",
        label: "排期与提前期",
        type: "textarea",
        placeholder: "如提前7日沟通，年度固定窗口等",
      },
    ],
  },
  remoteMaintenance: {
    summary: "远程监测能力与频次",
    fields: [
      {
        key: "platform",
        label: "远程平台名称",
        type: "text",
        placeholder: "如 InSite, OnWatch 等",
      },
      {
        key: "ctRemotePmPerYear",
        label: "每年 CT 远程维护次数",
        type: "number",
        placeholder: "如 1",
      },
      {
        key: "mrRemotePmPerYear",
        label: "每年 MR 远程维护次数",
        type: "number",
        placeholder: "如 1",
      },
      {
        key: "drRemotePmPerYear",
        label: "每年 DR 远程维护次数",
        type: "number",
        placeholder: "如 1",
      },
      {
        key: "mammoRemotePmPerYear",
        label: "每年 Mammo 远程维护次数",
        type: "number",
        placeholder: "如 1",
      },
      {
        key: "mobileDrRemotePmPerYear",
        label: "每年 MobileDR 远程维护次数",
        type: "number",
        placeholder: "如 1",
      },
      {
        key: "boneDensityRemotePmPerYear",
        label: "每年 BoneDensity 远程维护次数",
        type: "number",
        placeholder: "如 1",
      },
      {
        key: "usRemotePmPerYear",
        label: "每年 US 远程维护次数",
        type: "number",
        placeholder: "如 1",
      },
      {
        key: "otherRemotePmPerYear",
        label: "每年 Other 远程维护次数",
        type: "number",
        placeholder: "如 1",
      },
      {
        key: "prerequisitesMaxUsersPerDevice",
        label: "每台设备的最大用户账号数",
        type: "number",
        placeholder: "如 4",
      },
      {
        key: "reports",
        label: "报告类型",
        type: "multiselect",
        placeholder: "选择报告类型",
        options: ["IPM", "usage", "alarms", "maintenance-log"],
      },
    ],
  },
  detectorEcg: {
    summary: "备件保修策略与物流责任",
    fields: [
      {
        key: "coverage",
        label: "保修覆盖范围",
        type: "textarea",
        placeholder: "如 X 射线球管、电源模组等",
      },
      {
        key: "logisticsResponsibility",
        label: "物流与费用承担",
        type: "textarea",
        placeholder: "如供应商负责寄送，客户承担关税等",
      },
      {
        key: "turnaroundTime",
        label: "备件更换时效 (小时)",
        type: "number",
        placeholder: "如 72",
      },
      {
        key: "advanceReplacement",
        label: "是否提供先行件",
        type: "checkbox",
        description: "勾选表示提供备用件/先行件服务",
      },
      {
        key: "additionalNotes",
        label: "其他说明",
        type: "textarea",
        placeholder: "如退回政策、质量保证期等",
      },
    ],
  },
  training: {
    summary: "培训类型、场次与差旅政策",
    fields: [
      {
        key: "trainingType",
        label: "培训类型",
        type: "text",
        placeholder: "如 现场培训/远程培训/混合式",
      },
      {
        key: "sessions",
        label: "培训场次 (次/年)",
        type: "number",
        placeholder: "如 3",
      },
      {
        key: "attendeesPerSession",
        label: "每场参训名额 (人)",
        type: "number",
        placeholder: "如 6",
      },
      {
        key: "durationDays",
        label: "单场时长 (天)",
        type: "number",
        placeholder: "如 2",
      },
      {
        key: "travelPolicy",
        label: "差旅政策",
        type: "textarea",
        placeholder: "如供应商承担讲师差旅，客户承担学员差旅",
      },
      {
        key: "certification",
        label: "认证/考核要求",
        type: "textarea",
        placeholder: "如需考试合格颁发证书",
      },
    ],
  },
  uptime: {
    summary: "开机率目标与补偿机制",
    fields: [
      {
        key: "uptimeTarget",
        label: "开机率目标 (%)",
        type: "number",
        placeholder: "如 98",
      },
      {
        key: "calculationWindowDays",
        label: "统计窗口 (天)",
        type: "number",
        placeholder: "如 90",
      },
      {
        key: "exclusions",
        label: "排除项说明",
        type: "textarea",
        placeholder: "如不可抗力、用户操作原因等",
      },
      {
        key: "compensationMechanism",
        label: "不达标补偿机制",
        type: "textarea",
        placeholder: "如提供额外服务、延长保修、违约金计算方式",
      },
    ],
  },
}

export function createDefaultModuleFormValues(type: ServiceModuleType): ModuleFormValues {
  const config = SERVICE_MODULE_FORM_CONFIG[type]
  const values: ModuleFormValues = {}
  for (const field of config.fields) {
    if (field.type === "checkbox") {
      values[field.key] = false
    } else if (field.type === "multiselect") {
      values[field.key] = []
    } else {
      values[field.key] = ""
    }
  }
  return values
}

export function modulePayloadToFormValues(
  type: ServiceModuleType,
  payload: unknown,
): ModuleFormValues | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null
  }
  const config = SERVICE_MODULE_FORM_CONFIG[type]
  const result = createDefaultModuleFormValues(type)
  const record = payload as Record<string, unknown>
  for (const field of config.fields) {
    const raw = record[field.key]
    if (field.type === "checkbox") {
      result[field.key] = Boolean(raw)
      continue
    }
    if (field.type === "multiselect") {
      if (Array.isArray(raw)) {
        result[field.key] = raw.map(item => String(item))
      } else {
        result[field.key] = []
      }
      continue
    }
    if (raw === undefined || raw === null) {
      result[field.key] = ""
    } else {
      result[field.key] = String(raw)
    }
  }
  return result
}

export function formValuesToModulePayload(
  type: ServiceModuleType,
  values: ModuleFormValues,
  options?: { strict?: boolean },
) {
  const strict = options?.strict ?? true
  const config = SERVICE_MODULE_FORM_CONFIG[type]
  const payload: Record<string, unknown> = {}
  for (const field of config.fields) {
    const raw = values[field.key]
    if (field.type === "checkbox") {
      payload[field.key] = Boolean(raw)
      continue
    }
    if (field.type === "multiselect") {
      if (Array.isArray(raw)) {
        payload[field.key] = raw.filter(item => item && typeof item === "string" && item.trim())
      } else {
        payload[field.key] = []
      }
      continue
    }
    const text = typeof raw === "string" ? raw.trim() : ""
    if (!text) {
      payload[field.key] = null
      continue
    }
    if (field.type === "number") {
      const num = Number(text)
      if (!Number.isFinite(num)) {
        if (strict) {
          throw new Error(`${field.label} 需要是数字`)
        }
        payload[field.key] = text
        continue
      }
      payload[field.key] = num
    } else {
      payload[field.key] = text
    }
  }
  return payload
}

export type { ModuleFormValues }

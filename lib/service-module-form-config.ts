import type { ServiceModuleType } from "@/lib/service-plans"

type FieldType = "text" | "textarea" | "number" | "checkbox"

export type ServiceModuleFieldDefinition = {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  description?: string
  unit?: string
}

export type ServiceModuleFormConfig = {
  summary: string
  fields: ServiceModuleFieldDefinition[]
}

type ModuleFormValues = Record<string, string | boolean>

export const SERVICE_MODULE_FORM_CONFIG: Record<ServiceModuleType, ServiceModuleFormConfig> = {
  responseArrival: {
    summary: "响应时间、到场时效与支持渠道配置",
    fields: [
      {
        key: "responseTimeWorkingHours",
        label: "工作日响应时间 (小时)",
        type: "number",
        placeholder: "如 4",
      },
      {
        key: "responseTimeOffHours",
        label: "非工作日响应时间 (小时)",
        type: "number",
        placeholder: "如 6",
      },
      {
        key: "arrivalTimeWorkingHours",
        label: "工作日到场时间 (小时)",
        type: "number",
        placeholder: "如 8",
      },
      {
        key: "arrivalTimeOffHours",
        label: "非工作日到场时间 (小时)",
        type: "number",
        placeholder: "如 12",
      },
      {
        key: "supportChannels",
        label: "支持与联系渠道",
        type: "textarea",
        placeholder: "热线、远程、现场等，建议每行一个",
      },
      {
        key: "escalationProcess",
        label: "升级流程说明",
        type: "textarea",
        placeholder: "如城市团队 → 区域专家 → 总部专家",
      },
    ],
  },
  yearlyMaintenance: {
    summary: "年度保养频次与范围",
    fields: [
      {
        key: "pmFrequencyPerYear",
        label: "年度保养频次 (次/年)",
        type: "number",
        placeholder: "如 2",
      },
      {
        key: "pmScope",
        label: "保养覆盖范围",
        type: "textarea",
        placeholder: "请描述保养包含的作业、部件、耗材等",
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
        placeholder: "如提前 7 日沟通，年度固定窗口等",
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
        key: "monitoringFrequency",
        label: "监测频次/覆盖",
        type: "textarea",
        placeholder: "如 7x24 远程监测，异常即刻通知等",
      },
      {
        key: "remotePm",
        label: "远程 PM 内容",
        type: "textarea",
        placeholder: "如季度远程健康检查、远程校准",
      },
      {
        key: "reporting",
        label: "报告与沟通机制",
        type: "textarea",
        placeholder: "如月度巡检报告、线上会议复盘",
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

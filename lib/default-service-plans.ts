import { type ServicePlanPayload } from "@/lib/service-plans"

const buildStandardClauses = (clauses: Array<Omit<NonNullable<ServicePlanPayload["clauses"]>[number], "orderIndex">>): NonNullable<ServicePlanPayload["clauses"]> => {
  return clauses.map((clause, index) => ({
    ...clause,
    orderIndex: index,
  }))
}

export const defaultServicePlanSeeds: ServicePlanPayload[] = [
  {
    name: "智初保",
    description: "覆盖常规工作时间的入门级保障，适合预算敏感且设备使用强度较低的场景。",
    clauses: buildStandardClauses([
      {
        category: "现场服务SLA",
        clauseItem: "响应与到场",
        requirement: "工作日 8:30-17:30 提供热线支持，4 小时内完成工程师电话响应，48 小时内安排现场到场处理。",
        notes: "国家法定节假日除外，如遇现场排期冲突，优先安排下一个工作日。",
      },
      {
        category: "现场服务SLA",
        clauseItem: "服务窗口",
        requirement: "提供周一至周五 8:30-17:30 现场支持，超出窗口的紧急需求按加急价格另行计费。",
      },
      {
        category: "年度保养",
        clauseItem: "保养频次与项目",
        requirement: "每年 2 次标准保养，覆盖设备清洁、机械检查、基础性能测试与安全自检。",
      },
      {
        category: "远程维护",
        clauseItem: "远程诊断支持",
        requirement: "每季度 1 次远程健康巡检，形成巡检摘要邮件，提供潜在风险提示。",
      },
      {
        category: "培训支持",
        clauseItem: "用户培训",
        requirement: "每年提供 1 场 2 小时在线培训，介绍日常使用规范与基础维护注意事项。",
      },
      {
        category: "备件保障",
        clauseItem: "备件策略",
        requirement: "常用易损件以优惠价供应，关键备件按需报价，需回收旧件进行返修再利用。",
      },
    ]),
  },
  {
    name: "智优保",
    description: "在基础服务上提升响应效率与保养深度，适用于核心临床科室的主力设备。",
    clauses: buildStandardClauses([
      {
        category: "现场服务SLA",
        clauseItem: "响应与到场",
        requirement: "提供 7x12 支持，白班 4 小时内响应、24 小时内到场；夜间收到报修后次日上午优先排期现场。",
        notes: "7x12 指工作日及周末白天 8:00-20:00，夜间可电话初步研判。",
      },
      {
        category: "年度保养",
        clauseItem: "保养频次与项目",
        requirement: "每年 3 次标准保养 + 1 次精智保养，增加性能校准与电子系统深度检查。",
      },
      {
        category: "远程维护",
        clauseItem: "远程监测",
        requirement: "每月远程健康巡检一次，发现异常立即推送预警并提供优化建议。",
      },
      {
        category: "培训支持",
        clauseItem: "培训组合",
        requirement: "每年 1 次现场操作培训 + 1 次在线案例复盘培训，覆盖 10 名学员。",
      },
      {
        category: "备件保障",
        clauseItem: "备件覆盖",
        requirement: "核心功能模块备件费用包含在计划内，高价值部件（如球管）按 70% 折扣计价。",
      },
      {
        category: "增值服务",
        clauseItem: "运营评估",
        requirement: "每年提供一次设备运行效率评估报告，给出关键性能指标及改善建议。",
      },
    ]),
  },
  {
    name: "智享保",
    description: "提供 24x7 响应与全周期预测性维护，满足高稼动率设备的连续运营需求。",
    clauses: buildStandardClauses([
      {
        category: "现场服务SLA",
        clauseItem: "响应与到场",
        requirement: "24x7 全天候值守，1 小时内电话响应，12 小时内工程师现场到达并定位故障。",
        notes: "若需跨区域调配工程师，提前告知预计到场时间并同步进展。",
      },
      {
        category: "年度保养",
        clauseItem: "保养频次与项目",
        requirement: "每年 4 次标准保养 + 2 次深度保养，覆盖性能标定、关键模块拆检与润滑调校。",
      },
      {
        category: "远程维护",
        clauseItem: "预测性监测",
        requirement: "启用设备远程监测平台，全天候采集关键指标，异常即刻推送并自动生成工单建议。",
      },
      {
        category: "培训支持",
        clauseItem: "培训体系",
        requirement: "年度 2 次现场实操班 + 2 次在线技能升级课，灵活支持新上岗人员培训。",
      },
      {
        category: "备件保障",
        clauseItem: "备件策略",
        requirement: "关键备件及易耗件全包，支持现场置换，旧件无需回收即可置换为再制造件。",
      },
      {
        category: "运营增值",
        clauseItem: "设备绩效复盘",
        requirement: "每半年一次绩效洞察会议，提供利用率、平均故障间隔等关键指标对比分析。",
      },
    ]),
  },
  {
    name: "智协保",
    description: "打造“设备+流程”一体化协同机制，提供驻场顾问、专属备件池与全景培训支持。",
    clauses: buildStandardClauses([
      {
        category: "现场服务SLA",
        clauseItem: "驻场与应急",
        requirement: "核心时段驻场工程师巡检，1 小时内现场响应，6 小时内完成关键部件更换或稳定方案。",
        notes: "驻场时段可根据医院高峰期定制，支持多设备集群联保。",
      },
      {
        category: "年度保养",
        clauseItem: "多层级维护",
        requirement: "每年 6 次综合维护：4 次标准+2 次深度，辅以季度运行数据回顾与优化计划。",
      },
      {
        category: "远程维护",
        clauseItem: "协同运营中心",
        requirement: "接入厂家运营指挥中心，提供实时性能监控、预测性维护及流程协同排程。",
      },
      {
        category: "培训支持",
        clauseItem: "能力发展",
        requirement: "不限次数在线微课，年度 2 次高级认证培训，附带实践考核与证书。",
      },
      {
        category: "备件保障",
        clauseItem: "专属备件池",
        requirement: "建立院内冷备件池，常用器件 4 小时内完成更换，稀缺关键件享优先供应权。",
      },
      {
        category: "管理服务",
        clauseItem: "客户成功顾问",
        requirement: "配备专属客户成功经理，每季度开展双向评估会议并更新协同行动计划。",
      },
    ]),
  },
]

export type StandardClauseSeed = {
  category: string
  clauseItem: string
  standard: string
  riskLevel?: string
}

export const defaultStandardClauses: StandardClauseSeed[] = [
  {
    category: "价格与支付",
    clauseItem: "合同总价款及付款方式",
    standard:
      "在合同生效后，甲方应在如下规定时间30日内将当期款项以电汇、转账或支票方式付至乙方账号。分期付款日期在条款中逐期列明。",
  },
  {
    category: "价格与支付",
    clauseItem: "乙方收款账户",
    standard:
      "账户：通用电气医疗系统贸易发展（上海）有限公司；账号：31001577914050003427；开户行：中国建设银行上海金杨支行。",
  },
  {
    category: "交付与运输",
    clauseItem: "交付期",
    standard: "乙方应在合同生效起30天内根据产品周期安排硬件交付。",
  },
  {
    category: "交付与运输",
    clauseItem: "所有权及风险转移",
    standard: "硬件的所有权和风险在交付时转移给甲方。",
  },
  {
    category: "交付与运输",
    clauseItem: "运输及保险",
    standard: "由乙方为甲方办理运输和保险（到运输目的地），费用由乙方承担。",
  },
  {
    category: "保修与服务",
    clauseItem: "硬件保修期间与限制",
    standard:
      "硬件保修同本合同主机保修时间；若甲方或第三方违反操作/维护规程或对货物构成、设计、功能等变更，乙方有权终止保修义务。",
  },
  {
    category: "保修与服务",
    clauseItem: "探头更换质保起始",
    standard: "上述更换探头质保期为90天，自安装之日起起保；质保期内问题不额外占用更换名额（仅合同期内有效）。",
  },
  {
    category: "保修与服务",
    clauseItem: "远程服务与网络要求",
    standard:
      "甲方应提供安全稳定的网络环境；若禁用InSite或网络不支持远程接入导致无法提供数字化服务，乙方不承担责任；可书面取消远程连接并回收网络连接设备。",
  },
  {
    category: "知识产权/保密/合规",
    clauseItem: "知识产权归属及限制",
    standard:
      "服务与产品的知识产权（名称、商标、专利、设备包装等）归乙方及生产商所有；甲方或最终用户不得复制、出售或出版乙方提供的软件及任何书面文件。",
  },
  {
    category: "知识产权/保密/合规",
    clauseItem: "信息保密义务",
    standard:
      "双方对涉及价格、服务/产品配置及知识产权的相关信息负有保密义务；未经书面同意不得向第三方或公众披露。",
  }
]

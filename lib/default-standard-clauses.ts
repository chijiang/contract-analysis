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
    category: "价格与支付",
    clauseItem: "逾期付款违约金",
    standard:
      "如果甲方在付款条款规定的期限内30天仍未支付，乙方可中止或解除合同，并要求支付到期应付款及违约金；违约金按每7天以合同总价格的0.3%计算（部分版本为按未支付金额的0.3%/7天）。",
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
    category: "交付与运输",
    clauseItem: "包装条款",
    standard: "按乙方标准货物包装。",
  },
  {
    category: "交付与运输",
    clauseItem: "到货地点",
    standard: "以合同所列为准（示例：陕西/山东医院）。",
  },
  {
    category: "交付与运输",
    clauseItem: "安装与调试",
    standard:
      "安装费用由乙方承担；甲方在检验期内（到货后一个工作日内）需就数量与外观提出异议，否则视为符合约定。",
  },
  {
    category: "数字化解决方案（Future Deliverables）",
    clauseItem: "网站访问开通",
    standard:
      "乙方应在合同正式生效起30天内通过电子邮件形式向甲方提供网站权限开通的必要信息；每个用户最多不超过4个名额且独立使用。",
  },
  {
    category: "数字化解决方案（Future Deliverables）",
    clauseItem: "可用数据/报告类型",
    standard:
      "网站提供历史维修报告、相关设备使用报告；包含维修服务记录、远程维修报告、合同管理信息；具IPM机型提供使用统计（IPM报告）。",
  },
  {
    category: "数字化解决方案（Future Deliverables）",
    clauseItem: "软件年费项目",
    standard: "合同列明 APM-CT / APM-MR / APM-IB 等“软件年费”项目，随主机保修期。",
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
    clauseItem: "球管更换发货时效",
    standard: "在合同有效期内，经乙方工程师确认后，乙方负责免费更换球管；发货时间为乙方确认后的两个工作日内。",
  },
  {
    category: "保修与服务",
    clauseItem: "制冷系统质量担保",
    standard:
      "制冷系统备件（冷头、压机、水冷机、吸附器等）及液态介质符合GE全球工艺及装运地说明书标准，无材料和使用缺陷。",
  },
  {
    category: "保修与服务",
    clauseItem: "探测器保修与产权",
    standard:
      "合同期内探测器使用权归甲方；乙方提供及甲方交付的探测器产权约定从属乙方；到期时甲方拥有正在使用探测器的使用权及产权。",
  },
  {
    category: "保修与服务",
    clauseItem: "响应与服务时间",
    standard: "热线4008128188；响应时间通常为自报修起4小时内；服务时间周一至周五8:30-17:30（法定节假日除外）。",
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
  },
  {
    category: "知识产权/保密/合规",
    clauseItem: "不可抗力",
    standard:
      "因不可抗力导致无法履行，无需承担违约责任；应及时通知并提供证明，协商决定终止/推迟或部分/全部免除义务。",
  },
  {
    category: "知识产权/保密/合规",
    clauseItem: "合同解除与责任限制",
    standard:
      "除不可抗力等情形外，一方不再履行的，另一方有权解除并按约赔偿；任何情况下责任不超过当期服务合同价款，且不承担间接损失。",
  },
  {
    category: "知识产权/保密/合规",
    clauseItem: "应收账款转让（保理）",
    standard:
      "乙方可将合同项下应收账款转让给关联企业或合作金融机构；转让前向甲方书面通知，转让后乙方仍履行义务；该等行为不受合同转让及保密条款约束。",
  },
  {
    category: "争议解决/文本效力",
    clauseItem: "争议解决与适用法",
    standard:
      "如协商不成，提交北京仲裁委员会仲裁；仲裁裁决为终局，对双方有约束力；适用中华人民共和国法律（部分文本存在改为合同签订地法院诉讼的版本）。",
  },
  {
    category: "争议解决/文本效力",
    clauseItem: "文本份数与手写改动",
    standard: "合同正本一式两份或六份，经签字盖章生效；任何对条款的手写改动均无效。",
  },
  {
    category: "其他补充",
    clauseItem: "热线与服务联系人",
    standard: "400电话热线：4008128188；服务时间周一至周日8:00-22:00（热线）；现场服务时间周一至周五8:30-17:30。",
  },
  {
    category: "其他补充",
    clauseItem: "制造厂商/供方资质",
    standard: "GE原厂制造商或经GE认证的供应商。",
  },
  {
    category: "维保SLA",
    clauseItem: "热线服务时间",
    standard: "400电话服务时间：周一至周日8:00至22:00 或 7:00至22:00。",
  },
  {
    category: "维保SLA",
    clauseItem: "响应时间（智享保/通用SLA）",
    standard: "响应时间：乙方应在收到甲方拨打400电话后4小时内响应。",
  },
  {
    category: "维保SLA",
    clauseItem: "服务时间（到场服务窗口）",
    standard: "服务时间：周一至周五8:30至17:30，国家法定假日除外。",
  },
  {
    category: "维保SLA",
    clauseItem: "智优保（ZUB）保养次数（每年）",
    standard: "保养次数（每年）：4次。",
  },
  {
    category: "维保SLA",
    clauseItem: "智优保（ZUB）响应时间",
    standard: "响应时间：12小时。",
  },
  {
    category: "维保SLA",
    clauseItem: "智优保（ZUB）到场时间",
    standard: "到场时间：48小时。",
  },
  {
    category: "维保SLA",
    clauseItem: "智享保（CCS-ZXB）保养次数（每年）",
    standard: "标准保养次数（每年）：1；精智保养次数（每年）：1；远程保养次数（每年）：2。",
  },
  {
    category: "维保SLA",
    clauseItem: "远程预防性保养次数 - InSite远程数字化服务（版本一）",
    standard: "每年提供CT设备4；MR设备4；IGS设备2次远程预防性保养。",
  },
  {
    category: "维保SLA",
    clauseItem: "远程预防性保养次数 - InSite远程数字化服务（版本二）",
    standard: "在合同有效期内…为设备提供24小时远程检测以及每年提供两次远程预防性保养。",
  },
  {
    category: "维保SLA",
    clauseItem: "关键手术原厂FE现场待命",
    standard: "每年不超过四次，每次不超过四小时，甲方需提前一个月向乙方预约。",
  },
  {
    category: "维保SLA",
    clauseItem: "人工维修次数",
    standard: "在合同有效期内…该人工维修不限次数。",
  },
  {
    category: "相关时限",
    clauseItem: "旧件退回期限（球管/管套）",
    standard: "甲方应当在球管安装调试完毕后7日内将旧管套退还给乙方。",
  },
  {
    category: "相关时限",
    clauseItem: "TUI 球管服务 - 发货时效（球管）",
    standard: "发货时间为乙方确认后的两个工作日内。",
  },
  {
    category: "相关时限",
    clauseItem: "制冷系统备件 - 发货时效（制冷系统备件）",
    standard: "发货时间为乙方确认后的五个工作日内。",
  },
]

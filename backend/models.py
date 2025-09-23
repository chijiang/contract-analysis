from pydantic import BaseModel, Field
from enum import Enum
from typing import List, Optional


# basic types
class StandardClauses(BaseModel):
    category: str
    item: str
    standard_text: str
    risk_level: Optional[str] = Field(None, description="风险等级")

# requests
class NonStandardDetectionRequest(BaseModel):
    content: str
    standard_clauses: Optional[List[StandardClauses]] = Field(None, description="标准条款")

class InfoExtractionRequest(BaseModel):
    content: str


## 输出model
class Compliance(str, Enum):
    COMPLETELY_CONFORM = "符合标准"
    NOT_CONFORM = "不符合标准"
    NOT_INVOLVED = "标准中未涉及"

class RiskLevel(str, Enum):
    HIGH = "高"
    MEDIUM = "中"
    LOW = "低"
    NONE = "无"

class Risk(BaseModel):
    level: RiskLevel = Field(..., description="条款的风险等级")
    opinion: str = Field(..., description="为何定级：指出关键差异点、引发的法律/商业风险、潜在损失或不确定性。")
    recommendation: str = Field(..., description="建议用语/替代表达/补充条款，或回调到标准文本的建议。")

# class Location(BaseModel):
#     heading_path: List[str] = Field(..., description="条款的标题路径", example = ["## 三、交付与验收", "### 3.1 交货期"])
#     section_title: str = Field(..., description="最小标题文本或“第X条”", example = "3.1 交货期")
#     snippet: str = Field(..., description="该条款中最能体现约束的原文片段（20~60字）", example = "乙方应在合同生效起30天内根据产品周期安排硬件交付……")

class StandardReference(BaseModel):
    standard_text: str = Field(..., description="标准约定原文", example = "乙方应在合同生效起30天内根据产品周期安排硬件交付……")
    clause_category: str = Field(..., description="条款所属类别", example = "交付与运输")
    clause_item: str = Field(..., description="具体条款项", example = "交付期")

class ExtractedClause(BaseModel):
    clause_category: str = Field(..., description="条款所属类别", example = "交付与运输")
    clause_item: str = Field(..., description="具体条款项", example = "交付期")
    contract_snippet: str = Field(..., description="该条款中最能体现约束的原文片段")
    standard_reference: StandardReference = Field(..., description="标准文本的来源")
    compliance: Compliance = Field(..., description="条款的合规情况")
    risk: Risk = Field(..., description="条款的风险情况")

class MissingStandardItem(BaseModel):
    clause_category: str = Field(..., description="条款所属类别", example = "价格与支付")
    clause_item: str = Field(..., description="具体条款项", example = "发票/开票条款")
    why_important: str = Field(..., description="为何重要：指出该条款的重要性、必要性或缺失原因")

class LlmAnalysisResult(BaseModel):
    extracted_clauses: List[ExtractedClause] = Field(..., description="抽取的条款")

class BasicInfoExtractionResult(BaseModel):
    contract_number: str = Field(..., description="合同编号，如果合同中没有编号，则返回空字符串")
    contract_name: str = Field(..., description="合同名称，如果合同中没有名称，则返回空字符串")
    party_a: str = Field(..., description="甲方名称，如果合同中没有甲方，则返回空字符串")
    party_b: str = Field(..., description="乙方名称，如果合同中没有乙方，则返回空字符串")
    contract_start_date: str = Field(..., description="合同开始日期 格式为YYYY/MM/DD，如果合同中没有开始日期，则返回空字符串")
    contract_end_date: str = Field(..., description="合同结束日期 格式为YYYY/MM/DD，如果合同中没有结束日期，则返回空字符串")
    contract_total_amount: Optional[float] = Field(None, description="合同总金额")
    contract_payment_method: str = Field(..., description="付款方式，如果合同中没有付款方式，则返回空字符串")
    contract_currency: str = Field(..., description="币种，如果合同中没有币种，则返回空字符串", example = "CNY")


class DeviceInfoModel(BaseModel):
    device_name: str = Field(..., description="设备名称，如果合同中没有设备名称，则返回空字符串")
    registration_number: str = Field(..., description="注册证号，如果合同中没有注册证号，则返回空字符串")
    device_model: str = Field(..., description="设备型号，如果合同中没有设备型号，则返回空字符串")
    ge_host_system_number: str = Field(..., description="GE 主机系统编号，如果合同中没有GE 主机系统编号，则返回空字符串")
    installation_date: str = Field(..., description="装机日期，格式为YYYY/MM/DD，如果合同中没有装机日期，则返回空字符串")
    service_start_date: str = Field(..., description="合同服务开始日期，格式为YYYY/MM/DD，如果合同中没有服务开始日期，则返回空字符串")
    service_end_date: str = Field(..., description="合同服务结束日期，格式为YYYY/MM/DD，如果合同中没有服务结束日期，则返回空字符串")
    maintenance_frequency: Optional[int] = Field(None, description="保养次数（每年）")
    response_time: Optional[float] = Field(None, description="响应时间，单位：小时")
    arrival_time: Optional[float] = Field(None, description="到场时间，单位：小时")

class DeviceInfoExtractionResult(BaseModel):
    devices: List[DeviceInfoModel] = Field(..., description="所有设备信息列表")


class MaintenanceServiceInfoModel(BaseModel):
    maintenance_scope: str = Field(..., description="保修范围, 例如：主机保修 / 探测器保修 / 线圈保用 / 磁体险 / 制冷系统保用")
    included_parts: List[str] = Field(..., description="包含部件", example = ["冷头", "氦压机", "液氦灌注", "梯度线圈"])
    spare_parts_support: str = Field(..., description="零备件支持, 例如：免费更换 / 七折优惠 / 不含")
    deep_maintenance: bool = Field(..., description="深度保养，是否包含每年一次深度保养")

class MaintenanceServiceInfoExtractionResult(BaseModel):
    maintenance_services: List[MaintenanceServiceInfoModel] = Field(..., description="所有保养服务信息列表")

class DigitalSolutionInfoModel(BaseModel):
    software_product_name: str = Field(..., description="软件产品名称", examples = ["APM-CT", "APM-MR", "APM-IB"])
    hardware_product_name: str = Field(..., description="硬件产品名称", examples = "装备守护_CT_初装")
    quantity: int = Field(..., description="数量", example = 1)
    service_period: str = Field(..., description="服务期间", example = "同主机保修时间")

class DigitalSolutionInfoExtractionResult(BaseModel):
    digital_solutions: List[DigitalSolutionInfoModel] = Field(..., description="所有数字化解决方案信息列表")


class TrainingSupportInfoModel(BaseModel):
    training_category: str = Field(..., description="培训类别", examples = ["临床应用现场培训", "临床应用课堂培训", "医疗设备管理培训", "医院工程师培训"])
    applicable_devices: List[str] = Field(..., description="适用设备", example = ["CT750", "MR750", "IB750"])
    training_times: Optional[int] = Field(None, description="培训次数", example = 6)
    training_period: str = Field(..., description="培训周期", example = "合同期内3年")
    training_days: Optional[int] = Field(None, description="每次培训天数", example = 2)
    training_seats: Optional[int] = Field(None, description="培训名额", example = 5)
    training_cost: Optional[str] = Field(None, description="培训费用相关信息", examples = ["乙方承担交通/住宿/会务", "乙方不承担费用"])

class TrainingSupportInfoExtractionResult(BaseModel):
    training_supports: List[TrainingSupportInfoModel] = Field(..., description="所有培训支持信息列表")

class AfterSalesSupportInfoModel(BaseModel):
    guarantee_running_rate: Optional[float] = Field(None, description="开机保证率，如未提及返回null", example = 93)
    guarantee_mechanism: str = Field(..., description="保证机制", example = "超出停机时间则顺延保修期")
    service_report_form: str = Field(..., description="服务报告形式", examples = ["现场纸质", "Email", "系统下载"])
    remote_service: str = Field(..., description="远程服务", examples = ["InSite 远程监控", "无远程服务"])
    hotline_support: str = Field(..., description="热线支持", example = "400-8128188" )
    tax_free_parts_priority: bool = Field(False, description="保税库备件优先")

class ContractAndComplianceInfoExtractionResult(BaseModel):
    information_confidentiality_requirements: bool = Field(True, description="信息保密要求")
    liability_of_breach: str = Field(..., description="违约责任，如有多条，使用markdown格式拆分子弹点", example = "培训逾期不补课，不退款")
    parts_return_requirements: str = Field(..., description="配件退还要求", example = "新件更换后三日内归还旧件，逾期补偿30%")
    delivery_requirements: str = Field(..., description="交付要求", example = "合同生效30天内交付硬件")
    transportation_insurance: str = Field(..., description="运输保险", examples = ["乙方承担", "甲方承担"])
    delivery_location: str = Field("", description="到货地点")
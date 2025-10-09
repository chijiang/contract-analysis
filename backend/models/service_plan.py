from __future__ import annotations

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


# =============== Enums（str） ===============
class RemotePlatform(str, Enum):
    InSite = "InSite"
    Vendor = "Vendor"
    ThirdParty = "ThirdParty"

class ReplacementPolicy(str, Enum):
    advance_exchange = "advance-exchange"
    on_site = "on-site"
    return_to_base = "return-to-base"


class LogisticsBy(str, Enum):
    vendor = "vendor"
    buyer = "buyer"

# =============== 1) 到场维修服务SLA（单值） ===============
class DeviceInfoModel(BaseModel):
    device_name: str = Field(..., description="设备名称，如果合同中没有设备名称，则返回空字符串")
    registration_number: str = Field(..., description="注册证号，如果合同中没有注册证号，则返回空字符串")
    device_model: str = Field(..., description="设备型号，如果合同中没有设备型号，则返回空字符串")
    ge_host_system_number: str = Field(..., description="GE 主机系统编号，如果合同中没有GE 主机系统编号，则返回空字符串")
    installation_date: str = Field(..., description="装机日期，格式为YYYY/MM/DD，如果合同中没有装机日期，则返回空字符串")
    service_start_date: str = Field(..., description="合同服务开始日期，格式为YYYY/MM/DD，如果合同中没有服务开始日期，则返回空字符串")
    service_end_date: str = Field(..., description="合同服务结束日期，格式为YYYY/MM/DD，如果合同中没有服务结束日期，则返回空字符串")

class ResponseArrivalParams(BaseModel):
    """到场维修服务SLA 参数（单值）：响应、到场、覆盖与渠道"""
    model_config = ConfigDict(use_enum_values=True)

    service_type: Optional[str] = Field(None, description="合同类型，如明确标注则返回（如：智享保A），否则返回null")
    response_time_hours: Optional[float] = Field(..., description="报修在线响应时间（小时）")
    on_site_time_hours: Optional[float] = Field(..., description="到场时间（小时）")
    coverage: str = Field("24x7", description="服务覆盖时段", example="周一至周五8:30至17:30, 国家法定假日除外")
    original_contract_snippet: str = Field(..., description="原始合同片段，原文摘录一定要与原文保持一致，不要做任何修改，也**不得对标点符号、空格或格式做任何修改**。")
    devices_info: List[DeviceInfoModel] = Field(..., description="所有符合该维修服务SLA的设备信息列表")

class ResponseArrivalLLMOutput(BaseModel):
    item_list: List[ResponseArrivalParams] = Field(..., description="维修服务SLA参数列表")

class ResponseArrivalBlock(BaseModel):
    """SLA 服务块（单实例）：是否包含 + 参数"""
    included: bool = Field(..., description="是否纳入本实例")
    params: Optional[ResponseArrivalParams] = Field(
        None, description="SLA 参数（仅当 included 为 True 时填写）"
    )

# =============== 2) 年保养次数（单值） ===============
class MaintenanceScope(str, Enum):
    DEVICE_CLEAN = "设备清洁"
    PERFORMANCE_TEST = "性能测试"
    CALIBRATION = "校准"
    MECHANICAL_CHECK = "机械检查"
    ELECTRICAL_CHECK = "电气检查"
    DEEP_MAINTENANCE = "深度保养"


class YearlyMaintenanceParams(BaseModel):
    """PM 参数（单值）：频次与范围"""

    service_type: Optional[str] = Field(None, description="合同类型，如明确标注则返回（如：智享保A），否则返回null")
    standard_pm_per_year: int = Field(..., description="标准保养次数")
    smart_pm_per_year: int = Field(..., description="精智保养次数")
    remote_pm_per_year: int = Field(..., description="远程保养次数")

    scope: Optional[List[MaintenanceScope]] = Field(None, description="PM范围包括哪些项目")
    deliverables: Optional[str] = Field(None, description="交付物与报告", example="保养报告、质控记录")
    scheduling: Optional[str] = Field(None, description="排期与提前期", example="提前7日沟通，年度固定窗口")
    original_contract_snippet: str = Field(..., description="原始合同片段，原文摘录一定要与原文保持一致，不要做任何修改，也**不得对标点符号、空格或格式做任何修改**。")
    devices_info: List[DeviceInfoModel] = Field(..., description="所有符合该年度保养协议的设备信息列表")


class YearlyMaintenanceLLMOutput(BaseModel):
    item_list: List[YearlyMaintenanceParams] = Field(..., description="合同涉及保养服务清单")

class YearlyMaintenanceBlock(BaseModel):
    """PM 服务块（单实例）：是否包含 + 参数"""
    included: bool = Field(..., description="是否纳入本实例")
    params: Optional[YearlyMaintenanceParams] = Field(
        None, description="PM 参数（仅当 included 为 True 时填写）"
    )


# =============== 3) 远程保养 / 监测（单值） ===============
class RemoteMaintenanceParams(BaseModel):
    """远程保养/监测（单值）：平台、频率与前置条件"""
    model_config = ConfigDict(use_enum_values=True)

    service_type: Optional[str] = Field(None, description="合同类型，如明确标注则返回（如：智享保A），否则返回null")
    platform: Optional[RemotePlatform] = Field(None, description="远程平台")
    ct_remote_pm_per_year: Optional[int] = Field(None, description="每年 CT(Computed Tomography) 远程维护次数")
    mr_remote_pm_per_year: Optional[int] = Field(None, description="每年 MR(Magnetic Resonance) 远程维护次数")
    igs_remote_pm_per_year: Optional[int] = Field(None, description="每年 IGS(Interventional Gastroenterology System) 远程维护次数")
    dr_remote_pm_per_year: Optional[int] = Field(None, description="每年 DR(Digital Radiography) 远程维护次数")
    mammo_remote_pm_per_year: Optional[int] = Field(None, description="每年 Mammo(Mammography) 远程维护次数")
    mobile_dr_remote_pm_per_year: Optional[int] = Field(None, description="每年 MobileDR(Mobile Digital Radiography) 远程维护次数")
    bone_density_remote_pm_per_year: Optional[int] = Field(None, description="每年 BoneDensity(Bone Density) 远程维护次数")
    us_remote_pm_per_year: Optional[int] = Field(None, description="每年 US(Ultrasound) 远程维护次数")
    other_remote_pm_per_year: Optional[int] = Field(None, description="每年 Other(其他) 远程维护次数")
    prerequisites_max_users_per_device: Optional[int] = Field(
        None, description="每台设备的最大用户账号数"
    )
    reports: Optional[List[str]] = Field(
        None, description="报告类型（IPM/usage/alarms/maintenance-log 等）"
    )
    original_contract_snippet: str = Field(..., description="原始合同片段，原文摘录一定要与原文保持一致，不要做任何修改，也**不得对标点符号、空格或格式做任何修改**。")


class RemoteMaintenanceLLMOutput(BaseModel):
    item_list: List[RemoteMaintenanceParams] = Field(..., description="合同涉及远程维护服务清单")


class RemoteMaintenanceBlock(BaseModel):
    """远程保养服务块（单实例）：是否包含 + 参数"""
    included: bool = Field(..., description="是否纳入本实例")
    params: Optional[RemoteMaintenanceParams] = Field(
        None, description="远程保养参数（仅当 included 为 True 时填写）"
    )


# =============== 4) 探测器保修 / 心电导联保修（单值） ===============
class CTTubeInfoModel(BaseModel):
    device_model: str = Field(..., description="设备型号(药监局注册名)", example = "IGS 630")
    ge_host_system_number: str = Field(..., description="GE 主机系统编号", example = "082416100079")
    xr_tube_id: str = Field(..., description="XR球管料号")
    manufacturer: str = Field(..., description="生产企业", example = "GE医疗")
    registration_number: str = Field(..., description="注册证号", example = "国械注进1")
    contract_start_date: str = Field(..., description="合同开始日期，格式为YYYY/MM/DD", example = "2024/01/01")
    contract_end_date: str = Field(..., description="合同结束日期，格式为YYYY/MM/DD", example = "2024/12/31")
    response_time: Optional[float] = Field(None, description="响应时间，单位：小时")

class CTCoilInfoModel(BaseModel):
    ge_host_system_number: str = Field(..., description="GE 主机系统编号", example = "082416100079")
    coil_order_number: str = Field(..., description="线圈订单号", example = "2373366")
    coil_name: str = Field(..., description="线圈名称", example = "3.0T GP FLEX COIL")
    coil_serial_number: str = Field(..., description="线圈序列号", example = "123898WH9")
    

class DetectorEcgWarrantyModel(BaseModel):
    """部件保修（单值）：覆盖对象、更换策略与时效"""
    service_type: Optional[str] = Field(None, description="合同类型，如明确标注则返回（如：智享保A），否则返回null")
    model_config = ConfigDict(use_enum_values=True)
    covered_items: List[str] = Field(..., description="覆盖部件（detector/ecg_lead 等）")
    replacement_policy: ReplacementPolicy = Field(..., description="更换策略")
    old_part_return_required: Optional[bool] = Field(None, description="是否需回收旧件")
    non_return_penalty_pct: Optional[int] = Field(None, description="不回收旧件赔付上限（%）")
    logistics_by: Optional[LogisticsBy] = Field(None, description="物流承担方")
    lead_time_business_days: Optional[float] = Field(None, description="发货/更换时效（工作日）")
    original_contract_snippet: str = Field(..., description="原始合同片段，原文摘录一定要与原文保持一致，不要做任何修改，也**不得对标点符号、空格或格式做任何修改**。")


    tubes: List[CTTubeInfoModel] = Field([], description="所有球管备件信息列表，如合同中未涉及，返回空列表")
    coils: List[CTCoilInfoModel] = Field([], description="所有线圈备件信息列表，如合同中未涉及，返回空列表")

class DetectorEcgWarrantyLLMOutput(BaseModel):
    item_list: List[DetectorEcgWarrantyModel] = Field(..., description="合同涉及部件探测器/心电导联保修服务清单")

class DetectorEcgWarrantyBlock(BaseModel):
    """部件保修服务块（单实例）：是否包含 + 参数"""
    included: bool = Field(..., description="是否纳入本实例")
    params: Optional[DetectorEcgWarrantyModel] = Field(
        None, description="部件保修参数（仅当 included 为 True 时填写）"
    )


# =============== 5) 培训类型（单值） ===============
class TrainingSupportInfoModel(BaseModel):
    service_type: Optional[str] = Field(None, description="合同类型，如章节内容或标题明确标注则返回（如：智享保A），否则返回null")
    training_category: str = Field(..., description="培训类别", examples=["临床应用现场培训", "临床应用课堂培训", "医疗设备管理培训", "医院工程师培训"])
    applicable_devices: List[str] = Field(..., description="适用设备", example = ["CT750", "MR750", "IB750"])
    training_times: Optional[int] = Field(None, description="培训次数", example = 6)
    training_period: str = Field(..., description="培训周期", example = "合同期内3年")
    training_days: Optional[int] = Field(None, description="每次培训天数", example = 2)
    training_seats: Optional[int] = Field(None, description="培训名额", example = 5)
    training_cost: Optional[str] = Field(None, description="培训费用相关信息", examples=["乙方承担交通/住宿/会务", "乙方不承担费用"])
    original_contract_snippet: str = Field(..., description="原始合同片段，原文摘录一定要与原文保持一致，不要做任何修改，也**不得对标点符号、空格或格式做任何修改**。")


class TrainingLLMOutput(BaseModel):
    item_list: List[TrainingSupportInfoModel] = Field(..., description="合同涉及培训服务相关信息的清单")

class TrainingBlock(BaseModel):
    """培训服务块（单实例）：是否包含 + 参数"""
    included: bool = Field(..., description="是否纳入本实例")
    params: Optional[TrainingSupportInfoModel] = Field(
        None, description="培训参数（仅当 included 为 True 时填写）"
    )


class ServicePlanCandidateClause(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category: Optional[str] = Field(None, description="服务计划条款分类", alias="category")
    clause_item: str = Field(..., description="服务计划条款名称", alias="clauseItem")
    requirement: str = Field(..., description="服务计划条款要求", alias="requirement")
    notes: Optional[str] = Field(None, description="服务计划条款备注", alias="notes")


class ServicePlanCandidate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    plan_id: str = Field(..., description="服务计划ID", alias="planId")
    plan_name: str = Field(..., description="服务计划名称", alias="planName")
    description: Optional[str] = Field(None, description="服务计划描述")
    clauses: List[ServicePlanCandidateClause] = Field(..., description="服务计划条款清单")


class ServiceClauseForMatching(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    clause_id: str = Field(..., description="合同条款唯一标识", alias="clauseId")
    clause_type: str = Field(..., description="条款类型，例如 onsite_sla / yearly_maintenance / remote_maintenance / training_support / key_spare_parts", alias="clauseType")
    clause_text: str = Field(..., description="条款的结构化描述文本", alias="clauseText")
    structured_attributes: Optional[Dict[str, str]] = Field(None, description="条款的关键字段键值对", alias="structuredAttributes")
    original_snippet: Optional[str] = Field(None, description="合同原文片段", alias="originalSnippet")


class ServicePlanRecommendationRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    clauses: List[ServiceClauseForMatching] = Field(..., description="需要匹配服务计划的合同条款列表")
    candidates: List[ServicePlanCandidate] = Field(..., description="候选服务计划列表")


class ClausePlanRecommendation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    clause_id: str = Field(..., description="合同条款唯一标识", alias="clauseId")
    clause_type: str = Field(..., description="合同条款类型", alias="clauseType")
    recommended_plan_id: Optional[str] = Field(None, description="推荐服务计划ID，如无合适推荐则为null", alias="recommendedPlanId")
    recommended_plan_name: Optional[str] = Field(None, description="推荐服务计划名称", alias="recommendedPlanName")
    rationale: str = Field(..., description="匹配理由与判断依据，限制在30字以内", max_length=60)
    alternative_plan_ids: List[str] = Field(default_factory=list, description="备选计划ID列表", alias="alternativePlanIds")
    alternative_plan_names: List[str] = Field(default_factory=list, description="备选计划名称列表", alias="alternativePlanNames")


class ServicePlanRecommendationLLMOutput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    summary: str = Field(..., description="整体推荐结果总结")
    overall_plan_id: Optional[str] = Field(None, description="整体推荐的服务计划ID", alias="overallPlanId")
    overall_plan_name: Optional[str] = Field(None, description="整体推荐的服务计划名称", alias="overallPlanName")
    overall_adjustment_notes: Optional[str] = Field(
        None,
        description="若需在标准计划基础上做额外调整，请在此说明",
        alias="overallAdjustmentNotes",
    )
    matches: List[ClausePlanRecommendation] = Field(..., description="逐条款的推荐结果")


#### Contract Meta ####
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

class AfterSalesSupportInfoModel(BaseModel):
    guarantee_running_rate: Optional[float] = Field(None, description="开机保证率，如未提及返回null", example = 93)
    guarantee_mechanism: str = Field(..., description="保证机制", example = "超出停机时间则顺延保修期")
    service_report_form: str = Field(..., description="服务报告形式", examples=["现场纸质", "Email", "系统下载"])
    remote_service: str = Field(..., description="远程服务", examples=["InSite 远程监控", "无远程服务"])
    hotline_support: str = Field(..., description="热线支持", example = "400-8128188" )
    tax_free_parts_priority: bool = Field(False, description="保税库备件优先")

class ContractAndComplianceInfoExtractionResult(BaseModel):
    information_confidentiality_requirements: bool = Field(True, description="信息保密要求")
    liability_of_breach: str = Field(..., description="违约责任，如有多条，使用markdown格式拆分子弹点", example = "培训逾期不补课，不退款")
    parts_return_requirements: str = Field(..., description="配件退还要求", example = "新件更换后三日内归还旧件，逾期补偿30%")
    delivery_requirements: str = Field(..., description="交付要求", example = "合同生效30天内交付硬件")
    transportation_insurance: str = Field(..., description="运输保险", examples=["乙方承担", "甲方承担"])
    delivery_location: str = Field("", description="到货地点")

#### Request ####
class InfoExtractionRequest(BaseModel):
    content: str

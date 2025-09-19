from pydantic import BaseModel, Field
from enum import Enum
from typing import List, Optional


# basic types
class StandardClauses(BaseModel):
    category: str
    item: str
    standard_text: str
    risk_level: str

# requests
class NonStandardDetectionRequest(BaseModel):
    content: str
    standard_clauses: Optional[List[StandardClauses]] = Field(None, description="标准条款")

class BasicInfoExtractionRequest(BaseModel):
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
    contract_start_date: str = Field(..., description="合同开始日期 格式为YYYY/MM/DD")
    contract_end_date: str = Field(..., description="合同结束日期 格式为YYYY/MM/DD")
    contract_total_amount: Optional[float] = Field(None, description="合同总金额")
    contract_payment_method: str = Field(..., description="付款方式，如果合同中没有付款方式，则返回空字符串")
    contract_currency: str = Field(..., description="币种，如果合同中没有币种，则返回空字符串", example = "CNY")
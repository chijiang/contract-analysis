from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser
from models.service_plan import (
    ResponseArrivalLLMOutput, 
    YearlyMaintenanceLLMOutput, 
    RemoteMaintenanceLLMOutput,
    DetectorEcgWarrantyLLMOutput,
    TrainingLLMOutput,
    AfterSalesSupportInfoModel,
    BasicInfoExtractionResult, 
    ContractAndComplianceInfoExtractionResult
)
    
from prompts import (
    BASIC_INFO_EXTRACTION_SYSTEM_PROMPT, 
    MAINTENANCE_SERVICE_INFO_EXTRACTION_SYSTEM_PROMPT,
    DIGITAL_SOLUTION_INFO_EXTRACTION_SYSTEM_PROMPT,
    TRAINING_SUPPORT_INFO_EXTRACTION_SYSTEM_PROMPT,
    CONTRACT_AND_COMPLIANCE_INFO_EXTRACTION_SYSTEM_PROMPT,
    AFTER_SALES_SUPPORT_INFO_EXTRACTION_SYSTEM_PROMPT,
    KEY_SPARE_PARTS_INFO_EXTRACTION_SYSTEM_PROMPT,
    GENERAL_SERVICE_INFO_EXTRACTION_SYSTEM_PROMPT
)

from config import LLM_MODEL, API_KEY, API_BASE_URL

class ContractInfoExtractionAgent:
    def __init__(self):
        self.basic_info_result_parser = PydanticOutputParser(pydantic_object=BasicInfoExtractionResult)
        self.contract_and_compliance_info_result_parser = PydanticOutputParser(pydantic_object=ContractAndComplianceInfoExtractionResult)
        self.after_sales_support_info_result_parser = PydanticOutputParser(pydantic_object=AfterSalesSupportInfoModel)
        self.key_spare_parts_info_result_parser = PydanticOutputParser(pydantic_object=DetectorEcgWarrantyLLMOutput)

        self.response_arrival_output_parser = PydanticOutputParser(pydantic_object=ResponseArrivalLLMOutput)
        self.yearly_maintenance_output_parser = PydanticOutputParser(pydantic_object=YearlyMaintenanceLLMOutput)
        self.remote_maintenance_output_parser = PydanticOutputParser(pydantic_object=RemoteMaintenanceLLMOutput)
        self.training_support_info_result_parser = PydanticOutputParser(pydantic_object=TrainingLLMOutput)

        self.llm = ChatOpenAI(
            model=LLM_MODEL, 
            temperature=0,
            api_key=API_KEY,
            base_url=API_BASE_URL
        )

        self.basic_info_prompt = BASIC_INFO_EXTRACTION_SYSTEM_PROMPT
        self.maintenance_service_info_prompt = MAINTENANCE_SERVICE_INFO_EXTRACTION_SYSTEM_PROMPT
        self.digital_solution_info_prompt = DIGITAL_SOLUTION_INFO_EXTRACTION_SYSTEM_PROMPT
        self.training_support_info_prompt = TRAINING_SUPPORT_INFO_EXTRACTION_SYSTEM_PROMPT
        self.contract_and_compliance_info_prompt = CONTRACT_AND_COMPLIANCE_INFO_EXTRACTION_SYSTEM_PROMPT
        self.after_sales_support_info_prompt = AFTER_SALES_SUPPORT_INFO_EXTRACTION_SYSTEM_PROMPT
        self.key_spare_parts_info_prompt = KEY_SPARE_PARTS_INFO_EXTRACTION_SYSTEM_PROMPT
        self.general_service_info_prompt = GENERAL_SERVICE_INFO_EXTRACTION_SYSTEM_PROMPT

    
    async def output_format_refine(self, text: str, format_instructions: str):
        prompt = f"""
        你是一个Json格式修复专家，你的任务是修复给定的Json格式，使其符合要求。
        以下是JSON格式的基本要求:
        {format_instructions}

        请根据给定的格式要求，修改以下存在错误的输入数据:
        {text}

        请特别注意反斜杠(\)转译的处理，遇到反斜杠(\)时，需要将反斜杠转译为普通字符。
        请完整输出修复后的Json数据，不要添加任何其他内容和解释。
        """
        response = await self.llm.ainvoke(prompt)
        return response.content.strip().replace("```json", "").replace("```", "")

    async def extract_basic_info(self, contract_content: str):
        response = await self.llm.ainvoke([
            ("system", self.basic_info_prompt),
            ("system", f"输出格式: {self.basic_info_result_parser.get_format_instructions()}"),
            ("user", contract_content)
        ])
        ouput_text = response.content.strip().replace("```json", "").replace("```", "")
        try:
            parsed_result = self.basic_info_result_parser.parse(ouput_text)
        except Exception as e:
            print(f"Error parsing result: {e}")
            print(f"Raw text: {ouput_text}")
            ouput_text = await self.output_format_refine(ouput_text, self.basic_info_result_parser.get_format_instructions())
            parsed_result = self.basic_info_result_parser.parse(ouput_text)
        return parsed_result
    
    async def extract_training_support_info(self, contract_content: str):
        response = await self.llm.ainvoke([
            ("system", self.training_support_info_prompt),
            ("system", f"输出格式: {self.training_support_info_result_parser.get_format_instructions()}"),
            ("user", contract_content)
        ])
        ouput_text = response.content.strip().replace("```json", "").replace("```", "")
        try:
            parsed_result = self.training_support_info_result_parser.parse(ouput_text)
        except Exception as e:
            print(f"Error parsing result: {e}")
            print(f"Raw text: {ouput_text}")
            ouput_text = await self.output_format_refine(ouput_text, self.training_support_info_result_parser.get_format_instructions())
            parsed_result = self.training_support_info_result_parser.parse(ouput_text)
        return parsed_result

    async def extract_contract_and_compliance_info(self, contract_content: str):
        response = await self.llm.ainvoke([
            ("system", self.contract_and_compliance_info_prompt),
            ("system", f"输出格式: {self.contract_and_compliance_info_result_parser.get_format_instructions()}"),
            ("user", contract_content)
        ])
        ouput_text = response.content.strip().replace("```json", "").replace("```", "")
        try:
            parsed_result = self.contract_and_compliance_info_result_parser.parse(ouput_text)
        except Exception as e:
            print(f"Error parsing result: {e}")
            print(f"Raw text: {ouput_text}")
            ouput_text = await self.output_format_refine(ouput_text, self.contract_and_compliance_info_result_parser.get_format_instructions())
            parsed_result = self.contract_and_compliance_info_result_parser.parse(ouput_text)
        return parsed_result

    async def extract_after_sales_support_info(self, contract_content: str):
        response = await self.llm.ainvoke([
            ("system", self.after_sales_support_info_prompt),
            ("system", f"输出格式: {self.after_sales_support_info_result_parser.get_format_instructions()}"),
            ("user", contract_content)
        ])
        ouput_text = response.content.strip().replace("```json", "").replace("```", "")
        try:
            parsed_result = self.after_sales_support_info_result_parser.parse(ouput_text)
        except Exception as e:
            print(f"Error parsing result: {e}")
            print(f"Raw text: {ouput_text}")
            ouput_text = await self.output_format_refine(ouput_text, self.after_sales_support_info_result_parser.get_format_instructions())
            parsed_result = self.after_sales_support_info_result_parser.parse(ouput_text)
        return parsed_result

    async def extract_key_spare_parts_info(self, contract_content: str):
        response = await self.llm.ainvoke([
            ("system", self.key_spare_parts_info_prompt),
            ("system", f"输出格式: {self.key_spare_parts_info_result_parser.get_format_instructions()}"),
            ("user", contract_content)
        ])
        ouput_text = response.content.strip().replace("```json", "").replace("```", "")
        try:
            parsed_result = self.key_spare_parts_info_result_parser.parse(ouput_text)
        except Exception as e:
            print(f"Error parsing result: {e}")
            print(f"Raw text: {ouput_text}")
            ouput_text = await self.output_format_refine(ouput_text, self.key_spare_parts_info_result_parser.get_format_instructions())
            parsed_result = self.key_spare_parts_info_result_parser.parse(ouput_text)
        return parsed_result

    async def extract_response_arrival_info(self, contract_content: str):
        response = await self.llm.ainvoke([
            ("system", self.general_service_info_prompt),
            ("system", f"请分析并拆解合同中关于设备保修SLA相关的信息，**注意不要将单个保修服务拆分成多个，一个设备往往只有一个保修服务**。\n输出格式: {self.response_arrival_output_parser.get_format_instructions()}"),
            ("user", contract_content)
        ])
        ouput_text = response.content.strip().replace("```json", "").replace("```", "")
        try:
            parsed_result = self.response_arrival_output_parser.parse(ouput_text)
        except Exception as e:
            print(f"Error parsing result: {e}")
            print(f"Raw text: {ouput_text}")
            ouput_text = await self.output_format_refine(ouput_text, self.response_arrival_output_parser.get_format_instructions())
            parsed_result = self.response_arrival_output_parser.parse(ouput_text)
        return parsed_result


    async def extract_yearly_maintenance_info(self, contract_content: str):
        response = await self.llm.ainvoke([
            ("system", self.general_service_info_prompt),
            ("system", f"请分析并拆解合同中关于年度保养相关的信息，输出格式: {self.yearly_maintenance_output_parser.get_format_instructions()}"),
            ("user", contract_content)
        ])
        ouput_text = response.content.strip().replace("```json", "").replace("```", "")
        try:
            parsed_result = self.yearly_maintenance_output_parser.parse(ouput_text)
        except Exception as e:
            print(f"Error parsing result: {e}")
            print(f"Raw text: {ouput_text}")
            ouput_text = await self.output_format_refine(ouput_text, self.yearly_maintenance_output_parser.get_format_instructions())
            parsed_result = self.yearly_maintenance_output_parser.parse(ouput_text)
        return parsed_result

    async def extract_remote_maintenance_info(self, contract_content: str):
        response = await self.llm.ainvoke([
            ("system", self.general_service_info_prompt),
            ("system", f"输出格式: {self.remote_maintenance_output_parser.get_format_instructions()}"),
            ("user", contract_content)
        ])
        ouput_text = response.content.strip().replace("```json", "").replace("```", "")
        try:
            parsed_result = self.remote_maintenance_output_parser.parse(ouput_text)
        except Exception as e:
            print(f"Error parsing result: {e}")
            print(f"Raw text: {ouput_text}")
            ouput_text = await self.output_format_refine(ouput_text, self.remote_maintenance_output_parser.get_format_instructions())
            parsed_result = self.remote_maintenance_output_parser.parse(ouput_text)
        return parsed_result
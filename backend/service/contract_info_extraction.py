from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser

from models import BasicInfoExtractionResult
from prompts import BASIC_INFO_EXTRACTION_SYSTEM_PROMPT

from config import LLM_MODEL, API_KEY, API_BASE_URL

class ContractInfoExtraction:
    def __init__(self):
        self.basic_info_result_parser = PydanticOutputParser(pydantic_object=BasicInfoExtractionResult)

        self.llm = ChatOpenAI(
            model=LLM_MODEL, 
            temperature=0,
            api_key=API_KEY,
            base_url=API_BASE_URL
        )
        self.basic_info_prompt = BASIC_INFO_EXTRACTION_SYSTEM_PROMPT

    async def output_format_refine(self, text: str, format_instructions: str):
        prompt = f"""
        你是一个Json格式修复专家，你的任务是修复给定的Json格式，使其符合要求。
        以下是JSON格式的基本要求:
        {format_instructions}

        请根据给定的格式要求，修改以下存在错误的输入数据:
        {text}

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

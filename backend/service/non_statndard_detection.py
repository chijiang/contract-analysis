from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser
from models.compliance import LlmAnalysisResult, StandardClauses
from prompts import NON_STANDARD_ANALYSIS_DEVELOPER_PROMPT, NON_STANDARD_ANALYSIS_SYSTEM_PROMPT
from config import LLM_MODEL, API_KEY, API_BASE_URL

class NonStandardDetectionAgent:
    def __init__(self):
        self.result_parser = PydanticOutputParser(pydantic_object=LlmAnalysisResult)

        self.llm = ChatOpenAI(
            model=LLM_MODEL, 
            temperature=0,
            api_key=API_KEY,
            base_url=API_BASE_URL
        )
        self.system_prompt = NON_STANDARD_ANALYSIS_SYSTEM_PROMPT
        self.developer_prompt = NON_STANDARD_ANALYSIS_DEVELOPER_PROMPT

    async def output_format_refine(self, text: str):
        prompt = f"""
        你是一个Json格式修复专家，你的任务是修复给定的Json格式，使其符合要求。
        以下是JSON格式的基本要求:
        {self.result_parser.get_format_instructions()}

        请根据给定的格式要求，修改以下存在错误的输入数据:
        {text}

        请特别注意反斜杠(\)转译的处理，遇到反斜杠(\)时，需要将反斜杠转译为普通字符。
        请完整输出修复后的Json数据，不要添加任何其他内容和解释。
        """
        response = await self.llm.ainvoke(prompt)
        return response.content.strip().replace("```json", "").replace("```", "")

    async def process(self, contract_content: str, standard_clauses: List[StandardClauses]):
        standard_clauses = [{
                "条款所属类别": clause.category,
                "具体条款项": clause.item,
                "标准约定原文": clause.standard_text,
                "风险等级标准": clause.risk_level,
            } for clause in standard_clauses]

        allowed_categories = list(set([x["条款所属类别"] for x in standard_clauses]))
        
        response = await self.llm.ainvoke([
            ("system", self.system_prompt.format(allowed_categories=allowed_categories)), 
            ("system", self.developer_prompt),
            ("system", f"输出格式: {self.result_parser.get_format_instructions()}"),
            ("user", f"标准条款：\n{standard_clauses}\n\n合同文本：\n{contract_content}"),
        ])
        text = response.content.strip().replace("```json", "").replace("```", "")
        try:
            parsed_result = self.result_parser.parse(text)
        except Exception as e:
            print(f"Error parsing result: {e}")
            print(f"Raw text: {text}")
            text = await self.output_format_refine(text)
            parsed_result = self.result_parser.parse(text)
        return parsed_result

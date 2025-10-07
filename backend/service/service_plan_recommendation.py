from __future__ import annotations

from typing import Iterable

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser

from config import API_BASE_URL, API_KEY, LLM_MODEL
from models.service_plan import (
    ClausePlanRecommendation,
    ServiceClauseForMatching,
    ServicePlanCandidate,
    ServicePlanRecommendationLLMOutput,
    ServicePlanRecommendationRequest,
)
from prompts import SERVICE_PLAN_RECOMMENDATION_SYSTEM_PROMPT


class ServicePlanRecommendationAgent:
    def __init__(self) -> None:
        self.output_parser = PydanticOutputParser(pydantic_object=ServicePlanRecommendationLLMOutput)
        self.llm = ChatOpenAI(
            model=LLM_MODEL,
            temperature=0,
            api_key=API_KEY,
            base_url=API_BASE_URL,
        )
        self.system_prompt = SERVICE_PLAN_RECOMMENDATION_SYSTEM_PROMPT

    async def recommend(self, request: ServicePlanRecommendationRequest) -> ServicePlanRecommendationLLMOutput:
        if not request.candidates:
            raise ValueError("候选服务计划列表为空，无法进行匹配")
        if not request.clauses:
            raise ValueError("合同条款列表为空，无法进行匹配")

        user_prompt = self._build_user_prompt(request.candidates, request.clauses)
        response = await self.llm.ainvoke(
            [
                ("system", self.system_prompt),
                ("system", f"输出格式: {self.output_parser.get_format_instructions()}"),
                ("user", user_prompt),
            ]
        )
        output_text = response.content.strip().replace("```json", "").replace("```", "")
        try:
            return self.output_parser.parse(output_text)
        except Exception as exc:
            refined = await self._output_format_refine(output_text)
            try:
                return self.output_parser.parse(refined)
            except Exception:
                raise RuntimeError(f"无法解析服务计划匹配结果: {exc}") from exc

    def _build_user_prompt(
        self,
        candidates: Iterable[ServicePlanCandidate],
        clause_matches: Iterable[ServiceClauseForMatching],
    ) -> str:
        candidate_lines = ["候选服务计划一览："]
        for index, plan in enumerate(candidates, start=1):
            candidate_lines.append(f"{index}. {plan.plan_name} (ID: {plan.plan_id})")
            if plan.description:
                candidate_lines.append(f"   描述: {plan.description}")
            candidate_lines.append("   关键条款：")
            for clause in plan.clauses:
                category_label = clause.category or "未分类"
                candidate_lines.append(f"   - [{category_label}] {clause.clause_item}: {clause.requirement}")
                if clause.notes:
                    candidate_lines.append(f"     备注: {clause.notes}")
        clause_lines = ["\n待匹配的合同条款："]
        for index, clause in enumerate(clause_matches, start=1):
            clause_lines.append(f"{index}. 条款ID {clause.clause_id} | 类型 {clause.clause_type}")
            clause_lines.append(f"   描述：{clause.clause_text}")
            if clause.structured_attributes:
                attr_pairs = "; ".join(f"{key}: {value}" for key, value in clause.structured_attributes.items())
                clause_lines.append(f"   关键字段：{attr_pairs}")
            if clause.original_snippet:
                clause_lines.append(f"   合同原文片段：{clause.original_snippet}")
        clause_lines.append(
            "\n请综合考虑 SLA、保养频次、远程监测、培训与备件等因素，为每条合同条款挑选最匹配的服务计划。"
        )
        return "\n".join(candidate_lines + clause_lines)

    async def _output_format_refine(self, text: str) -> str:
        prompt = f"""
你是一名Json格式修复助手。请根据以下格式要求修复输出：
{self.output_parser.get_format_instructions()}

待修复内容：
{text}

请仅返回符合要求的纯JSON，不要添加其他说明。
"""
        response = await self.llm.ainvoke(prompt)
        return response.content.strip().replace("```json", "").replace("```", "")


__all__ = [
    "ServicePlanRecommendationAgent",
    "ClausePlanRecommendation",
]

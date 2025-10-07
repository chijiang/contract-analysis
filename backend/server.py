from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from models.compliance import (
    NonStandardDetectionRequest, 
)
from models.service_plan import (
    RemoteMaintenanceLLMOutput, 
    ResponseArrivalLLMOutput, 
    YearlyMaintenanceLLMOutput,
    DetectorEcgWarrantyLLMOutput,
    TrainingLLMOutput,
    BasicInfoExtractionResult, 
    ContractAndComplianceInfoExtractionResult, 
    AfterSalesSupportInfoModel,
    InfoExtractionRequest, 
    ServicePlanRecommendationRequest,
    ServicePlanRecommendationLLMOutput,
)
from service.pdf_converter import OcrPdfParser
from service.non_statndard_detection import NonStandardDetectionAgent
from service.contract_info_extraction import ContractInfoExtractionAgent
from service.service_plan_recommendation import ServicePlanRecommendationAgent
from config import PORT
import uuid
import os

app = FastAPI()

from fastapi import Request

# 添加请求日志中间件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # 读取请求体
    body = await request.body()
    # 打印请求信息
    print(f"收到请求: {request.method} {request.url}")
    print(f"请求头: {dict(request.headers)}")
    if body:
        try:
            # 尝试解析JSON
            body_str = body.decode('utf-8')
            print(f"请求体: {body_str}")
        except:
            print(f"请求体 (二进制): {len(body)} bytes")
    # 重新构造请求以便后续处理
    async def receive():
        return {"type": "http.request", "body": body}
    request._receive = receive
    response = await call_next(request)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ocr_parser = OcrPdfParser()
non_standard_detector = NonStandardDetectionAgent()
contract_info_extractor = ContractInfoExtractionAgent()
service_plan_recommender = ServicePlanRecommendationAgent()

@app.post("/api/v1/pdf_to_markdown", tags=["File Reading"])
async def pdf_to_markdown(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        return {"error": "File type must be application/pdf"}
    pdf_path = f"temp_{uuid.uuid4()}.pdf"
    with open(pdf_path, "wb") as f:
        f.write(file.file.read())
    markdown = await ocr_parser.parse(pdf_path)
    os.remove(pdf_path)
    return {"markdown": markdown}


@app.post("/api/v1/non_standard_detection", tags=["Compliance"])
async def non_standard_detection(NonStandardDetectionRequest: NonStandardDetectionRequest):
    markdown = NonStandardDetectionRequest.content
    result = await non_standard_detector.process(markdown, NonStandardDetectionRequest.standard_clauses)
    return {"result": result}


# @app.post("/api/v1/device_info_extraction", response_model=DeviceInfoExtractionResult)
# async def device_info_extraction(req: InfoExtractionRequest):
#     markdown = req.content
#     result = await contract_info_extractor.extract_device_info(markdown)
#     return result


# @app.post("/api/v1/maintenance_service_info_extraction", response_model=MaintenanceServiceInfoExtractionResult)
# async def maintenance_service_info_extraction(req: InfoExtractionRequest):
#     markdown = req.content
#     result = await contract_info_extractor.extract_maintenance_service_info(markdown)
#     return result


# @app.post("/api/v1/digital_solution_info_extraction", response_model=DigitalSolutionInfoExtractionResult)
# async def digital_solution_info_extraction(req: InfoExtractionRequest):
#     markdown = req.content
#     result = await contract_info_extractor.extract_digital_solution_info(markdown)
#     return result

@app.post("/api/v1/basic_info_extraction", response_model=BasicInfoExtractionResult, tags=["Info Extraction"])
async def basic_info_extraction(req: InfoExtractionRequest):
    markdown = req.content
    result = await contract_info_extractor.extract_basic_info(markdown)
    return result
    
@app.post("/api/v1/training_support_info_extraction", response_model=TrainingLLMOutput, tags=["Info Extraction"])
async def training_support_info_extraction(req: InfoExtractionRequest):
    markdown = req.content
    result = await contract_info_extractor.extract_training_support_info(markdown)
    return result

@app.post("/api/v1/contract_and_compliance_info_extraction", response_model=ContractAndComplianceInfoExtractionResult, tags=["Info Extraction"])
async def contract_and_compliance_info_extraction(req: InfoExtractionRequest):
    markdown = req.content
    result = await contract_info_extractor.extract_contract_and_compliance_info(markdown)
    return result

@app.post("/api/v1/after_sales_support_info_extraction", response_model=AfterSalesSupportInfoModel, tags=["Info Extraction"])
async def after_sales_support_info_extraction(req: InfoExtractionRequest):
    markdown = req.content
    result = await contract_info_extractor.extract_after_sales_support_info(markdown)
    return result

@app.post("/api/v1/key_spare_parts_info_extraction", response_model=DetectorEcgWarrantyLLMOutput, tags=["Info Extraction"])
async def key_spare_parts_info_extraction(req: InfoExtractionRequest):
    markdown = req.content
    result = await contract_info_extractor.extract_key_spare_parts_info(markdown)
    return result

@app.post("/api/v1/onsite_SLA_extraction", response_model=ResponseArrivalLLMOutput, tags=["Info Extraction"])
async def response_arrival_info_extraction(req: InfoExtractionRequest):
    markdown = req.content
    result = await contract_info_extractor.extract_response_arrival_info(markdown)
    return result

@app.post("/api/v1/yearly_maintenance_info_extraction", response_model=YearlyMaintenanceLLMOutput, tags=["Info Extraction"])
async def yearly_maintenance_info_extraction(req: InfoExtractionRequest):
    markdown = req.content
    result = await contract_info_extractor.extract_yearly_maintenance_info(markdown)
    return result

@app.post("/api/v1/remote_maintenance_info_extraction", response_model=RemoteMaintenanceLLMOutput, tags=["Info Extraction"])
async def remote_maintenance_info_extraction(req: InfoExtractionRequest):
    markdown = req.content
    result = await contract_info_extractor.extract_remote_maintenance_info(markdown)
    return result


@app.post("/api/v1/service_plan_recommendation", response_model=ServicePlanRecommendationLLMOutput, tags=["Service Plans"])
async def service_plan_recommendation(req: ServicePlanRecommendationRequest):
    result = await service_plan_recommender.recommend(req)
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(PORT))

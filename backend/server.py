from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from models import BasicInfoExtractionResult, NonStandardDetectionRequest, BasicInfoExtractionRequest
from service.pdf_converter import OcrPdfParser
from service.non_statndard_detection import NonStandardDetection
from service.contract_info_extraction import ContractInfoExtraction
from config import PORT
import uuid
import os

app = FastAPI()

from fastapi import Request
import json

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
non_standard_detector = NonStandardDetection()
contract_info_extractor = ContractInfoExtraction()


@app.post("/api/v1/pdf_to_markdown")
async def pdf_to_markdown(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        return {"error": "File type must be application/pdf"}
    pdf_path = f"temp_{uuid.uuid4()}.pdf"
    with open(pdf_path, "wb") as f:
        f.write(file.file.read())
    markdown = await ocr_parser.parse(pdf_path)
    os.remove(pdf_path)
    return {"markdown": markdown}


@app.post("/api/v1/non_standard_detection")
async def non_standard_detection(NonStandardDetectionRequest: NonStandardDetectionRequest):
    markdown = NonStandardDetectionRequest.content
    result = await non_standard_detector.process(markdown, NonStandardDetectionRequest.standard_clauses)
    return {"result": result}


@app.post("/api/v1/basic_info_extraction", response_model=BasicInfoExtractionResult)
async def basic_info_extraction(req: BasicInfoExtractionRequest):
    markdown = req.content
    result = await contract_info_extractor.extract_basic_info(markdown)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(PORT))
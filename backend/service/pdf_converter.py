from langchain_openai import ChatOpenAI
import asyncio

from config import OCR_MODEL, API_KEY, API_BASE_URL

class OcrPdfParser:
    def __init__(self):

        self.llm = ChatOpenAI(
            model=OCR_MODEL, 
            temperature=0,
            api_key=API_KEY,
            base_url=API_BASE_URL
        )

        self.prompt = f"请将图片中的内容提取出来，使用markdown格式输出，不要添加任何其他内容和解释。"


    async def _call_llm(self, order, messages):
        response = await self.llm.ainvoke(messages)
        return order, response.content.strip()
        

    async def parse(self, pdf_path: str):
        import fitz  # PyMuPDF
        import base64
        from io import BytesIO
        from PIL import Image
        
        # 打开PDF文件
        pdf_document = fitz.open(pdf_path)
        
        tasks = []
        for page_num in range(len(pdf_document)):
            # 获取页面
            page = pdf_document.load_page(page_num)
            
            # 将页面转换为图片
            mat = fitz.Matrix(2.0, 2.0)  # 提高分辨率
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            
            # 将图片转换为base64编码
            img_base64 = base64.b64encode(img_data).decode('utf-8')
            
            # 构建消息内容
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": self.prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{img_base64}"
                            }
                        }
                    ]
                }
            ]
            
            # 调用模型
            tasks.append(self._call_llm(page_num, messages))

        results = await asyncio.gather(*tasks)
        results.sort(key=lambda x: x[0])
        markdown_content = "\n".join([result[1].replace("```markdown", "").replace("```", "") for result in results])
        pdf_document.close()
        return markdown_content


if __name__ == "__main__":
    analyzer = OcrPdfParser()
    markdown = analyzer.parse("contracts/None Standard Contract  2023-12 RT590、HD750、REVOLUTION、REVOLUTION EVO、Optima660、1.5T EXPLORER、3.0T 750W、3.OT PIONEER、3.OT ARCHITECT、D670 ZXB-PQLX23069.pdf")
    print(markdown)
    with open("qwen_ocr_result.md", "w") as f:
        f.write(markdown)
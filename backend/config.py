from dotenv import load_dotenv
import os

load_dotenv(".env.backend")

API_KEY = os.getenv("API_KEY")
API_BASE_URL = os.getenv("BASE_URL")

LLM_MODEL = os.getenv("LLM_MODEL")
OCR_MODEL = os.getenv("OCR_MODEL")

PORT = os.getenv("PORT")
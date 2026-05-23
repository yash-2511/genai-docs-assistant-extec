from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
)

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set")

llm = ChatGoogleGenerativeAI(
    model=GEMINI_MODEL,
    google_api_key=GEMINI_API_KEY,
    temperature=0.3,
)
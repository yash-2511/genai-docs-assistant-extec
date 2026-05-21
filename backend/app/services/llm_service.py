from langchain_community.chat_models import (
    ChatOllama
)

from app.config import MODEL_NAME

llm = ChatOllama(
    model=MODEL_NAME,
    temperature=0.3
)
import os

from langchain_community.vectorstores import FAISS

from app.services.embedding_service import (
    embedding_model
)

from app.config import FAISS_DB_PATH

os.makedirs(FAISS_DB_PATH, exist_ok=True)

def create_vector_store(chunks):

    vectorstore = FAISS.from_documents(
        chunks,
        embedding_model
    )

    vectorstore.save_local(
        FAISS_DB_PATH
    )

    return vectorstore
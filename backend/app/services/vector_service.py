import os

from langchain_community.vectorstores import FAISS
from langchain_community.vectorstores.utils import DistanceStrategy

from app.services.embedding_service import (
    embedding_model
)

from app.config import FAISS_DB_PATH

os.makedirs(FAISS_DB_PATH, exist_ok=True)

def create_vector_store(chunks):

    vectorstore = FAISS.from_documents(
        chunks,
        embedding_model,
        normalize_L2=True,
        distance_strategy=DistanceStrategy.COSINE
    )

    vectorstore.save_local(
        FAISS_DB_PATH
    )

    return vectorstore
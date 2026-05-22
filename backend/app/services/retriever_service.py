from langchain_community.vectorstores import FAISS
from langchain_community.vectorstores.utils import DistanceStrategy

from app.services.embedding_service import (
    embedding_model
)

from app.config import FAISS_DB_PATH, RETRIEVAL_TOP_K

def get_retriever():

    vectorstore = FAISS.load_local(
        FAISS_DB_PATH,
        embedding_model,
        allow_dangerous_deserialization=True,
        normalize_L2=True,
        distance_strategy=DistanceStrategy.COSINE
    )

    retriever = vectorstore.as_retriever(
        search_kwargs={"k": RETRIEVAL_TOP_K}
    )

    return retriever
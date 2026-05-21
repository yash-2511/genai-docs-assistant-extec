from langchain_community.vectorstores import FAISS

from app.services.embedding_service import (
    embedding_model
)

from app.config import FAISS_DB_PATH

def get_retriever():

    vectorstore = FAISS.load_local(
        FAISS_DB_PATH,
        embedding_model,
        allow_dangerous_deserialization=True
    )

    retriever = vectorstore.as_retriever(
        search_kwargs={"k": 3}
    )

    return retriever
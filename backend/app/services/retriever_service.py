from app.config import RETRIEVAL_TOP_K
from app.services.vector_service import search_documents


class PineconeRetriever:
    def get_relevant_documents(self, query: str):
        return search_documents(query, top_k=RETRIEVAL_TOP_K)

    def invoke(self, query: str):
        return self.get_relevant_documents(query)

def get_retriever():
    return PineconeRetriever()
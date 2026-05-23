from app.config import RETRIEVAL_TOP_K
from app.services.vector_service import search_documents


class PineconeRetriever:
    def get_relevant_documents(self, query: str, user_id: str | None = None, session_id: str | None = None):
        return search_documents(query, top_k=RETRIEVAL_TOP_K, user_id=user_id, session_id=session_id)

    def invoke(self, query: str, user_id: str | None = None, session_id: str | None = None):
        return self.get_relevant_documents(query, user_id=user_id, session_id=session_id)

def get_retriever():
    return PineconeRetriever()
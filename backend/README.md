# Backend

This backend implements the server-side components for the genai-doc-assistant project.

It provides API endpoints for chat and file uploads, document ingestion and embedding,
vector indexing with Pinecone, retrieval, and LLM orchestration.

Key components
- Routers: `routers/chat.py`, `routers/upload.py` — HTTP endpoints for chat and uploads.
- Services: `services/document_service.py`, `services/embedding_service.py`, `services/llm_service.py`, `services/retriever_service.py`, `services/vector_service.py` — handle ingestion, embeddings, indexing, retrieval, and LLM calls.
- Models: `models/chat_model.py` — chat/response logic.
- Data: uploaded files at `data/uploads/`, with vectors stored in Pinecone.

The backend is structured to separate API surface, application logic, and data services
so it can be extended to support different embedding providers, vector stores, or LLMs.

Remaining
- APIs to implement: `GET /documents` — List all uploaded documents.
- APIs to implement: `DELETE /documents/{id}` — Remove a document and its embeddings.
- Authentication: Login and authentication are not yet implemented. Planned approaches include token-based auth (JWT)


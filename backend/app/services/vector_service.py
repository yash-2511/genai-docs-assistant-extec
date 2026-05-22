import os
import uuid
from typing import Iterable

from langchain_core.documents import Document
from pinecone import Pinecone, ServerlessSpec
from pinecone.errors.exceptions import NotFoundError

from app.config import (
    PINECONE_API_KEY,
    PINECONE_CLOUD,
    PINECONE_DIMENSION,
    PINECONE_INDEX_NAME,
    PINECONE_NAMESPACE,
    PINECONE_REGION,
    RETRIEVAL_TOP_K,
    UPLOAD_DIR,
)
from app.services.embedding_service import embedding_model
from app.services.document_service import load_document, split_documents


def _namespace_value() -> str:
    return PINECONE_NAMESPACE or ""


def _get_client() -> Pinecone:
    if not PINECONE_API_KEY:
        raise ValueError("Pinecone API key is not configured.")

    return Pinecone(api_key=PINECONE_API_KEY)


def _get_existing_index():
    client = _get_client()
    if not client.has_index(PINECONE_INDEX_NAME):
        return None

    return client.Index(PINECONE_INDEX_NAME)


def _ensure_index():
    client = _get_client()

    if not client.has_index(PINECONE_INDEX_NAME):
        client.create_index(
            name=PINECONE_INDEX_NAME,
            dimension=PINECONE_DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(
                cloud=PINECONE_CLOUD,
                region=PINECONE_REGION,
            ),
        )

    return client.Index(PINECONE_INDEX_NAME)


def _vector_metadata(document: Document, chunk_index: int) -> dict:
    metadata = dict(document.metadata or {})
    source = metadata.get("source", "Unknown")
    metadata["source"] = source
    metadata["filename"] = os.path.basename(source) if source not in (None, "Unknown") else "Unknown"
    metadata["chunk_index"] = chunk_index
    metadata["text"] = document.page_content
    return metadata


def clear_index() -> None:
    index = _get_existing_index()
    if index is None:
        return

    try:
        index.delete(delete_all=True)
    except NotFoundError:
        return


def upsert_chunks(chunks: Iterable[Document]) -> int:
    chunks = list(chunks)
    if not chunks:
        clear_index()
        return 0

    index = _ensure_index()
    try:
        index.delete(delete_all=True)
    except NotFoundError:
        pass

    texts = [chunk.page_content for chunk in chunks]
    embeddings = embedding_model.embed_documents(texts)

    vectors = []
    for chunk_index, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        vectors.append(
            {
                "id": uuid.uuid4().hex,
                "values": embedding,
                "metadata": _vector_metadata(chunk, chunk_index),
            }
        )

    index.upsert(vectors=vectors, namespace=_namespace_value())
    return len(vectors)


def rebuild_index_from_uploads() -> int:
    document_files = sorted(
        filename
        for filename in os.listdir(UPLOAD_DIR)
        if filename.lower().endswith((".pdf", ".txt"))
        and os.path.isfile(os.path.join(UPLOAD_DIR, filename))
    )

    all_chunks = []
    for filename in document_files:
        file_path = os.path.join(UPLOAD_DIR, filename)
        documents = load_document(file_path)
        all_chunks.extend(split_documents(documents))

    return upsert_chunks(all_chunks)


def search_documents(query: str, top_k: int = RETRIEVAL_TOP_K):
    index = _get_existing_index()
    if index is None:
        return []

    query_vector = embedding_model.embed_query(query)
    response = index.query(
        vector=query_vector,
        top_k=top_k,
        include_metadata=True,
        namespace=_namespace_value(),
    )

    documents = []
    for match in getattr(response, "matches", []) or []:
        metadata = dict(getattr(match, "metadata", {}) or {})
        text = metadata.pop("text", "")
        metadata["score"] = getattr(match, "score", None)
        documents.append(
            Document(
                page_content=text,
                metadata=metadata,
            )
        )

    return documents
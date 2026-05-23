import os
import uuid
import re
from collections import Counter
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
from app.services.document_service import (
    get_session_upload_dir,
    get_supported_document_extensions,
    load_document,
    list_session_documents,
    split_documents,
)


def _namespace_value(user_id: str | None = None, session_id: str | None = None) -> str:
    if user_id and session_id:
        return f"user:{user_id}:session:{session_id}"

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
    page_value = metadata.get("page")
    if isinstance(page_value, int):
        metadata["page"] = page_value + 1
    elif isinstance(page_value, str) and page_value.isdigit():
        metadata["page"] = int(page_value) + 1
    metadata["chunk_index"] = chunk_index
    metadata["text"] = document.page_content
    return metadata


def _normalize_text(value: str) -> list[str]:
    tokens = re.findall(r"[a-z0-9]+", (value or "").lower())
    stop_words = {
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have",
        "how", "i", "in", "is", "it", "me", "of", "on", "or", "please", "show", "tell",
        "that", "the", "this", "to", "was", "what", "when", "where", "which", "who", "why",
        "with", "you", "your", "all", "asked", "ask", "question", "questions", "give", "list",
        "find", "need", "can", "could", "would"
    }
    return [token for token in tokens if token not in stop_words]


def _keyword_score(query_tokens: list[str], text: str, source: str) -> float:
    if not query_tokens:
        return 0.0

    text_tokens = Counter(_normalize_text(text))
    source_tokens = Counter(_normalize_text(source))
    overlap = sum(text_tokens[token] for token in query_tokens)
    filename_overlap = sum(source_tokens[token] for token in query_tokens)
    unique_overlap = sum(1 for token in set(query_tokens) if token in text_tokens or token in source_tokens)

    return float(overlap) + float(filename_overlap) * 1.5 + float(unique_overlap) * 0.5


def _semantic_score(match) -> float:
    score = getattr(match, "score", None)
    return float(score) if score is not None else 0.0


def _hybrid_rank_documents(query: str, documents: list[Document]) -> list[Document]:
    query_tokens = _normalize_text(query)
    if not documents:
        return []

    scored_documents = []
    for position, document in enumerate(documents):
        metadata = dict(document.metadata or {})
        text = document.page_content or metadata.get("text", "")
        source = metadata.get("source", "Unknown")
        semantic_score = float(metadata.get("score", 0.0) or 0.0)
        keyword_score = _keyword_score(query_tokens, text, source)
        normalized_keyword = min(keyword_score / 5.0, 1.0)
        rank_score = (semantic_score * 0.7) + (normalized_keyword * 0.3)
        scored_documents.append((rank_score, semantic_score, keyword_score, position, document))

    scored_documents.sort(key=lambda item: (item[0], item[1], item[2]), reverse=True)

    best_score = scored_documents[0][0]
    minimum_score = max(0.25, best_score * 0.45)
    filtered_documents = [document for rank_score, *_scores, document in scored_documents if rank_score >= minimum_score]

    return filtered_documents or []


def clear_index(user_id: str | None = None, session_id: str | None = None) -> None:
    index = _get_existing_index()
    if index is None:
        return

    try:
        index.delete(delete_all=True, namespace=_namespace_value(user_id, session_id))
    except NotFoundError:
        return


def upsert_chunks(chunks: Iterable[Document], user_id: str | None = None, session_id: str | None = None, replace_namespace: bool = True) -> int:
    chunks = list(chunks)
    if not chunks:
        if replace_namespace:
            clear_index(user_id, session_id)
        return 0

    index = _ensure_index()
    if replace_namespace:
        try:
            index.delete(delete_all=True, namespace=_namespace_value(user_id, session_id))
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

    index.upsert(vectors=vectors, namespace=_namespace_value(user_id, session_id))
    return len(vectors)


def rebuild_index_from_uploads() -> int:
    supported_extensions = tuple(sorted(get_supported_document_extensions()))
    document_files = sorted(
        filename
        for filename in os.listdir(UPLOAD_DIR)
        if os.path.isfile(os.path.join(UPLOAD_DIR, filename))
        and filename.lower().endswith(supported_extensions)
    )

    all_chunks = []
    for filename in document_files:
        file_path = os.path.join(UPLOAD_DIR, filename)
        documents = load_document(file_path)
        all_chunks.extend(split_documents(documents))

    return upsert_chunks(all_chunks)


def rebuild_session_index_from_uploads(user_id: str, session_id: str) -> int:
    session_dir = get_session_upload_dir(UPLOAD_DIR, user_id, session_id)
    os.makedirs(session_dir, exist_ok=True)

    filenames = list_session_documents(UPLOAD_DIR, user_id, session_id)
    all_chunks = []
    for filename in filenames:
        file_path = os.path.join(session_dir, filename)
        documents = load_document(file_path)
        all_chunks.extend(split_documents(documents))

    return upsert_chunks(all_chunks, user_id=user_id, session_id=session_id, replace_namespace=True)


def search_documents(query: str, top_k: int = RETRIEVAL_TOP_K, user_id: str | None = None, session_id: str | None = None):
    index = _get_existing_index()
    if index is None:
        return []

    query_vector = embedding_model.embed_query(query)
    fetch_k = max(top_k * 4, 10)
    response = index.query(
        vector=query_vector,
        top_k=fetch_k,
        include_metadata=True,
        namespace=_namespace_value(user_id, session_id),
    )

    documents = []
    for match in getattr(response, "matches", []) or []:
        metadata = dict(getattr(match, "metadata", {}) or {})
        text = metadata.pop("text", "")
        metadata["score"] = getattr(match, "score", None)
        document = Document(
            page_content=text,
            metadata=metadata,
        )
        documents.append(
            document
        )

    if not documents:
        return []

    ranked_documents = _hybrid_rank_documents(query, documents)
    return ranked_documents[:top_k]
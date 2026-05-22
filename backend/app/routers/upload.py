from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException
)

import shutil
import os
import json
import uuid
from datetime import datetime
from urllib.parse import unquote

from app.config import UPLOAD_DIR

from app.services.document_service import (
    load_document,
    split_documents
)
from app.services.vector_service import rebuild_index_from_uploads

router = APIRouter()

os.makedirs(UPLOAD_DIR, exist_ok=True)
DOCUMENTS_META_PATH = os.path.join(UPLOAD_DIR, "documents.json")


def _load_documents_meta():
    if os.path.exists(DOCUMENTS_META_PATH):
        with open(DOCUMENTS_META_PATH, "r", encoding="utf-8") as meta_file:
            return json.load(meta_file)

    return {}


def _save_documents_meta(documents_meta):
    with open(DOCUMENTS_META_PATH, "w", encoding="utf-8") as meta_file:
        json.dump(documents_meta, meta_file, indent=2)


def _sync_documents_meta():
    documents_meta = _load_documents_meta()
    document_files = _get_document_files()
    used_ids = set(documents_meta.keys())

    for filename in document_files:
        if filename in documents_meta.values():
            continue

        document_id = str(uuid.uuid4())
        while document_id in used_ids:
            document_id = str(uuid.uuid4())

        documents_meta[document_id] = filename
        used_ids.add(document_id)

    stale_ids = [
        document_id
        for document_id, filename in documents_meta.items()
        if filename not in document_files
    ]

    for document_id in stale_ids:
        documents_meta.pop(document_id, None)

    _save_documents_meta(documents_meta)
    return documents_meta


def _get_document_files():
    return sorted(
        filename
        for filename in os.listdir(UPLOAD_DIR)
        if filename.lower().endswith((".pdf", ".txt"))
        and os.path.isfile(os.path.join(UPLOAD_DIR, filename))
    )


def _document_payload(filename):
    file_path = os.path.join(UPLOAD_DIR, filename)
    stat_result = os.stat(file_path)

    return {
        "id": filename,
        "filename": filename,
        "size": stat_result.st_size,
        "updated_at": datetime.fromtimestamp(stat_result.st_mtime).isoformat()
    }


def _document_payload_from_meta(document_id, filename):
    payload = _document_payload(filename)
    payload["id"] = document_id
    return payload

@router.post("/upload", tags=["Upload API"])
async def upload_file(
    file: UploadFile = File(...)
):

    # Validate file
    if not file.filename.lower().endswith((".pdf", ".txt")):
        raise HTTPException(
            status_code=400,
            detail="Only PDF and TXT files allowed"
        )

    try:
        documents_meta = _load_documents_meta()
        document_id = str(uuid.uuid4())
        while document_id in documents_meta:
            document_id = str(uuid.uuid4())

        file_path = os.path.join(
            UPLOAD_DIR,
            file.filename
        )

        # Save document
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(
                file.file,
                buffer
            )

        documents = load_document(file_path)
        chunks = split_documents(documents)

        _sync_documents_meta()
        rebuild_index_from_uploads()

        return {
            "message": "Document uploaded successfully",
            "id": document_id,
            "filename": file.filename,
            "total_chunks": len(chunks)
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/documents", tags=["Documents API"])
def list_documents():
    documents_meta = _sync_documents_meta()

    return {
        "total": len(documents_meta),
        "documents": [
            _document_payload_from_meta(document_id, filename)
            for document_id, filename in sorted(documents_meta.items(), key=lambda item: item[1])
        ]
    }


@router.delete("/documents/{document_id}", tags=["Documents API"])
def delete_document(document_id: str):
    document_id = os.path.basename(unquote(document_id))
    documents_meta = _load_documents_meta()
    filename = documents_meta.get(document_id)

    if not filename:
        documents_meta = _sync_documents_meta()
        filename = documents_meta.get(document_id)

    file_path = os.path.join(UPLOAD_DIR, filename) if filename else None

    if not filename or not os.path.isfile(file_path):
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    try:
        os.remove(file_path)
        documents_meta.pop(document_id, None)
        _save_documents_meta(documents_meta)
        rebuild_index_from_uploads()

        return {
            "message": "Document deleted successfully",
            "document_id": document_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
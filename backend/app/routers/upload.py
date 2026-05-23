from __future__ import annotations

import os
import shutil
from datetime import datetime
from urllib.parse import unquote

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.config import UPLOAD_DIR
from app.dependencies.auth import get_current_user
from app.services.auth_service import (
    create_chat_session,
    get_active_session_id,
    get_session_for_user,
    set_active_session,
    set_session_has_documents,
)
from app.services.document_service import (
    get_session_upload_dir,
    get_supported_document_extensions,
    list_session_documents,
    load_document,
    session_has_documents,
    split_documents,
)
from app.services.vector_service import rebuild_session_index_from_uploads

router = APIRouter()

os.makedirs(UPLOAD_DIR, exist_ok=True)


def _resolve_target_session_id(current_user: dict, requested_session_id: str | None, allow_create: bool = True) -> str:
    user_id = current_user["id"]

    if requested_session_id:
        session_doc = get_session_for_user(requested_session_id, user_id)
        if not session_doc:
            raise HTTPException(status_code=404, detail="Session not found")
        set_active_session(user_id, requested_session_id)
        return requested_session_id

    active_session_id = get_active_session_id(user_id)
    if active_session_id:
        session_doc = get_session_for_user(active_session_id, user_id)
        if session_doc:
            return active_session_id

    if not allow_create:
        raise HTTPException(status_code=400, detail="No active session selected")

    new_session = create_chat_session(user_id)
    set_active_session(user_id, new_session["id"])
    return new_session["id"]


def _session_document_payload(base_dir: str, filename: str) -> dict:
    file_path = os.path.join(base_dir, filename)
    stat_result = os.stat(file_path)
    return {
        "id": filename,
        "filename": filename,
        "size": stat_result.st_size,
        "updated_at": datetime.fromtimestamp(stat_result.st_mtime).isoformat(),
    }


@router.post("/upload", tags=["Upload API"])
async def upload_file(
    file: UploadFile = File(...),
    session_id: str | None = Form(default=None),
    current_user=Depends(get_current_user),
):
    filename = os.path.basename(file.filename or "").strip()
    if not filename:
        raise HTTPException(status_code=400, detail="Please upload a valid file")

    supported_extensions = tuple(sorted(get_supported_document_extensions()))
    if not filename.lower().endswith(supported_extensions):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload PDF, TXT, DOCX, MD, CSV, JSON, HTML, or HTM files.",
        )

    target_session_id = _resolve_target_session_id(current_user, session_id)
    session_upload_dir = get_session_upload_dir(UPLOAD_DIR, current_user["id"], target_session_id)
    os.makedirs(session_upload_dir, exist_ok=True)

    file_path = os.path.join(session_upload_dir, filename)
    if os.path.exists(file_path):
        stem, extension = os.path.splitext(filename)
        dedup_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        filename = f"{stem}-{dedup_suffix}{extension}"
        file_path = os.path.join(session_upload_dir, filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        documents = load_document(file_path)
        chunks = split_documents(documents)

        if not chunks or not any((chunk.page_content or "").strip() for chunk in chunks):
            os.remove(file_path)
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is blank or contains no extractable text.",
            )

        total_chunks = rebuild_session_index_from_uploads(current_user["id"], target_session_id)
        set_session_has_documents(target_session_id, current_user["id"], True)

        return {
            "message": "Document uploaded successfully",
            "filename": filename,
            "session_id": target_session_id,
            "total_chunks": total_chunks,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/documents", tags=["Documents API"])
def list_documents(session_id: str | None = None, current_user=Depends(get_current_user)):
    target_session_id = _resolve_target_session_id(current_user, session_id, allow_create=False)
    session_upload_dir = get_session_upload_dir(UPLOAD_DIR, current_user["id"], target_session_id)
    filenames = list_session_documents(UPLOAD_DIR, current_user["id"], target_session_id)

    return {
        "total": len(filenames),
        "session_id": target_session_id,
        "documents": [_session_document_payload(session_upload_dir, name) for name in filenames],
    }


@router.delete("/documents/{document_id}", tags=["Documents API"])
def delete_document(document_id: str, session_id: str | None = None, current_user=Depends(get_current_user)):
    target_session_id = _resolve_target_session_id(current_user, session_id, allow_create=False)
    filename = os.path.basename(unquote(document_id or "")).strip()
    if not filename:
        raise HTTPException(status_code=400, detail="Invalid document id")

    session_upload_dir = get_session_upload_dir(UPLOAD_DIR, current_user["id"], target_session_id)
    file_path = os.path.join(session_upload_dir, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        os.remove(file_path)
        total_chunks = rebuild_session_index_from_uploads(current_user["id"], target_session_id)
        has_docs = session_has_documents(UPLOAD_DIR, current_user["id"], target_session_id)
        set_session_has_documents(target_session_id, current_user["id"], has_docs)

        return {
            "message": "Document deleted successfully",
            "document_id": filename,
            "session_id": target_session_id,
            "total_chunks": total_chunks,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

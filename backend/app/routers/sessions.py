from fastapi import APIRouter, Depends, HTTPException
import os
import shutil

from app.config import UPLOAD_DIR
from app.dependencies.auth import get_current_user
from app.services.document_service import get_session_upload_dir
from app.services.mongo_service import get_messages_collection, get_sessions_collection
from app.services.auth_service import (
    add_message,
    create_chat_session,
    delete_empty_sessions,
    get_session_for_user,
    get_user_sessions,
    list_messages,
    serialize_session,
    set_active_session,
)
from app.services.vector_service import clear_index

router = APIRouter(prefix="/chat", tags=["Chat Sessions API"])


@router.get("/sessions")
async def list_sessions(current_user=Depends(get_current_user)):
    delete_empty_sessions(current_user["id"])
    active_session = None
    active_session_id = current_user.get("active_session_id")
    if active_session_id:
      session_doc = get_session_for_user(active_session_id, current_user["id"])
      if session_doc and session_doc.get("last_message_at"):
          active_session = serialize_session(session_doc)
      else:
          set_active_session(current_user["id"], None)
    sessions = get_user_sessions(current_user["id"])
    return {
        "active_session_id": active_session["id"] if active_session else "",
        "sessions": sessions,
    }


@router.post("/sessions")
async def create_session(current_user=Depends(get_current_user)):
    delete_empty_sessions(current_user["id"])
    return {"session": None}


@router.post("/sessions/{session_id}/activate")
async def activate_session(session_id: str, current_user=Depends(get_current_user)):
    session_doc = get_session_for_user(session_id, current_user["id"])
    if not session_doc:
        raise HTTPException(status_code=404, detail="Session not found")
    set_active_session(current_user["id"], session_id)
    return {"session": serialize_session(session_doc)}


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, current_user=Depends(get_current_user)):
    session_doc = get_session_for_user(session_id, current_user["id"])
    if not session_doc:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, "messages": list_messages(session_id, current_user["id"])}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    session_doc = get_session_for_user(session_id, user_id)
    if not session_doc:
        raise HTTPException(status_code=404, detail="Session not found")

    get_messages_collection().delete_many({"session_id": session_id, "user_id": user_id})
    get_sessions_collection().delete_one({"_id": session_doc["_id"], "user_id": user_id})

    session_upload_dir = get_session_upload_dir(UPLOAD_DIR, user_id, session_id)
    if os.path.isdir(session_upload_dir):
        shutil.rmtree(session_upload_dir, ignore_errors=True)

    clear_index(user_id=user_id, session_id=session_id)

    next_active_session_id = ""
    if current_user.get("active_session_id") == session_id:
        set_active_session(user_id, None)

        remaining_sessions = get_user_sessions(user_id)
        if remaining_sessions:
            next_active_session_id = remaining_sessions[0]["id"]
            set_active_session(user_id, next_active_session_id)

    return {
        "deleted_session_id": session_id,
        "active_session_id": next_active_session_id,
    }

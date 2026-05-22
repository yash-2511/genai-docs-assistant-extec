from fastapi import APIRouter, Depends, HTTPException

from app.dependencies.auth import get_current_user
from app.services.auth_service import (
    add_message,
    create_chat_session,
    ensure_active_session,
    get_session_for_user,
    get_user_sessions,
    list_messages,
    serialize_session,
    set_active_session,
)

router = APIRouter(prefix="/chat", tags=["Chat Sessions API"])


@router.get("/sessions")
async def list_sessions(current_user=Depends(get_current_user)):
    active_session = ensure_active_session(current_user["id"])
    sessions = get_user_sessions(current_user["id"])
    return {
        "active_session_id": active_session["id"],
        "sessions": sessions,
    }


@router.post("/sessions")
async def create_session(current_user=Depends(get_current_user)):
    session = create_chat_session(current_user["id"])
    set_active_session(current_user["id"], session["id"])
    return {"session": session}


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

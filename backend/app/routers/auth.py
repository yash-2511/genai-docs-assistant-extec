from fastapi import APIRouter, Depends, HTTPException

from app.dependencies.auth import get_bearer_token, get_current_user
from app.models.auth_model import AuthResponse, LoginRequest, SignupRequest
from app.services.auth_service import (
    authenticate_user,
    create_user,
    delete_empty_sessions,
    get_active_session,
    issue_token,
    revoke_token,
)

router = APIRouter(prefix="/auth", tags=["Auth API"])


@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    try:
        user = create_user(request.name, request.email, request.password)
        token_data = issue_token(user["id"])
        delete_empty_sessions(user["id"])
        user["active_session_id"] = None
        return {
            "access_token": token_data["access_token"],
            "token_type": "bearer",
            "user": user,
            "active_session": None,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    try:
        user_doc = authenticate_user(request.email, request.password)
        token_data = issue_token(user_doc["id"])
        delete_empty_sessions(user_doc["id"])
        user_doc["active_session_id"] = None
        return {
            "access_token": token_data["access_token"],
            "token_type": "bearer",
            "user": user_doc,
            "active_session": None,
        }
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.get("/me", response_model=AuthResponse)
async def me(current_user=Depends(get_current_user), authorization: str = Depends(get_bearer_token)):
    active_session = get_active_session(current_user["id"])
    current_user["active_session_id"] = active_session["id"] if active_session else None
    return {
        "access_token": authorization,
        "token_type": "bearer",
        "user": current_user,
        "active_session": active_session,
    }


@router.post("/logout")
async def logout(token: str = Depends(get_bearer_token)):
    revoke_token(token)
    return {"message": "Logged out successfully"}

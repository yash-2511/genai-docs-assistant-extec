from pydantic import BaseModel


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    active_session_id: str | None = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    active_session: dict | None = None


class ChatSessionCreateResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: str | None = None
    updated_at: str | None = None
    last_message_at: str | None = None

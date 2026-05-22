from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from pymongo.collection import Collection

from app.config import AUTH_TOKEN_DAYS
from app.services.mongo_service import (
    get_messages_collection,
    get_sessions_collection,
    get_tokens_collection,
    get_users_collection,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return f"pbkdf2_sha256${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, salt_hex, digest_hex = stored_hash.split("$")
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    salt = bytes.fromhex(salt_hex)
    expected = bytes.fromhex(digest_hex)
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return hmac.compare_digest(expected, actual)


def create_password_hash(password: str) -> str:
    return _hash_password(password)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def serialize_user(user_doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(user_doc["_id"]),
        "name": user_doc.get("name", ""),
        "email": user_doc.get("email", ""),
        "active_session_id": user_doc.get("active_session_id"),
    }


def create_user(name: str, email: str, password: str) -> dict[str, Any]:
    users = get_users_collection()
    email = normalize_email(email)

    if users.find_one({"email": email}):
        raise ValueError("An account with this email already exists.")

    user_doc = {
        "name": name.strip(),
        "email": email,
        "password_hash": create_password_hash(password),
        "created_at": _utcnow(),
        "updated_at": _utcnow(),
        "active_session_id": None,
    }
    result = users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return serialize_user(user_doc)


def authenticate_user(email: str, password: str) -> dict[str, Any]:
    users = get_users_collection()
    user_doc = users.find_one({"email": normalize_email(email)})
    if not user_doc or not verify_password(password, user_doc.get("password_hash", "")):
        raise ValueError("Invalid email or password.")
    return serialize_user(user_doc)


def issue_token(user_id: str) -> dict[str, Any]:
    tokens = get_tokens_collection()
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = _utcnow() + timedelta(days=AUTH_TOKEN_DAYS)
    tokens.insert_one(
        {
            "token_hash": token_hash,
            "user_id": user_id,
            "created_at": _utcnow(),
            "expires_at": expires_at,
        }
    )
    return {"access_token": token, "expires_at": expires_at}


def revoke_token(token: str) -> None:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    get_tokens_collection().delete_many({"token_hash": token_hash})


def get_user_from_token(token: str) -> dict[str, Any]:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    token_doc = get_tokens_collection().find_one({"token_hash": token_hash})
    if not token_doc:
        raise ValueError("Invalid or expired token.")

    expires_at = token_doc.get("expires_at")
    normalized_expires_at = _ensure_aware(expires_at)
    if normalized_expires_at and normalized_expires_at < _utcnow():
        revoke_token(token)
        raise ValueError("Invalid or expired token.")

    user_doc = get_users_collection().find_one({"_id": ObjectId(token_doc["user_id"])})
    if not user_doc:
        raise ValueError("Invalid or expired token.")
    return user_doc


def create_chat_session(user_id: str, title: str | None = None) -> dict[str, Any]:
    sessions = get_sessions_collection()
    session_doc = {
        "user_id": user_id,
        "title": (title or "New chat").strip()[:80],
        "created_at": _utcnow(),
        "updated_at": _utcnow(),
        "last_message_at": None,
    }
    result = sessions.insert_one(session_doc)
    session_doc["_id"] = result.inserted_id
    return serialize_session(session_doc)


def serialize_session(session_doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(session_doc["_id"]),
        "user_id": str(session_doc.get("user_id")),
        "title": session_doc.get("title", "New chat"),
        "created_at": session_doc.get("created_at").isoformat() if session_doc.get("created_at") else None,
        "updated_at": session_doc.get("updated_at").isoformat() if session_doc.get("updated_at") else None,
        "last_message_at": session_doc.get("last_message_at").isoformat() if session_doc.get("last_message_at") else None,
    }


def get_user_sessions(user_id: str) -> list[dict[str, Any]]:
    sessions = get_sessions_collection()
    session_docs = list(
        sessions.find({"user_id": user_id}).sort([("last_message_at", -1), ("updated_at", -1), ("created_at", -1)])
    )
    return [serialize_session(doc) for doc in session_docs]


def get_session_for_user(session_id: str, user_id: str) -> dict[str, Any] | None:
    session_doc = get_sessions_collection().find_one({"_id": ObjectId(session_id), "user_id": user_id})
    return session_doc


def set_active_session(user_id: str, session_id: str) -> None:
    get_users_collection().update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"active_session_id": session_id, "updated_at": _utcnow()}},
    )


def get_active_session_id(user_id: str) -> str | None:
    user_doc = get_users_collection().find_one({"_id": ObjectId(user_id)})
    return user_doc.get("active_session_id") if user_doc else None


def ensure_active_session(user_id: str) -> dict[str, Any]:
    active_session_id = get_active_session_id(user_id)
    if active_session_id:
        session_doc = get_session_for_user(active_session_id, user_id)
        if session_doc:
            return serialize_session(session_doc)

    session = create_chat_session(user_id)
    set_active_session(user_id, session["id"])
    return session


def list_messages(session_id: str, user_id: str) -> list[dict[str, Any]]:
    messages = get_messages_collection()
    docs = list(
        messages.find({"session_id": session_id, "user_id": user_id}).sort("created_at", 1)
    )
    return [serialize_message(doc) for doc in docs]


def serialize_message(message_doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(message_doc["_id"]),
        "session_id": message_doc.get("session_id"),
        "user_id": message_doc.get("user_id"),
        "role": message_doc.get("role"),
        "content": message_doc.get("content", ""),
        "sources": message_doc.get("sources", []),
        "created_at": message_doc.get("created_at").isoformat() if message_doc.get("created_at") else None,
    }


def add_message(session_id: str, user_id: str, role: str, content: str, sources: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    message_doc = {
        "session_id": session_id,
        "user_id": user_id,
        "role": role,
        "content": content,
        "sources": sources or [],
        "created_at": _utcnow(),
    }
    result = get_messages_collection().insert_one(message_doc)
    message_doc["_id"] = result.inserted_id

    get_sessions_collection().update_one(
        {"_id": ObjectId(session_id), "user_id": user_id},
        {"$set": {"updated_at": _utcnow(), "last_message_at": _utcnow()}},
    )
    return serialize_message(message_doc)


def update_session_title_from_first_message(session_id: str, user_id: str, content: str) -> None:
    title = content.strip().replace("\n", " ")[:60] or "New chat"
    get_sessions_collection().update_one(
        {"_id": ObjectId(session_id), "user_id": user_id},
        {"$set": {"title": title, "updated_at": _utcnow()}},
    )

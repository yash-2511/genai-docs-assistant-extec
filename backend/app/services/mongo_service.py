from __future__ import annotations

from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection

from app.config import MONGO_DB_NAME, MONGO_URI

_client: MongoClient | None = None


def get_mongo_client() -> MongoClient:
    global _client
    if _client is None:
        if not MONGO_URI:
            raise ValueError("MongoDB URI is not configured.")
        _client = MongoClient(MONGO_URI)
    return _client


def get_db() -> Database:
    return get_mongo_client()[MONGO_DB_NAME]


def get_users_collection() -> Collection:
    return get_db()["users"]


def get_tokens_collection() -> Collection:
    return get_db()["auth_tokens"]


def get_sessions_collection() -> Collection:
    return get_db()["chat_sessions"]


def get_messages_collection() -> Collection:
    return get_db()["chat_messages"]

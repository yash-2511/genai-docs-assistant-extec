import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))
load_dotenv()


def _get_retrieval_top_k() -> int:
    raw_value = os.getenv("RETRIEVAL_TOP_K", "3")

    try:
        top_k = int(raw_value)
    except ValueError as exc:
        raise ValueError(
            "RETRIEVAL_TOP_K must be an integer between 3 and 5"
        ) from exc

    if top_k < 3 or top_k > 5:
        raise ValueError(
            "RETRIEVAL_TOP_K must be between 3 and 5"
        )

    return top_k

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    os.getenv("MODEL_NAME", "gemini-2.5-flash")
)

GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY",
    os.getenv("GOOGLE_API_KEY", "")
)

PINECONE_API_KEY = (
    os.getenv("PINECONE_API_KEY")
    or os.getenv("pincone_api")
    or os.getenv("pinecone_api")
    or ""
)

PINECONE_INDEX_NAME = os.getenv(
    "PINECONE_INDEX_NAME",
    "genai-doc-assistant"
)

PINECONE_CLOUD = os.getenv(
    "PINECONE_CLOUD",
    "aws"
)

PINECONE_REGION = os.getenv(
    "PINECONE_REGION",
    "us-east-1"
)

PINECONE_NAMESPACE = os.getenv(
    "PINECONE_NAMESPACE",
    ""
)

PINECONE_DIMENSION = int(os.getenv("PINECONE_DIMENSION", "384"))

MONGO_URI = os.getenv(
    "MONGO_URI",
    os.getenv("MONGODB_URI", "")
)

MONGO_DB_NAME = os.getenv(
    "MONGO_DB_NAME",
    "genai_doc_assistant"
)

AUTH_TOKEN_DAYS = int(os.getenv("AUTH_TOKEN_DAYS", "30"))

UPLOAD_DIR = "app/data/uploads"

RETRIEVAL_TOP_K = _get_retrieval_top_k()
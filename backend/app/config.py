import os
from dotenv import load_dotenv

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

MODEL_NAME = os.getenv(
    "MODEL_NAME",
    "llama3.2"
)

UPLOAD_DIR = "app/data/uploads"

FAISS_DB_PATH = "app/data/faiss_index"

RETRIEVAL_TOP_K = _get_retrieval_top_k()
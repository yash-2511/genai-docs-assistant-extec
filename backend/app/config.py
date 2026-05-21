import os
from dotenv import load_dotenv

load_dotenv()

MODEL_NAME = os.getenv(
    "MODEL_NAME",
    "llama3.2"
)

UPLOAD_DIR = "app/data/uploads"

FAISS_DB_PATH = "app/data/faiss_index"
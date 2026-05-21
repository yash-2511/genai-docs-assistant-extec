from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException
)

import shutil
import os

from app.config import UPLOAD_DIR

from app.services.document_service import (
    load_pdf,
    split_documents
)

from app.services.vector_service import (
    create_vector_store
)

router = APIRouter()

os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", tags=["Upload API"])
async def upload_file(
    file: UploadFile = File(...)
):

    # Validate file
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files allowed"
        )

    try:

        file_path = os.path.join(
            UPLOAD_DIR,
            file.filename
        )

        # Save PDF
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(
                file.file,
                buffer
            )

        # Load PDF
        documents = load_pdf(file_path)

        # Split into chunks
        chunks = split_documents(
            documents
        )

        # Create FAISS DB
        create_vector_store(chunks)

        return {
            "message": "PDF uploaded successfully",
            "filename": file.filename,
            "total_chunks": len(chunks)
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
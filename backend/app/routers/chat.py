from fastapi import (
    APIRouter,
    HTTPException
)

from app.models.chat_model import (
    QuestionRequest
)

from app.services.retriever_service import (
    get_retriever
)

from app.services.llm_service import llm

router = APIRouter()

@router.post("/ask",tags=["Chat API"])
async def ask_question(
    request: QuestionRequest
):

    try:

        retriever = get_retriever()

        # NEW LANGCHAIN SYNTAX
        docs = retriever.invoke(
            request.question
        )

        if not docs:

            return {
                "answer": "No relevant context found."
            }

        context = "\n\n".join(
            [
                doc.page_content
                for doc in docs
            ]
        )

        sources = []

        for doc in docs:

            source_data = {
                "page": doc.metadata.get(
                    "page",
                    "N/A"
                ),
                "source": doc.metadata.get(
                    "source",
                    "Unknown"
                )
            }

            sources.append(source_data)

        prompt = f"""
You are a helpful AI assistant.

Answer ONLY from the provided context.

If the answer is not present in context,
say:
"I don't know based on provided documents."

Context:
{context}

Question:
{request.question}
"""

        response = llm.invoke(prompt)

        return {
            "question": request.question,
            "answer": response.content,
            "sources": sources
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
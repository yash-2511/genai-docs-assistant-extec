from fastapi import (
    APIRouter,
    HTTPException
)
import re

from app.models.chat_model import (
    QuestionRequest
)

from app.services.retriever_service import (
    get_retriever
)

from app.services.llm_service import llm

router = APIRouter()


def format_answer_text(answer: str) -> str:
    cleaned = answer.replace("\r\n", "\n").replace("\r", "\n")
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"__(.*?)__", r"\1", cleaned)
    cleaned = re.sub(r"(?m)^\s*[-*•]\s+", "", cleaned)
    cleaned = re.sub(r"\s*(\d+\.\s+)", r"\n\1", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"(?m)^\s*\d+\.\s+", "", cleaned)
    return cleaned.strip()

@router.post("/ask",tags=["Chat API"])
async def ask_question(
    request: QuestionRequest
):

    try:

        retriever = get_retriever()
        docs = retriever.get_relevant_documents(request.question)

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
    Write the answer in a clean, readable format.
    Use short lines or short paragraphs.
    If you use points, put each point on a new line.
    Do not use markdown symbols like **, __, or numbered prefixes.

    If the answer is not present in context,
    say:
    "I don't know based on provided documents."

    Context:
    {context}

    Question:
    {request.question}
    """

        response = llm.invoke(prompt)
        formatted_answer = format_answer_text(response.content)

        return {
            "question": request.question,
            "answer": formatted_answer,
            "sources": sources
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
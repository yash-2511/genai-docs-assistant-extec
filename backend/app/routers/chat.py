from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)
import re

from app.dependencies.auth import get_current_user
from app.models.chat_model import (
    QuestionRequest
)

from app.services.retriever_service import (
    get_retriever
)

from app.services.llm_service import llm
from app.services.auth_service import (
    add_message,
    ensure_active_session,
    get_session_for_user,
    list_messages,
    set_active_session,
    update_session_title_from_first_message,
)

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
    request: QuestionRequest,
    current_user=Depends(get_current_user)
):

    try:

        session_id = request.session_id
        if session_id:
            session_doc = get_session_for_user(session_id, current_user["id"])
            if not session_doc:
                raise HTTPException(status_code=404, detail="Session not found")
            set_active_session(current_user["id"], session_id)
        else:
            session = ensure_active_session(current_user["id"])
            session_id = session["id"]

        retriever = get_retriever()
        docs = retriever.get_relevant_documents(request.question)

        existing_messages = list_messages(session_id, current_user["id"])
        if not existing_messages:
            update_session_title_from_first_message(session_id, current_user["id"], request.question)

        add_message(session_id, current_user["id"], "user", request.question, [])

        if not docs:
            answer_text = "No relevant context found."
            add_message(session_id, current_user["id"], "assistant", answer_text, [])
            return {
                "question": request.question,
                "answer": answer_text,
                "sources": [],
                "session_id": session_id,
            }

        context = "\n\n".join(
            [
                doc.page_content
                for doc in docs
            ]
        )

        recent_history = existing_messages[-6:]
        history_text = "\n".join(
            [
                f"{message['role'].capitalize()}: {message['content']}"
                for message in recent_history
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

    Continue the conversation naturally using the chat history when relevant.

    If the answer is not present in context,
    say:
    "I don't know based on provided documents."

    Chat history:
    {history_text}

    Context:
    {context}

    Question:
    {request.question}
    """

        response = llm.invoke(prompt)
        formatted_answer = format_answer_text(response.content)

        add_message(session_id, current_user["id"], "assistant", formatted_answer, sources)

        return {
            "question": request.question,
            "answer": formatted_answer,
            "session_id": session_id,
            "sources": sources
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
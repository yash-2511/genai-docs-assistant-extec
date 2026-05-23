from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)
import json
import re

from app.dependencies.auth import get_current_user
from app.config import UPLOAD_DIR
from app.models.chat_model import (
    QuestionRequest
)

from app.services.retriever_service import (
    get_retriever
)

from app.services.llm_service import llm
from app.services.auth_service import (
    add_message,
    create_chat_session,
    get_session_for_user,
    list_messages,
    set_active_session,
    update_session_title_from_first_message,
)
from app.services.document_service import session_has_documents

router = APIRouter(prefix="/chat", tags=["Chat API"])


def format_answer_text(answer: str) -> str:
    cleaned = answer.replace("\r\n", "\n").replace("\r", "\n")
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"__(.*?)__", r"\1", cleaned)
    cleaned = re.sub(r"(?m)^\s*[-*•]\s+", "", cleaned)
    cleaned = re.sub(r"\s*(\d+\.\s+)", r"\n\1", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"(?m)^\s*\d+\.\s+", "", cleaned)
    return cleaned.strip()


def build_history_text(messages: list[dict]) -> str:
    if not messages:
        return "No prior conversation."

    return "\n".join(
        [
            f"{message['role'].capitalize()}: {message['content']}"
            for message in messages
        ]
    )


def classify_question_intent(question: str, history_text: str) -> dict:
    prompt = f"""
You are an intent router for a document chat app.

Classify the user's current message using only the message and the current chat history.
Return JSON only with these keys:
- intent: one of ["greeting", "history_summary", "document_question", "general_question"]
- use_history: true or false
- use_documents: true or false

Rules:
- greeting: hello/hi/thanks/bye style messages.
- history_summary: the user asks what they asked in this chat, asks to list past questions, or asks to recall earlier questions in this same chat.
- document_question: the user asks about uploaded documents, their contents, citations, or asks a question that should be answered from documents.
- general_question: anything else.
- use_history should be true only when the current chat history helps answer the current message.
- use_documents should be true only when document context is needed.

Current chat history:
{history_text}

User message:
{question}
"""

    raw_response = llm.invoke(prompt)
    response_text = raw_response.content.strip()

    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        cleaned = re.sub(r"```(?:json)?|```", "", response_text).strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            normalized = (question or "").lower()
            if any(token in normalized for token in ["hi", "hello", "thanks", "thank you", "bye"]):
                return {"intent": "greeting", "use_history": True, "use_documents": False}
            if any(token in normalized for token in ["what questions", "what did i ask", "list my questions", "questions i asked", "what have i asked"]):
                return {"intent": "history_summary", "use_history": True, "use_documents": False}
            if any(token in normalized for token in ["document", "file", "pdf", "page", "citation", "source", "uploaded"]):
                return {"intent": "document_question", "use_history": False, "use_documents": True}
            return {"intent": "general_question", "use_history": False, "use_documents": False}


def build_prompt(question: str, context: str | None, history_text: str | None = None) -> str:
    if context:
        if history_text:
            return f"""
    You are a helpful AI assistant.

    Answer primarily from the retrieved document context.
    Use the conversation history only when it clearly helps resolve the current question.
    Do not introduce unrelated topics from conversation history.

    Write the answer in a clean, readable format.
    Use short lines or short paragraphs.
    If you use points, put each point on a new line.
    Do not use markdown symbols like **, __, or numbered prefixes.

    If the answer is not present in either the conversation history or the provided documents,
    say:
    "I don't know based on the conversation or provided documents."

    Conversation history:
    {history_text}

    Retrieved context:
    {context}

    Question:
    {question}
    """

        return f"""
    You are a helpful AI assistant.

    Answer ONLY from the retrieved document context.
    Do not use conversation history.
    Do not introduce unrelated topics or assumptions.

    Write the answer in a clean, readable format.
    Use short lines or short paragraphs.
    If you use points, put each point on a new line.
    Do not use markdown symbols like **, __, or numbered prefixes.

    If the answer is not present in the provided documents,
    say:
    "I don't know based on the provided documents."

    Retrieved context:
    {context}

    Question:
    {question}
    """

    if history_text:
        return f"""
    You are a helpful AI assistant.

    Answer ONLY from the conversation history.
    Use the conversation history to resolve follow-up questions, pronouns, and references to earlier answers.
    If the user asks about what they previously asked, summarize the user's earlier questions from the conversation history.
    If the conversation history does not contain enough information,
    say:
    "I don't know based on the conversation."

    Write the answer in a clean, readable format.
    Use short lines or short paragraphs.
    If you use points, put each point on a new line.
    Do not use markdown symbols like **, __, or numbered prefixes.

    Conversation history:
    {history_text}

    Question:
    {question}
    """

    return f"""
    You are a helpful AI assistant.

    Answer ONLY from the user's current question.
    Do not use conversation history or retrieved document context.
    If the question cannot be answered directly, ask the user to clarify or ask about the uploaded documents.

    Write the answer in a clean, readable format.
    Use short lines or short paragraphs.
    Do not use markdown symbols like **, __, or numbered prefixes.

    Question:
    {question}
    """


def format_question_history_response(messages: list[dict]) -> str:
    questions = [
        message["content"].strip()
        for message in messages
        if message.get("role") == "user" and message.get("content", "").strip()
    ]

    if not questions:
        return "I do not have any previous questions in this chat yet."

    lines = ["Here are the questions you asked in this chat:"]
    lines.extend(f"- {question}" for question in questions)
    return "\n".join(lines)


def build_greeting_prompt(question: str, history_text: str) -> str:
    return f"""
    You are a helpful AI assistant for a document-based chat app.

    The user is greeting you or thanking you.
    Reply warmly and briefly.
    Do not use document citations or mention retrieved context.
    After greeting back, invite the user to ask questions about the uploaded documents.

    Conversation history:
    {history_text}

    User message:
    {question}
    """

@router.post("/ask")
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
            session = create_chat_session(current_user["id"])
            set_active_session(current_user["id"], session["id"])
            session_id = session["id"]

        existing_messages = list_messages(session_id, current_user["id"])
        prior_turns = existing_messages[-8:]
        if not existing_messages:
            update_session_title_from_first_message(session_id, current_user["id"], request.question)

        add_message(session_id, current_user["id"], "user", request.question, [])

        history_text = build_history_text(prior_turns)
        intent = classify_question_intent(request.question, history_text)

        sources = []
        context = None

        if intent.get("intent") == "greeting":
            prompt = build_greeting_prompt(request.question, history_text)
            response = llm.invoke(prompt)
            formatted_answer = format_answer_text(response.content)

            add_message(session_id, current_user["id"], "assistant", formatted_answer, sources)

            return {
                "question": request.question,
                "answer": formatted_answer,
                "session_id": session_id,
                "sources": sources,
            }

        if intent.get("intent") == "history_summary":
            formatted_answer = format_question_history_response(prior_turns)
            add_message(session_id, current_user["id"], "assistant", formatted_answer, sources)

            return {
                "question": request.question,
                "answer": formatted_answer,
                "session_id": session_id,
                "sources": sources,
            }

        docs = []
        if intent.get("use_documents") and session_has_documents(UPLOAD_DIR, current_user["id"], session_id):
            retriever = get_retriever()
            docs = retriever.get_relevant_documents(
                request.question,
                user_id=current_user["id"],
                session_id=session_id,
            )

        if docs:
            filtered_docs = []
            for doc in docs:
                text = (doc.page_content or "").strip()
                source_name = doc.metadata.get("source", "Unknown")
                page_value = doc.metadata.get("page", "N/A")
                if not text:
                    continue

                filtered_docs.append(doc)
                sources.append(
                    {
                        "page": page_value,
                        "source": source_name,
                    }
                )

            if filtered_docs:
                context = "\n\n".join([doc.page_content for doc in filtered_docs])

        prompt_history = history_text if intent.get("use_history") else None
        prompt = build_prompt(request.question, context, prompt_history)

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
# GenAI Doc Assistant

GenAI Doc Assistant is a document-grounded chat app. Users can upload files, ask questions about their content, and get answers backed by retrieved document context and chat history. The app has a React frontend, a FastAPI backend, MongoDB for auth and chat/session data, and Pinecone for vector search.

## Features

- Document upload and session-based document management
- Chat over uploaded files with source-aware answers
- Per-user sessions, chat history, and session activation
- Authentication with bearer tokens
- Gemini-powered LLM responses
- Docker-based local development support

## Project Structure

- `backend/` FastAPI application, data services, and API routes
- `frontend/` React + Vite UI
- `docker-compose.yml` Orchestrates backend and frontend containers

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+ or a Docker installation
- MongoDB connection string
- Pinecone API key and index
- Gemini API key

## Environment Setup

The backend reads environment variables from `backend/app/.env`.

Minimum variables you should set:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
MONGO_URI=
PINECONE_API_KEY=
PINECONE_INDEX_NAME=genai-doc-assistant
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
RETRIEVAL_TOP_K=4
```

Notes:
- Paste your Gemini API key after `GEMINI_API_KEY=`.
- `GEMINI_MODEL` defaults to `gemini-2.5-flash`.
- The repository may already include additional local values in `backend/app/.env`; keep your own secrets private.

## Local Setup Without Docker

### Backend

1. Open a terminal in the repository root.
2. Install backend dependencies:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

3. Add your environment values in `backend/app/.env`.
4. Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`.

### Frontend

1. Open a second terminal.
2. Install frontend dependencies:

```bash
cd frontend
npm install
```

3. Start the dev server:

```bash
npm run dev
```

The frontend will be available at the Vite dev URL.

## Docker Setup

1. Make sure your backend environment variables are set in `backend/app/.env`.
2. From the repository root, run:

```bash
docker compose up --build
```

This starts:
- Backend on `http://localhost:8000`
- Frontend on `http://localhost:3000`

## How To Use

1. Sign up or log in.
2. Upload a document.
3. Ask questions about the document content.
4. Review the cited sources returned with the answer.

## API Surface

The frontend talks to the backend using these key routes:

- `POST /chat/ask`
- `GET /chat/sessions`
- `GET /chat/sessions/{session_id}/messages`
- `POST /chat/sessions/{session_id}/activate`
- `DELETE /chat/sessions/{session_id}`
- `POST /upload`
- `GET /documents`
- `DELETE /documents/{document_id}`

All chat, session, and upload routes require a bearer token.

## Troubleshooting

- If uploads succeed but do not show in chat, confirm the same session is active.
- If the backend fails to start, check that `GEMINI_API_KEY`, `MONGO_URI`, and Pinecone settings are present in `backend/app/.env`.
- If the UI shows stale status text, refresh the page after a failed upload or session change.
- If model calls fail, verify the Gemini model name and key are valid for your account.

## Development Notes

- The backend uses Gemini through LangChain's `ChatGoogleGenerativeAI` client.
- Session and upload data live per user and per session.
- Source citations are generated from the retrieved document chunks.

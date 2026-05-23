from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, chat, sessions, upload

app = FastAPI(
    title="RAG Chatbot API"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(auth.router)
app.include_router(sessions.router)

@app.get("/", tags=["custom API"])
def root():
    return {
        "message": "Backend Running successfully on PORT: 8000"
    }

@app.get("/health",tags=["custom API"])
def health():
    return {
        "status": "healthy"
    }
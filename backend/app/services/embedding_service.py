from app.config import (
    OPENROUTER_EMBEDDING_DIMENSIONS,
    OPENROUTER_EMBEDDING_MODEL,
)
from app.services.openrouter_service import client


class OpenRouterEmbeddings:
    def __init__(self, model: str, dimensions: int | None = None) -> None:
        self.model = model.strip()
        self.dimensions = dimensions

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        return client.embed(
            model=self.model,
            texts=texts,
            dimensions=self.dimensions,
        )

    def embed_query(self, text: str) -> list[float]:
        embeddings = self.embed_documents([text])
        return embeddings[0] if embeddings else []


embedding_model = OpenRouterEmbeddings(
    model=OPENROUTER_EMBEDDING_MODEL,
    dimensions=OPENROUTER_EMBEDDING_DIMENSIONS,
)
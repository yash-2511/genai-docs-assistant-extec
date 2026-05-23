from app.config import OPENROUTER_MODEL
from app.services.openrouter_service import client, OpenRouterResponse


class OpenRouterLLM:
    def __init__(self, model: str, temperature: float = 0.3) -> None:
        self.model = model.strip()
        self.temperature = temperature

    def invoke(self, prompt: str) -> OpenRouterResponse:
        return client.chat(
            model=self.model,
            prompt=prompt,
            temperature=self.temperature,
        )


llm = OpenRouterLLM(
    model=OPENROUTER_MODEL,
    temperature=0.3,
)
from __future__ import annotations

from dataclasses import dataclass
import json
import urllib.error
import urllib.request

from app.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_APP_NAME,
    OPENROUTER_BASE_URL,
    OPENROUTER_SITE_URL,
)


@dataclass
class OpenRouterResponse:
    content: str


class OpenRouterClient:
    def __init__(
        self,
        api_key: str,
        base_url: str,
        site_url: str = "",
        app_name: str = "",
        timeout: int = 90,
    ) -> None:
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not set")

        self.api_key = api_key.strip()
        self.base_url = base_url.rstrip("/")
        self.site_url = site_url.strip()
        self.app_name = app_name.strip()
        self.timeout = timeout

    def _post(self, path: str, payload: dict) -> dict:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        if self.site_url:
            headers["HTTP-Referer"] = self.site_url

        if self.app_name:
            headers["X-Title"] = self.app_name

        request = urllib.request.Request(
            url=f"{self.base_url}{path}",
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                response_body = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"OpenRouter request failed ({exc.code}): {error_body}"
            ) from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"OpenRouter request failed: {exc.reason}") from exc

        try:
            response_data = json.loads(response_body)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f"OpenRouter returned invalid JSON: {response_body[:500]}"
            ) from exc

        if response_data.get("error"):
            raise RuntimeError(f"OpenRouter error: {response_data['error']}")

        return response_data

    def chat(self, model: str, prompt: str, temperature: float = 0.3) -> OpenRouterResponse:
        response_data = self._post(
            "/chat/completions",
            {
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                "temperature": temperature,
            },
        )

        choices = response_data.get("choices") or []
        if not choices:
            raise RuntimeError(f"OpenRouter returned no choices: {response_data}")

        message = choices[0].get("message") or {}
        content = message.get("content")
        if content is None:
            content = choices[0].get("text", "")

        return OpenRouterResponse(content=content or "")

    def embed(self, model: str, texts: list[str], dimensions: int | None = None) -> list[list[float]]:
        payload: dict = {
            "model": model,
            "input": texts,
        }

        if dimensions is not None:
            payload["dimensions"] = dimensions

        response_data = self._post("/embeddings", payload)
        items = response_data.get("data") or []
        if not items:
            raise RuntimeError(f"OpenRouter returned no embeddings: {response_data}")

        ordered_embeddings = sorted(items, key=lambda item: item.get("index", 0))
        return [item["embedding"] for item in ordered_embeddings]


client = OpenRouterClient(
    api_key=OPENROUTER_API_KEY,
    base_url=OPENROUTER_BASE_URL,
    site_url=OPENROUTER_SITE_URL,
    app_name=OPENROUTER_APP_NAME,
)
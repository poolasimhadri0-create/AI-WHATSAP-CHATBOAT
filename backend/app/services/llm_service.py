import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional
from app.core.config import settings
from app.utils.logger import logger
from app.utils.exceptions import LLMServiceException


class LLMService:
    """
    Service encapsulating LLM provider interactions (OpenAI, Anthropic, Gemini, Groq, Mock)
    with streaming response generation, token estimation, and mock fallback.
    """

    def __init__(self):
        self._openai_client = None
        self._anthropic_client = None
        self._gemini_client = None
        self._groq_client = None

    @property
    def provider(self) -> str:
        return settings.LLM_PROVIDER.lower()

    @property
    def model(self) -> str:
        return settings.LLM_MODEL

    def _get_openai_client(self):
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY in ["your_openai_api_key_here", "mock-dev-key"]:
            return None
        if self._openai_client is None:
            from openai import AsyncOpenAI
            self._openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._openai_client

    def _get_anthropic_client(self):
        if not settings.ANTHROPIC_API_KEY or settings.ANTHROPIC_API_KEY in ["your_anthropic_api_key_here", "mock-dev-key"]:
            return None
        if self._anthropic_client is None:
            from anthropic import AsyncAnthropic
            self._anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._anthropic_client

    def _get_gemini_client(self):
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY in ["your_gemini_api_key_here", "mock-dev-key"]:
            return None
        if self._gemini_client is None:
            from openai import AsyncOpenAI
            self._gemini_client = AsyncOpenAI(
                api_key=settings.GEMINI_API_KEY,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
            )
        return self._gemini_client

    def _get_groq_client(self):
        if not settings.GROQ_API_KEY or settings.GROQ_API_KEY in ["your_groq_api_key_here", "mock-dev-key"]:
            return None
        if self._groq_client is None:
            from openai import AsyncOpenAI
            self._groq_client = AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url="https://api.groq.com/openai/v1"
            )
        return self._groq_client

    async def stream_chat_completion(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = "You are a helpful, knowledgeable, and polite AI assistant."
    ) -> AsyncGenerator[str, None]:
        """
        Streams AI response token-by-token.
        If provider is mock or keys are not provided, provides high-quality simulated streaming.
        """
        prov = self.provider
        if prov == "mock":
            async for token in self._simulated_response(messages):
                yield token
        elif prov == "gemini":
            async for token in self._stream_gemini(messages, system_prompt):
                yield token
        elif prov == "groq":
            async for token in self._stream_groq(messages, system_prompt):
                yield token
        elif prov == "anthropic":
            async for token in self._stream_anthropic(messages, system_prompt):
                yield token
        else:
            async for token in self._stream_openai(messages, system_prompt):
                yield token

    async def _stream_openai(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str]
    ) -> AsyncGenerator[str, None]:
        client = self._get_openai_client()

        if client is None:
            logger.info("Using simulated OpenAI streaming response (dev mode)")
            async for token in self._simulated_response(messages):
                yield token
            return

        try:
            formatted_messages = []
            if system_prompt:
                formatted_messages.append({"role": "system", "content": system_prompt})
            formatted_messages.extend(messages)

            stream = await client.chat.completions.create(
                model=self.model,
                messages=formatted_messages,
                temperature=settings.DEFAULT_TEMPERATURE,
                max_tokens=settings.DEFAULT_MAX_TOKENS,
                stream=True
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content

        except Exception as e:
            logger.error(f"OpenAI Streaming error: {str(e)}")
            err_msg = str(e)
            if "insufficient_quota" in err_msg or "credit_balance_exhausted" in err_msg:
                raise LLMServiceException("OpenAI Error: Credit balance exhausted ($0). Please top up credits at platform.openai.com or switch to LLM_PROVIDER=mock in backend/.env")
            raise LLMServiceException(f"OpenAI service error: {err_msg}")

    async def _stream_anthropic(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str]
    ) -> AsyncGenerator[str, None]:
        client = self._get_anthropic_client()

        if client is None:
            logger.info("Using simulated Anthropic streaming response (dev mode)")
            async for token in self._simulated_response(messages):
                yield token
            return

        try:
            anthropic_messages = [
                {"role": m["role"], "content": m["content"]}
                for m in messages if m["role"] in ["user", "assistant"]
            ]

            async with client.messages.stream(
                model=self.model if "claude" in self.model else "claude-3-haiku-20240307",
                max_tokens=settings.DEFAULT_MAX_TOKENS,
                system=system_prompt or "You are a helpful AI assistant.",
                messages=anthropic_messages
            ) as stream:
                async for text in stream.text_stream:
                    yield text

        except Exception as e:
            logger.error(f"Anthropic Streaming error: {str(e)}")
            err_msg = str(e)
            if "credit balance is too low" in err_msg.lower() or "plans & billing" in err_msg.lower():
                raise LLMServiceException("Anthropic Error: Credit balance is $0 / too low. Please add credits at console.anthropic.com or switch to LLM_PROVIDER=mock in backend/.env")
            raise LLMServiceException(f"Anthropic service error: {err_msg}")

    async def _stream_gemini(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str]
    ) -> AsyncGenerator[str, None]:
        key = settings.GEMINI_API_KEY
        if not key or key in ["your_gemini_api_key_here", "mock-dev-key"]:
            logger.info("Using simulated Gemini streaming response (no key configured)")
            async for token in self._simulated_response(messages):
                yield token
            return

        import json
        import urllib.request
        import threading

        model_name = self.model if "gemini" in self.model else "gemini-3.1-flash-lite"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:streamGenerateContent?alt=sse&key={key}"

        gemini_contents = []
        for m in messages:
            role = "user" if m.get("role") == "user" else "model"
            gemini_contents.append({"role": role, "parts": [{"text": m.get("content", "")}]})

        body_dict = {"contents": gemini_contents}
        if system_prompt:
            body_dict["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        post_data = json.dumps(body_dict).encode("utf-8")
        req = urllib.request.Request(url, data=post_data, headers={"Content-Type": "application/json"})

        queue: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_running_loop()

        def sync_worker():
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    for raw_line in resp:
                        line_str = raw_line.decode("utf-8")
                        if line_str.startswith("data: "):
                            data_chunk = line_str[6:].strip()
                            if data_chunk:
                                try:
                                    chunk_json = json.loads(data_chunk)
                                    cands = chunk_json.get("candidates", [])
                                    if cands and "content" in cands[0]:
                                        for p in cands[0]["content"].get("parts", []):
                                            if "text" in p and p["text"]:
                                                loop.call_soon_threadsafe(queue.put_nowait, ("token", p["text"]))
                                except Exception:
                                    pass
                loop.call_soon_threadsafe(queue.put_nowait, ("done", None))
            except Exception as exc:
                err_msg = str(exc)
                if hasattr(exc, "read"):
                    try:
                        err_msg += " " + exc.read().decode("utf-8")
                    except Exception:
                        pass
                loop.call_soon_threadsafe(queue.put_nowait, ("error", err_msg))

        thread = threading.Thread(target=sync_worker, daemon=True)
        thread.start()

        while True:
            item_type, val = await queue.get()
            if item_type == "token":
                yield val
            elif item_type == "done":
                break
            elif item_type == "error":
                logger.error(f"Gemini Streaming error: {val}")
                raise LLMServiceException(f"Gemini service error: {val}")

    async def _stream_groq(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str]
    ) -> AsyncGenerator[str, None]:
        client = self._get_groq_client()

        if client is None:
            logger.info("Using simulated Groq streaming response (no key configured)")
            async for token in self._simulated_response(messages):
                yield token
            return

        try:
            formatted_messages = []
            if system_prompt:
                formatted_messages.append({"role": "system", "content": system_prompt})
            formatted_messages.extend(messages)

            model_name = self.model if ("llama" in self.model or "mixtral" in self.model) else "llama-3.3-70b-versatile"
            stream = await client.chat.completions.create(
                model=model_name,
                messages=formatted_messages,
                temperature=settings.DEFAULT_TEMPERATURE,
                max_tokens=settings.DEFAULT_MAX_TOKENS,
                stream=True
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content

        except Exception as e:
            logger.error(f"Groq Streaming error: {str(e)}")
            raise LLMServiceException(f"Groq service error: {str(e)}")

    async def _simulated_response(self, messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """
        Simulated streaming generator for local testing without external API credentials.
        """
        last_user_message = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "Hello")

        reply_paragraphs = [
            f"Hello! I am your AI Chatbot assistant. I received your message: \"{last_user_message}\".\n\n",
            "This response is being streamed token-by-token over Server-Sent Events (SSE). ",
            "The backend maintains conversational context, validates user authorization via JWT, ",
            "and stores message history in MySQL with SQLAlchemy async ORM.\n\n",
            "You can configure a live model at any time in `backend/.env` (e.g., `openai`, `gemini`, `groq`, or `anthropic`)."
        ]

        for paragraph in reply_paragraphs:
            words = paragraph.split(" ")
            for i, word in enumerate(words):
                yield word + (" " if i < len(words) - 1 else "")
                await asyncio.sleep(0.04)

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """
        Quick heuristic token estimation: ~4 chars per token for English text.
        """
        if not text:
            return 0
        return max(1, len(text) // 4)


llm_service = LLMService()

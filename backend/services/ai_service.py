"""AI service - the only module that talks to the AI provider (Google Gemini).

Route handlers call `analyze_lead` and `chat_about_lead`; they never see
provider-specific types. Swapping the provider means re-implementing this file.
"""
import json
import logging
from datetime import datetime, timezone

from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import ValidationError

from config import get_settings
from models.analysis import AIAnalysisOutput, LeadAnalysis
from models.enums import Priority
from models.followup import FollowUp
from models.lead import ChatMessage, Lead
from services.prompts import ANALYSIS_SYSTEM_PROMPT, build_analysis_prompt, build_chat_system_prompt

logger = logging.getLogger("ai_service")

REQUIRED_FACTORS = 6
MAX_CHAT_HISTORY_MESSAGES = 30


class AIServiceError(Exception):
    """Raised when the AI provider fails or returns unusable output."""

    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    settings = get_settings()
    if not settings.ai_configured:
        raise AIServiceError(
            "Gemini API key is not configured. Add GEMINI_API_KEY to backend/.env and restart the backend.",
            status_code=503,
        )
    if _client is None:
        _client = genai.Client(
            api_key=settings.gemini_api_key.strip(),
            http_options=types.HttpOptions(timeout=settings.gemini_timeout_seconds * 1000),
        )
    return _client


def _translate_error(exc: Exception) -> AIServiceError:
    """Map provider exceptions to user-friendly messages (never leaks the key)."""
    if isinstance(exc, AIServiceError):
        return exc
    if isinstance(exc, genai_errors.APIError):
        code = getattr(exc, "code", None)
        logger.warning("Gemini API error: code=%s status=%s", code, getattr(exc, "status", None))
        if code in (401, 403) or (code == 400 and "API key" in str(exc)):
            return AIServiceError("Gemini rejected the API key. Check GEMINI_API_KEY in backend/.env.", 502)
        if code == 404:
            return AIServiceError(
                f"None of the configured Gemini models are available ({', '.join(get_settings().model_chain)}). "
                "Check GEMINI_MODEL in backend/.env.", 502
            )
        if code == 429:
            return AIServiceError("Gemini rate limit or quota exceeded. Please wait a moment and retry.", 429)
        if code and code >= 500:
            return AIServiceError("Gemini models are currently overloaded or unavailable. Please retry in a moment.", 503)
        return AIServiceError(f"Gemini request failed ({code}). Please retry.", 502)
    name = type(exc).__name__.lower()
    if "timeout" in name:
        return AIServiceError("The AI request timed out. Please retry.", 504)
    if "connect" in name or "network" in name:
        return AIServiceError("Could not reach the Gemini API. Check your internet connection and retry.", 503)
    logger.exception("Unexpected AI error")
    return AIServiceError("Unexpected error while contacting the AI service. Please retry.", 502)


# 404 = model unavailable to this key, 429 = per-model quota hit, 5xx = overloaded
FALLBACK_STATUS_CODES = {404, 429, 500, 503}


async def _generate(contents, config: types.GenerateContentConfig):
    """Call Gemini, falling back to the next configured model when a model is
    overloaded or unavailable. Returns (response, model_name)."""
    client = _get_client()
    chain = get_settings().model_chain
    last_exc: Exception | None = None
    for model in chain:
        try:
            response = await client.aio.models.generate_content(model=model, contents=contents, config=config)
            return response, model
        except genai_errors.APIError as exc:
            last_exc = exc
            if getattr(exc, "code", None) in FALLBACK_STATUS_CODES:
                logger.warning("Model %s unavailable (code=%s); trying next model", model, exc.code)
                continue
            raise _translate_error(exc) from exc
        except Exception as exc:  # noqa: BLE001 - timeouts / network: do not multiply the wait
            raise _translate_error(exc) from exc
    raise _translate_error(last_exc) from last_exc


def _priority_for_score(score: int) -> Priority:
    if score >= 70:
        return Priority.HOT
    if score >= 40:
        return Priority.WARM
    return Priority.COLD


def _validate_analysis(raw: AIAnalysisOutput) -> AIAnalysisOutput:
    """Business-rule validation on top of schema validation."""
    problems = []
    if not 0 <= raw.score <= 100:
        problems.append(f"score {raw.score} outside 0-100")
    if not raw.summary.strip():
        problems.append("empty summary")
    if not raw.suggested_response.strip():
        problems.append("empty suggested response")
    if not raw.next_action.action.strip():
        problems.append("empty next action")
    if len(raw.score_factors) < REQUIRED_FACTORS - 1:
        problems.append("missing score factors")
    if not raw.concerns and not raw.concerns_summary.strip():
        problems.append("concerns not addressed")
    if problems:
        raise ValueError("; ".join(problems))
    return raw


async def analyze_lead(lead: Lead) -> LeadAnalysis:
    config = types.GenerateContentConfig(
        system_instruction=ANALYSIS_SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_schema=AIAnalysisOutput,
        temperature=0.2,
    )
    prompt = build_analysis_prompt(lead)

    last_error = "unknown"
    for attempt in range(2):  # one retry for malformed output
        response, used_model = await _generate(prompt, config)

        text = (response.text or "").strip()
        if not text:
            last_error = "empty response"
            logger.warning("Empty AI response for lead %s (attempt %s)", lead.id, attempt + 1)
            continue
        try:
            parsed = AIAnalysisOutput.model_validate(json.loads(text))
            parsed = _validate_analysis(parsed)
        except (json.JSONDecodeError, ValidationError, ValueError) as exc:
            last_error = type(exc).__name__
            logger.warning("Invalid AI analysis for lead %s (attempt %s): %s", lead.id, attempt + 1, last_error)
            continue

        expected = _priority_for_score(parsed.score)
        return LeadAnalysis(
            **parsed.model_dump(),
            expected_priority=expected,
            priority_override=parsed.priority != expected,
            model=used_model,
            analyzed_at=datetime.now(timezone.utc),
        )

    raise AIServiceError(
        f"The AI returned an invalid analysis ({last_error}). Please retry.", status_code=502
    )


async def chat_about_lead(
    lead: Lead, followups: list[FollowUp], history: list[ChatMessage], message: str
) -> str:
    contents: list[types.Content] = []
    for msg in history[-MAX_CHAT_HISTORY_MESSAGES:]:
        role = "user" if msg.role == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=msg.content)]))
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

    config = types.GenerateContentConfig(
        system_instruction=build_chat_system_prompt(lead, followups),
        temperature=0.5,
    )
    response, _ = await _generate(contents, config)

    text = (response.text or "").strip()
    if not text:
        raise AIServiceError("The AI returned an empty reply. Please retry.", status_code=502)
    return text

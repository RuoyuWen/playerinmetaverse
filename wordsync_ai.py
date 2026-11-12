"""AI opponent for 心有灵犀: one chat-completions call per round, answered as JSON.

Everything here is configured from the researcher dashboard: API key, endpoint, model,
system prompt and the JSON schema of the reply. The reply must carry two string fields:
`think` (saved as the AI's text for the round) and `response` (the word it plays).
"""

import json
import time
from typing import Any, Dict, List, Optional

import httpx

# Suggestions only: the dashboard also accepts any model id typed by hand.
MODEL_SUGGESTIONS = [
    "gpt-5.6", "gpt-5.6-mini", "gpt-5.5", "gpt-5.5-mini", "gpt-5.4", "gpt-5.4-mini",
    "gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini",
]
DEFAULT_BASE_URL = "https://api.openai.com/v1"
DEFAULT_PROMPT = (
    "你在玩一个双人合作猜词游戏。每一轮你和搭档各写一个词，目标是两人写出同一个词。\n"
    "每一轮你会收到一段 JSON，说明当前情况：语言、起始词（可能没有）、"
    "之前每一轮你和搭档各写了什么、哪些词已经出现过。\n"
    "请决定你这一轮要写的词。回复必须是符合给定 JSON Schema 的 JSON："
    "think 写你选这个词的理由，response 只写这一个词，不要加标点或解释。"
)
DEFAULT_SCHEMA = {
    "type": "object",
    "properties": {
        "think": {"type": "string", "description": "选这个词的理由"},
        "response": {"type": "string", "description": "这一轮要写的词，只写一个词"},
    },
    "required": ["think", "response"],
    "additionalProperties": False,
}
DEFAULT_AI: Dict[str, Any] = {
    "enabled": False,
    "apiKey": "",
    "baseUrl": DEFAULT_BASE_URL,
    "model": MODEL_SUGGESTIONS[0],
    "prompt": DEFAULT_PROMPT,
    "schema": DEFAULT_SCHEMA,
    # Second, more accurate transcript of what players say (uses the same key and endpoint).
    "transcribe": False,
    "transcribeModel": "gpt-4o-transcribe",
    "transcribeLanguage": "room",  # "room" follows the room's language; "zh" / "en" force one
    # Passed to the transcription model whenever the transcript should be Chinese.
    "transcribePrompt": "以下是普通话的口语录音。请一律用简体中文转写，不要翻译成英文，不要使用繁体字。",
}
TRANSCRIBE_SUGGESTIONS = ["gpt-4o-transcribe", "gpt-4o-mini-transcribe", "whisper-1"]
MAX_AUDIO_BYTES = 20 * 1024 * 1024
TIMEOUT_SECONDS = 60
MAX_TEXT = 4000


class AIError(Exception):
    """A problem worth showing to the researcher (bad key, bad model, malformed reply)."""


def clean_ai(raw: Any, previous: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Validate AI settings. Anything left out keeps its stored value, so an empty apiKey
    keeps the stored key; clearApiKey removes it."""
    raw = raw if isinstance(raw, dict) else {}
    result = {**DEFAULT_AI, **(previous or {})}
    if raw.get("transcribeLanguage") in ("room", "zh", "en"):
        result["transcribeLanguage"] = raw["transcribeLanguage"]
    if isinstance(raw.get("transcribePrompt"), str):  # may be emptied on purpose
        result["transcribePrompt"] = raw["transcribePrompt"].strip()[:1000]
    for name in ("enabled", "transcribe"):
        if isinstance(raw.get(name), bool):
            result[name] = raw[name]
    key = raw.get("apiKey")
    if isinstance(key, str) and key.strip():
        result["apiKey"] = key.strip()[:400]
    if raw.get("clearApiKey") is True:
        result["apiKey"] = ""
    for name, limit in (("baseUrl", 300), ("model", 100), ("prompt", 20000), ("transcribeModel", 100)):
        value = raw.get(name)
        if isinstance(value, str) and value.strip():
            result[name] = value.strip()[:limit]
    if not result["baseUrl"].startswith("https://") and not result["baseUrl"].startswith("http://"):
        result["baseUrl"] = DEFAULT_BASE_URL
    schema = raw.get("schema")
    if isinstance(schema, str):
        try:
            schema = json.loads(schema)
        except ValueError:
            raise AIError("JSON Schema 不是合法的 JSON")
    if schema is not None:
        properties = schema.get("properties") if isinstance(schema, dict) else None
        if not isinstance(properties, dict) or "think" not in properties or "response" not in properties:
            raise AIError("JSON Schema 的 properties 里必须包含 think 和 response 两个字段")
        result["schema"] = schema
    return result


def public_ai(ai: Dict[str, Any]) -> Dict[str, Any]:
    """Settings as the dashboard may see them: the key itself never leaves the server."""
    shown = {name: value for name, value in ai.items() if name != "apiKey"}
    key = ai.get("apiKey", "")
    shown["apiKeySet"] = bool(key)
    shown["apiKeyHint"] = f"…{key[-4:]}" if len(key) >= 8 else ""
    return shown


def can_transcribe(ai: Dict[str, Any]) -> bool:
    return bool(ai.get("transcribe") and ai.get("apiKey"))


async def transcribe(ai: Dict[str, Any], audio: bytes, content_type: str, lang: str) -> str:
    """Turn one round's recording into text. The audio is only held in memory for this call."""
    extension = "mp4" if "mp4" in content_type else "ogg" if "ogg" in content_type else "webm"
    forced = ai.get("transcribeLanguage", "room")
    language = forced if forced in ("zh", "en") else ("en" if lang == "en" else "zh")
    fields = {"model": ai["transcribeModel"], "language": language, "response_format": "json"}
    if language == "zh" and ai.get("transcribePrompt"):
        fields["prompt"] = ai["transcribePrompt"]
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            reply = await client.post(
                ai["baseUrl"].rstrip("/") + "/audio/transcriptions",
                headers={"Authorization": f"Bearer {ai['apiKey']}"},
                data=fields,
                files={"file": (f"round.{extension}", audio, content_type.split(";")[0] or "audio/webm")})
    except httpx.HTTPError as error:
        raise AIError(f"连不上转写接口：{type(error).__name__}")
    if reply.status_code != 200:
        raise AIError(f"转写接口返回 {reply.status_code}：{reply.text[:300]}")
    try:
        return str(reply.json()["text"]).strip()[:MAX_TEXT * 2]
    except (ValueError, KeyError, TypeError):
        raise AIError("转写接口的返回格式不对")


def is_available(ai: Dict[str, Any]) -> bool:
    return bool(ai.get("enabled") and ai.get("apiKey") and ai.get("prompt"))


def round_context(lang: str, start_word: Optional[str], history: List[Dict[str, str]], used: List[str],
                  round_number: int, lives: int) -> Dict[str, Any]:
    """The facts the model gets each round. It never includes the partner's current word."""
    return {
        "language": "English" if lang == "en" else "中文",
        "round": round_number,
        "lives_left": lives,
        "start_word": start_word,
        "previous_rounds": history,
        "words_already_used": used,
    }


async def ask(ai: Dict[str, Any], context: Dict[str, Any], note: str = "") -> Dict[str, Any]:
    """One model call. Returns {"think", "response", "raw", "latencyMs"} or raises AIError."""
    if not ai.get("apiKey"):
        raise AIError("还没有填写 API key")
    messages = [
        {"role": "system", "content": ai["prompt"]},
        {"role": "user", "content": json.dumps(context, ensure_ascii=False)},
    ]
    if note:
        messages.append({"role": "user", "content": note})
    body = {
        "model": ai["model"],
        "messages": messages,
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "word_game_turn", "schema": ai["schema"]},
        },
    }
    started = time.time()
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            reply = await client.post(
                ai["baseUrl"].rstrip("/") + "/chat/completions",
                headers={"Authorization": f"Bearer {ai['apiKey']}", "Content-Type": "application/json"},
                json=body)
    except httpx.HTTPError as error:
        raise AIError(f"连不上模型接口：{type(error).__name__}")
    if reply.status_code != 200:
        raise AIError(f"模型接口返回 {reply.status_code}：{reply.text[:300]}")
    try:
        content = reply.json()["choices"][0]["message"]["content"] or ""
    except (ValueError, KeyError, IndexError, TypeError):
        raise AIError("模型接口的返回格式不对")
    try:
        parsed = json.loads(content)
    except ValueError:
        raise AIError(f"模型的回复不是 JSON：{content[:200]}")
    think, response = (parsed.get("think"), parsed.get("response")) if isinstance(parsed, dict) else (None, None)
    if not isinstance(response, str) or not response.strip():
        raise AIError(f"模型的回复里没有 response 字段：{content[:200]}")
    return {
        "think": think.strip()[:MAX_TEXT] if isinstance(think, str) else "",
        "response": response.strip(),
        "raw": content[:MAX_TEXT],
        "latencyMs": int((time.time() - started) * 1000),
    }

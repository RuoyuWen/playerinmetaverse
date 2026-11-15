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
    # Which service plays the AI opponent. Each keeps its own key, endpoint and model, so
    # switching back and forth loses nothing (and transcription always uses the OpenAI one).
    "provider": "openai",
    "deepseekKey": "",
    "deepseekBaseUrl": "https://api.deepseek.com",
    "deepseekModel": "deepseek-reasoner",
    # What is saved as the AI's think text when the reply also carries a separate chain of
    # thought (reasoning_content): "reasoning" = that full chain, "json" = the short `think`
    # the model writes in its JSON reply. The other one is kept with the round either way.
    "thinkSource": "reasoning",
    # Second, more accurate transcript of what players say (uses the same key and endpoint).
    "transcribe": False,
    "transcribeModel": "gpt-4o-transcribe",
    "transcribeLanguage": "room",  # "room" follows the room's language; "zh" / "en" force one
    # Passed to the transcription model whenever the transcript should be Chinese.
    "transcribePrompt": "以下是普通话的口语录音。请一律用简体中文转写，不要翻译成英文，不要使用繁体字。",
}
DEEPSEEK_SUGGESTIONS = ["deepseek-reasoner", "deepseek-chat"]
SECRET_FIELDS = ("apiKey", "deepseekKey")
MAX_THINK = 30000  # a reasoning model's own account of a turn can be long
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
    if raw.get("thinkSource") in ("reasoning", "json"):
        result["thinkSource"] = raw["thinkSource"]
    for name in ("enabled", "transcribe"):
        if isinstance(raw.get(name), bool):
            result[name] = raw[name]
    if raw.get("provider") in ("openai", "deepseek"):
        result["provider"] = raw["provider"]
    for field, clear in (("apiKey", "clearApiKey"), ("deepseekKey", "clearDeepseekKey")):
        key = raw.get(field)
        if isinstance(key, str) and key.strip():
            result[field] = key.strip()[:400]
        if raw.get(clear) is True:
            result[field] = ""
    for name, limit in (("baseUrl", 300), ("model", 100), ("prompt", 20000), ("transcribeModel", 100),
                        ("deepseekBaseUrl", 300), ("deepseekModel", 100)):
        value = raw.get(name)
        if isinstance(value, str) and value.strip():
            result[name] = value.strip()[:limit]
    for name in ("baseUrl", "deepseekBaseUrl"):
        if not result[name].startswith(("https://", "http://")):
            result[name] = DEFAULT_AI[name]
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
    """Settings as the dashboard may see them: the keys themselves never leave the server."""
    shown = {name: value for name, value in ai.items() if name not in SECRET_FIELDS}
    for field in SECRET_FIELDS:
        key = ai.get(field, "")
        shown[field + "Set"] = bool(key)
        shown[field + "Hint"] = f"…{key[-4:]}" if len(key) >= 8 else ""
    return shown


def active(ai: Dict[str, Any]) -> Dict[str, str]:
    """Key, endpoint and model of whichever service currently plays the AI opponent."""
    if ai.get("provider") == "deepseek":
        return {"provider": "deepseek", "key": ai.get("deepseekKey", ""),
                "baseUrl": ai["deepseekBaseUrl"], "model": ai["deepseekModel"]}
    return {"provider": "openai", "key": ai.get("apiKey", ""), "baseUrl": ai["baseUrl"], "model": ai["model"]}


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
    return bool(ai.get("enabled") and active(ai)["key"] and ai.get("prompt"))


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


def _parse_reply(content: str) -> Dict[str, Any]:
    """The reply as a JSON object, tolerating a code fence or stray text around it."""
    try:
        parsed = json.loads(content)
    except ValueError:
        start, end = content.find("{"), content.rfind("}")
        try:
            parsed = json.loads(content[start:end + 1]) if 0 <= start < end else None
        except ValueError:
            parsed = None
    return parsed if isinstance(parsed, dict) else {}


async def ask(ai: Dict[str, Any], context: Dict[str, Any], note: str = "") -> Dict[str, Any]:
    """One model call. Returns {"think", "response", "raw", "latencyMs", ...} or raises AIError.

    OpenAI-style services are given the JSON schema and return `think` inside the JSON.
    DeepSeek's reasoning model returns its reasoning in a separate `reasoning_content`
    field of the message; when that is present it is what gets saved as `think`.
    """
    service = active(ai)
    if not service["key"]:
        raise AIError("还没有填写 API key")
    system = ai["prompt"]
    if service["provider"] == "deepseek":
        # No schema-constrained output there, so the schema travels in the prompt instead.
        system += "\n\n回复必须是一个 JSON 对象，符合下面的 JSON Schema：\n" + json.dumps(ai["schema"], ensure_ascii=False)
        response_format: Any = {"type": "json_object"}
    else:
        response_format = {"type": "json_schema", "json_schema": {"name": "word_game_turn", "schema": ai["schema"]}}
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(context, ensure_ascii=False)},
    ]
    if note:
        messages.append({"role": "user", "content": note})
    body = {"model": service["model"], "messages": messages, "response_format": response_format}
    url = service["baseUrl"].rstrip("/") + "/chat/completions"
    headers = {"Authorization": f"Bearer {service['key']}", "Content-Type": "application/json"}
    started = time.time()
    try:
        async with httpx.AsyncClient(timeout=180 if service["provider"] == "deepseek" else TIMEOUT_SECONDS) as client:
            reply = await client.post(url, headers=headers, json=body)
            if (reply.status_code == 400 and service["provider"] == "deepseek" and "response_format" in reply.text):
                # Some reasoning models refuse JSON mode; ask again without it and parse leniently.
                del body["response_format"]
                reply = await client.post(url, headers=headers, json=body)
    except httpx.HTTPError as error:
        raise AIError(f"连不上模型接口：{type(error).__name__}")
    if reply.status_code != 200:
        raise AIError(f"模型接口返回 {reply.status_code}：{reply.text[:300]}")
    try:
        message = reply.json()["choices"][0]["message"]
        content = message.get("content") or ""
    except (ValueError, KeyError, IndexError, TypeError, AttributeError):
        raise AIError("模型接口的返回格式不对")
    parsed = _parse_reply(content)
    response = parsed.get("response")
    if not isinstance(response, str) or not response.strip():
        raise AIError(f"模型的回复里没有 response 字段：{content[:200]}")
    reasoning = message.get("reasoning_content")
    reasoning = reasoning.strip()[:MAX_THINK] if isinstance(reasoning, str) else ""
    brief = parsed.get("think")
    brief = brief.strip()[:MAX_THINK] if isinstance(brief, str) else ""
    if reasoning and (ai.get("thinkSource", "reasoning") == "reasoning" or not brief):
        think, source = reasoning, "reasoning_content"
    else:
        think, source = brief, "json"
    return {
        "think": think,
        "thinkSource": source,
        "reasoning": reasoning,  # the full chain of thought, when the service returned one
        "brief": brief,          # the short reason from the JSON reply
        "response": response.strip(),
        "raw": content[:MAX_TEXT],
        "provider": service["provider"],
        "model": service["model"],
        "latencyMs": int((time.time() - started) * 1000),
    }

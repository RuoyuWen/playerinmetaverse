"""心有灵犀 (word-sync): a two-player word convergence game.

Two players join the same room with a four-digit code. Each round they think aloud for a
fixed time, then each types one word; the game is won when both type the same word before
the shared lives run out. Only speech-to-text transcripts are stored, never audio.

Rooms live in memory (single uvicorn process). Finished rounds are persisted as JSON, in
PostgreSQL when WORDSYNC_DATABASE_URL is set and on local disk otherwise.
"""

import asyncio
import hmac
import json
import logging
import os
import random
import re
import secrets
import time
import unicodedata
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

import wordsync_ai

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/wordsync")

WORDS_FILES = {
    "zh": Path(__file__).with_name("wordsync_words.txt"),
    "en": Path(__file__).with_name("wordsync_words_en.txt"),
}
LANGUAGES = ("zh", "en")
DEFAULT_SETTINGS: Dict[str, Any] = {
    "lives": 20,            # 血量：两人共用，每次没对上扣一格
    "thinkSeconds": 30,     # 思考（think aloud）倒计时；玩家想好了可以提前提交
    "inputSeconds": 0,      # 输入限时，0 = 不限时
    "noRepeat": True,       # 不允许使用已经出现过的词
    "requireSpeech": True,  # 必须通过语音识别检测才能准备
    "allowEarlySubmit": False,  # 是否允许倒计时结束前就提交；默认必须等思考时间结束
    "customWords": [],      # 自定义中文起始词库，留空则用内置词库
    "customWordsEn": [],    # 自定义英文起始词库，留空则用内置词库
    "ai": wordsync_ai.DEFAULT_AI,  # AI 对手：接口、模型、提示词、回复的 JSON Schema（含 API key，绝不下发给玩家）
}
# The only settings players may see, and the only ones copied into a room.
GAME_KEYS = ("lives", "thinkSeconds", "inputSeconds", "noRepeat", "requireSpeech", "allowEarlySubmit")
AI_ATTEMPTS = 2
LIMITS = {"lives": (1, 99), "thinkSeconds": (5, 300), "inputSeconds": (0, 300)}
MAX_WORD_LENGTH = {"zh": 12, "en": 30}
MAX_NAME_LENGTH = 12
MAX_SEGMENTS = 200
MAX_SEGMENT_LENGTH = 500
OFFLINE_AFTER = 8          # seconds without polling before a player shows as offline
ABANDONED_AFTER = 90       # a non-member may reclaim the code after everyone is gone this long
ROOM_TTL = 2 * 3600

rooms: Dict[str, Dict[str, Any]] = {}
_settings: Optional[Dict[str, Any]] = None
_builtin_words: Dict[str, List[str]] = {}


# ---------------------------------------------------------------- storage

class FileStore:
    def __init__(self, root: Path):
        self.root = root

    def load_settings(self):
        path = self.root / "settings.json"
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None

    def save_settings(self, data):
        self.root.mkdir(parents=True, exist_ok=True)
        (self.root / "settings.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    def save_session(self, session):
        folder = self.root / "sessions"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / f"{session['id']}.json").write_text(json.dumps(session, ensure_ascii=False), encoding="utf-8")

    def load_session(self, session_id):
        path = self.root / "sessions" / f"{session_id}.json"
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None

    def list_sessions(self):
        folder = self.root / "sessions"
        if not folder.exists():
            return []
        sessions = [json.loads(p.read_text(encoding="utf-8")) for p in folder.glob("*.json")]
        return sorted(sessions, key=lambda s: s.get("startedAt", ""), reverse=True)

    def delete_session(self, session_id):
        path = self.root / "sessions" / f"{session_id}.json"
        if path.exists():
            path.unlink()

    def save_room(self, room):
        folder = self.root / "rooms"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / f"{room['code']}.json").write_text(json.dumps(room, ensure_ascii=False), encoding="utf-8")

    def load_room(self, code):
        path = self.root / "rooms" / f"{code}.json"
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None

    def delete_room(self, code):
        path = self.root / "rooms" / f"{code}.json"
        if path.exists():
            path.unlink()


class PostgresStore:
    def __init__(self, dsn: str):
        self.dsn = dsn
        self.ready = False

    def _connect(self):
        import psycopg
        connection = psycopg.connect(self.dsn, connect_timeout=8)
        if not self.ready:
            connection.execute("CREATE TABLE IF NOT EXISTS wordsync_settings (id int PRIMARY KEY, data jsonb NOT NULL)")
            connection.execute(
                "CREATE TABLE IF NOT EXISTS wordsync_sessions "
                "(id text PRIMARY KEY, started_at text NOT NULL, data jsonb NOT NULL)")
            connection.execute(
                "CREATE TABLE IF NOT EXISTS wordsync_rooms (code text PRIMARY KEY, rev bigint NOT NULL, data jsonb NOT NULL)")
            connection.commit()
            self.ready = True
        return connection

    def load_settings(self):
        with self._connect() as connection:
            row = connection.execute("SELECT data FROM wordsync_settings WHERE id = 1").fetchone()
            return row[0] if row else None

    def save_settings(self, data):
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO wordsync_settings (id, data) VALUES (1, %s::jsonb) "
                "ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data", (json.dumps(data),))

    def save_session(self, session):
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO wordsync_sessions (id, started_at, data) VALUES (%s, %s, %s::jsonb) "
                "ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
                (session["id"], session["startedAt"], json.dumps(session)))

    def load_session(self, session_id):
        with self._connect() as connection:
            row = connection.execute("SELECT data FROM wordsync_sessions WHERE id = %s", (session_id,)).fetchone()
            return row[0] if row else None

    def list_sessions(self):
        with self._connect() as connection:
            rows = connection.execute("SELECT data FROM wordsync_sessions ORDER BY started_at DESC").fetchall()
            return [row[0] for row in rows]

    def delete_session(self, session_id):
        with self._connect() as connection:
            connection.execute("DELETE FROM wordsync_sessions WHERE id = %s", (session_id,))

    def save_room(self, room):
        # Writes run on worker threads and may land out of order; never let an older snapshot win.
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO wordsync_rooms (code, rev, data) VALUES (%s, %s, %s::jsonb) "
                "ON CONFLICT (code) DO UPDATE SET rev = EXCLUDED.rev, data = EXCLUDED.data "
                "WHERE wordsync_rooms.rev < EXCLUDED.rev", (room["code"], room["rev"], json.dumps(room)))

    def load_room(self, code):
        with self._connect() as connection:
            row = connection.execute("SELECT data FROM wordsync_rooms WHERE code = %s", (code,)).fetchone()
            return row[0] if row else None

    def delete_room(self, code):
        with self._connect() as connection:
            connection.execute("DELETE FROM wordsync_rooms WHERE code = %s", (code,))


def store():
    dsn = os.getenv("WORDSYNC_DATABASE_URL", "")
    if dsn:
        return _postgres_store(dsn)
    return FileStore(Path(os.getenv("WORDSYNC_DATA_DIR", "wordsync_data")))


_pg_stores: Dict[str, PostgresStore] = {}


def _postgres_store(dsn):
    if dsn not in _pg_stores:
        _pg_stores[dsn] = PostgresStore(dsn)
    return _pg_stores[dsn]


def storage_kind():
    return "postgres" if os.getenv("WORDSYNC_DATABASE_URL") else "file"


# ---------------------------------------------------------------- settings and words

def clean_settings(raw: Any, previous: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Validate settings. `previous` supplies what an update leaves out, such as the stored API key."""
    raw = raw if isinstance(raw, dict) else {}
    result = {**DEFAULT_SETTINGS, **(previous or {})}
    for key, (low, high) in LIMITS.items():
        try:
            result[key] = max(low, min(high, int(raw.get(key, result[key]))))
        except (TypeError, ValueError):
            pass
    for key in ("noRepeat", "requireSpeech", "allowEarlySubmit"):
        if isinstance(raw.get(key), bool):
            result[key] = raw[key]
    for key in ("customWords", "customWordsEn"):
        if key not in raw:
            continue
        words, custom = [], raw.get(key)
        if isinstance(custom, list):
            for item in custom[:5000]:
                word = display_word(item) if isinstance(item, str) else ""
                if word and len(word) <= 30 and word not in words:
                    words.append(word)
        result[key] = words
    previous_ai = (previous or {}).get("ai")
    result["ai"] = wordsync_ai.clean_ai(raw["ai"], previous_ai) if "ai" in raw else (previous_ai or dict(wordsync_ai.DEFAULT_AI))
    return result


async def get_settings() -> Dict[str, Any]:
    global _settings
    if _settings is None:
        try:
            _settings = clean_settings(await asyncio.to_thread(store().load_settings))
        except Exception as error:  # keep the game playable when storage is down
            logger.error("wordsync: could not load settings: %s", error)
            return clean_settings(None)
    return _settings


def builtin_words(lang: str = "zh") -> List[str]:
    if lang not in _builtin_words:
        lines = WORDS_FILES[lang].read_text(encoding="utf-8").splitlines()
        _builtin_words[lang] = [line.strip() for line in lines if line.strip() and not line.startswith("#")]
    return _builtin_words[lang]


def display_word(word: str) -> str:
    """What players see: trimmed, with runs of whitespace collapsed (English may be two words)."""
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", word or "")).strip()


def normalize_word(word: str) -> str:
    """What is compared: case and spacing do not matter."""
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", word or "")).lower()


# ---------------------------------------------------------------- game logic

def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def new_player(name):
    return {"token": secrets.token_urlsafe(16), "name": name, "ready": False, "lastSeen": time.time()}


def begin_round(room, prompt):
    room["round"] += 1
    room["phase"] = "think"
    room["prompt"] = prompt
    room["roundStartedAt"] = time.time()
    room["phaseEndsAt"] = room["roundStartedAt"] + room["settings"]["thinkSeconds"]
    room["current"] = {"words": [None, None], "submittedMs": [None, None], "transcripts": [[], []]}
    schedule_ai(room)


def start_game(room, settings):
    lang = room.get("lang", "zh")
    words = settings["customWordsEn" if lang == "en" else "customWords"] or builtin_words(lang)
    room.update({
        "sessionId": uuid.uuid4().hex, "startedAt": now_iso(), "endedAt": None, "result": None,
        "startedTs": time.time(), "durationMs": None, "quitBy": None, "unfinished": None,
        "playerNames": [player["name"] for player in room["players"]],
        "settings": {key: settings[key] for key in GAME_KEYS},
        "aiModel": settings["ai"]["model"] if room.get("ai") else None, "aiError": None,
        "lives": settings["lives"], "round": 0, "rounds": [],
        # Without a start word, both players simply think of any word in round one.
        "startWord": random.choice(words) if room.get("giveWord", True) else None,
    })
    room["used"] = {normalize_word(room["startWord"])} if room["startWord"] else set()
    begin_round(room, [room["startWord"]] if room["startWord"] else [])


def resolve_round(room):
    current = room["current"]
    words = [word or "" for word in current["words"]]
    matched = bool(words[0]) and normalize_word(words[0]) == normalize_word(words[1])
    if not matched:
        room["lives"] -= 1
    room["rounds"].append({
        "round": room["round"], "prompt": room["prompt"], "words": words, "matched": matched,
        "submittedMs": current["submittedMs"], "transcripts": current["transcripts"],
        "livesAfter": room["lives"],
        "durationMs": int((time.time() - room["roundStartedAt"]) * 1000),
        "transcriptsHq": current.get("transcriptsHq", [None, None]),
    })
    if current.get("aiRaw"):
        room["rounds"][-1]["aiRaw"] = current["aiRaw"]
    if current.get("aiRandomWord"):
        room["rounds"][-1]["aiRandomWord"] = True
    room["used"].update(normalize_word(word) for word in words if word)
    if matched or room["lives"] <= 0:
        room["phase"] = "won" if matched else "lost"
        room["result"] = room["phase"]
        room["endedAt"] = now_iso()
        room["durationMs"] = int((time.time() - room["startedTs"]) * 1000)
        room["phaseEndsAt"] = None
    else:
        begin_round(room, words)
    persist(room)


def advance(room):
    """Apply every timer that has run out. Called on each request that touches the room."""
    now = time.time()
    if room["phase"] == "think" and now >= room["phaseEndsAt"]:
        limit = room["settings"]["inputSeconds"]
        room["phase"] = "input"
        room["phaseEndsAt"] = room["phaseEndsAt"] + limit if limit else None
    if room["phase"] == "input" and room["phaseEndsAt"] and now >= room["phaseEndsAt"]:
        resolve_round(room)


def unfinished_round(room):
    return {"round": room["round"], "prompt": room["prompt"], "transcripts": room["current"]["transcripts"],
            "transcriptsHq": room["current"].get("transcriptsHq", [None, None])}


def attach_hq(document, round_number, index, entry) -> bool:
    """Put a high-accuracy transcript on the right round of a room or a saved session.
    Works on both because they share the rounds / unfinished-round layout."""
    current = document.get("current")
    if current is not None and document.get("phase") in ("think", "input") and document.get("round") == round_number:
        target = current
    else:
        target = next((r for r in document.get("rounds", []) if r["round"] == round_number), None)
        if target is None:
            unfinished = document.get("unfinished") or document.get("unfinishedRound")
            target = unfinished if unfinished and unfinished.get("round") == round_number else None
    if target is None:
        return False
    target.setdefault("transcriptsHq", [None, None])[index] = entry
    return True


async def transcribe_round(room, session_id, round_number, index, audio, content_type):
    """Transcribe one player's recording of one round and file the text. The audio is never stored."""
    ai = (await get_settings())["ai"]
    entry = {"model": ai["transcribeModel"], "text": "", "error": None}
    try:
        entry["text"] = await wordsync_ai.transcribe(ai, audio, content_type, room.get("lang", "zh"))
    except wordsync_ai.AIError as error:
        entry["error"] = str(error)
        logger.error("wordsync: transcription failed for %s round %s: %s", session_id, round_number, error)
    except Exception as error:
        logger.exception("wordsync: transcription crashed")
        entry["error"] = f"内部错误：{type(error).__name__}"
    del audio
    if rooms.get(room["code"]) is room and room.get("sessionId") == session_id:
        if attach_hq(room, round_number, index, entry):
            persist(room)
        return

    def patch_saved():  # the room has moved on or closed: update the saved record instead
        document = store().load_session(session_id)
        if document and attach_hq(document, round_number, index, entry):
            store().save_session(document)

    try:
        await asyncio.to_thread(patch_saved)
    except Exception as error:
        logger.error("wordsync: could not file transcript for %s: %s", session_id, error)


def quit_game(room, index):
    """One player leaving ends the game for both, straight away."""
    room["unfinished"] = unfinished_round(room)
    room["phase"] = room["result"] = "quit"
    room["quitBy"] = room["players"][index]["name"]
    room["endedAt"] = now_iso()
    room["durationMs"] = int((time.time() - room["startedTs"]) * 1000)
    room["phaseEndsAt"] = None


def schedule_ai(room):
    """Start the AI's turn for the current round, unless it has already answered."""
    if room.get("ai") and room["phase"] in ("think", "input") and room["current"]["words"][1] is None:
        task = asyncio.get_running_loop().create_task(ai_turn(room, room["sessionId"], room["round"]))
        _pending.add(task)
        task.add_done_callback(_pending.discard)


async def ai_turn(room, session_id, round_number):
    """Ask the model for this round's word. It is asked at the start of the round, so it
    cannot see what the human is about to write.

    In a game without a start word the model is not asked in round one: with nothing to go
    on it would open with the same word every game. Its first word is drawn at random
    instead, and the model plays from round two, when there are two words to work from."""
    word = answer = None
    drawn = False
    try:
        settings = await get_settings()
        lang = room.get("lang", "zh")
        history = [{"round": r["round"], "your_word": r["words"][1], "partner_word": r["words"][0]} for r in room["rounds"]]
        context = wordsync_ai.round_context(
            lang, room["startWord"], history, sorted(room["used"]), round_number, room["lives"])
        note = failure = ""
        if not room["startWord"] and not history:
            word = random.choice(settings["customWordsEn" if lang == "en" else "customWords"] or builtin_words(lang))
            drawn = True
        for _ in range(0 if drawn else AI_ATTEMPTS):
            try:
                answer = await wordsync_ai.ask(settings["ai"], context, note)
            except wordsync_ai.AIError as error:
                failure = str(error)
                continue
            candidate = display_word(answer["response"])
            if lang == "zh":
                candidate = candidate.replace(" ", "")
            if len(candidate) > MAX_WORD_LENGTH[lang]:
                failure = f"模型给的词太长：{candidate[:40]}"
                note = "Your last reply was too long. Reply with one short word only."
            elif room["settings"]["noRepeat"] and normalize_word(candidate) in room["used"]:
                failure = f"模型重复了已经出现过的词：{candidate}"
                note = f'The word "{candidate}" has already been used. Choose a different word.'
            else:
                word = candidate
                break
    except Exception as error:  # never let a background task die silently
        logger.exception("wordsync: AI turn crashed")
        failure = f"内部错误：{type(error).__name__}"
    # The game may have moved on (quit, restarted, timed out) while the model was thinking.
    if (rooms.get(room["code"]) is not room or room.get("sessionId") != session_id
            or room.get("round") != round_number or room["phase"] not in ("think", "input")):
        return
    if word is None:
        quit_game(room, 1)
        room["result"] = "ai_error"
        room["aiError"] = failure or "模型没有给出可用的回复"
        logger.error("wordsync: AI turn failed in room %s: %s", room["code"], room["aiError"])
        persist(room)
        return
    current = room["current"]
    elapsed = int((time.time() - room["roundStartedAt"]) * 1000)
    current["words"][1] = word
    current["submittedMs"][1] = elapsed
    if drawn:
        current["aiRandomWord"] = True  # no model call, so no think text for this round
    else:
        current["transcripts"][1] = [{"t": elapsed, "text": answer["think"]}] if answer["think"] else []
        current["aiRaw"] = answer["raw"]
    if current["words"][0] is not None:
        resolve_round(room)
    else:
        persist(room)


def session_document(room):
    document = {
        "id": room["sessionId"], "code": room["code"], "lang": room.get("lang", "zh"), "giveWord": room.get("giveWord", True),
        "startedAt": room["startedAt"],
        "endedAt": room["endedAt"], "result": room["result"], "settings": room["settings"],
        "players": room.get("playerNames") or [player["name"] for player in room["players"]],
        "startWord": room["startWord"], "quitBy": room.get("quitBy"),
        "livesLeft": room["lives"], "rounds": room["rounds"],
        # 研究者面板用的汇总：猜测次数 = 已完成的轮数，用时 = 开局到结束（毫秒）
        "guesses": len(room["rounds"]), "durationMs": room["durationMs"],
        "opponent": "ai" if room.get("ai") else "human", "aiModel": room.get("aiModel"), "aiError": room.get("aiError"),
    }
    if room["phase"] in ("think", "input"):  # keep think-aloud text of an unfinished round too
        document["unfinishedRound"] = unfinished_round(room)
    elif room.get("unfinished"):
        document["unfinishedRound"] = room["unfinished"]
    return json.loads(json.dumps(document))  # snapshot: the room keeps changing while we write


def background(work, *args):
    """Run a blocking storage call off the event loop; a storage outage must not stop the game."""
    async def run():
        try:
            await asyncio.to_thread(work, *args)
        except Exception as error:
            logger.error("wordsync: storage write failed (%s): %s", getattr(work, "__name__", work), error)

    task = asyncio.get_running_loop().create_task(run())
    _pending.add(task)
    task.add_done_callback(_pending.discard)


def persist(room):
    """Save the room itself (so a server restart does not end the game) and its session record."""
    room["rev"] = int(time.time() * 1000)
    snapshot = json.loads(json.dumps({**room, "used": sorted(room.get("used", ()))}))
    background(store().save_room, snapshot)
    if room.get("sessionId"):
        background(store().save_session, session_document(room))


async def load_room(code: str):
    """The room from memory, or restored from storage after a server restart."""
    if code in rooms:
        return rooms[code]
    try:
        saved = await asyncio.to_thread(store().load_room, code)
    except Exception as error:
        logger.error("wordsync: could not load room %s: %s", code, error)
        return None
    if code in rooms:  # another request restored it while we were reading
        return rooms[code]
    now = time.time()
    if not saved or now - saved.get("touched", 0) > ROOM_TTL:
        return None
    saved["used"] = set(saved.get("used", ()))
    saved["touched"] = now
    for player in saved["players"]:
        player["lastSeen"] = now  # give everyone a moment to reconnect before showing them offline
    rooms[code] = saved
    logger.info("wordsync: restored room %s from storage", code)
    schedule_ai(saved)
    return saved


_pending: set = set()


def sweep_rooms():
    now = time.time()
    for code in [code for code, room in rooms.items() if now - room["touched"] > ROOM_TTL]:
        del rooms[code]


async def find_room(code: str, token: str):
    room = await load_room(code)
    if not room:
        raise HTTPException(status_code=404, detail="room_not_found")
    for index, player in enumerate(room["players"]):
        if hmac.compare_digest(player["token"], token) and not player.get("left"):
            now = time.time()
            player["lastSeen"] = room["touched"] = now
            advance(room)
            return room, index
    raise HTTPException(status_code=403, detail="not_in_room")


def view(room, index):
    now = time.time()
    me = room["players"][index]
    other_index = 1 - index
    partner = room["players"][other_index] if len(room["players"]) > 1 else None
    playing = room["phase"] in ("think", "input")
    state = {
        "code": room["code"], "lang": room.get("lang", "zh"), "giveWord": room.get("giveWord", True),
        "ai": bool(room.get("ai")), "phase": room["phase"], "serverNow": now,
        "me": {"name": me["name"], "ready": me["ready"]},
        "partner": partner and {
            "name": partner["name"], "ready": partner["ready"],
            "online": bool(partner.get("ai")) or now - partner["lastSeen"] < OFFLINE_AFTER,
            "left": bool(partner.get("left")),
        },
    }
    if room.get("sessionId"):
        state.update({
            "sessionId": room["sessionId"], "round": room["round"], "lives": room["lives"],
            "maxLives": room["settings"]["lives"], "settings": room["settings"],
            "startWord": room["startWord"], "phaseEndsAt": room["phaseEndsAt"],
            "roundStartedAt": room["roundStartedAt"], "quitBy": room.get("quitBy"),
            "aiFailed": bool(room.get("aiError")),
            "history": [
                {"round": r["round"], "mine": r["words"][index], "theirs": r["words"][other_index],
                 "matched": r["matched"]} for r in room["rounds"]],
        })
        if playing:
            words = room["current"]["words"]
            state["me"]["submitted"] = words[index] is not None
            state["me"]["word"] = words[index]
            if partner:
                state["partner"]["submitted"] = words[other_index] is not None
            if room["round"] > 1:  # previous words, from this player's point of view
                state["prompt"] = {"mine": room["prompt"][index], "theirs": room["prompt"][other_index]}
    return state


# ---------------------------------------------------------------- player API

class JoinRequest(BaseModel):
    code: str
    name: str = ""
    token: Optional[str] = None
    lang: str = "zh"  # used only when this request creates the room
    giveWord: bool = True  # likewise: False means round one has no start word


class PlayerRequest(BaseModel):
    code: str
    token: str


class ReadyRequest(PlayerRequest):
    ready: bool = True


class Segment(BaseModel):
    t: int = 0
    text: str


class TranscriptRequest(PlayerRequest):
    round: int
    segments: List[Segment] = []


class SubmitRequest(TranscriptRequest):
    word: str


def store_transcript(room, index, request: TranscriptRequest):
    """Clients resend their full segment list for the round; keep the longest version."""
    if room["phase"] not in ("think", "input") or request.round != room["round"]:
        return
    segments = [
        {"t": max(0, segment.t), "text": segment.text.strip()[:MAX_SEGMENT_LENGTH]}
        for segment in request.segments[:MAX_SEGMENTS] if segment.text.strip()]
    if len(segments) >= len(room["current"]["transcripts"][index]):
        room["current"]["transcripts"][index] = segments


@router.get("/health")
async def health():
    return {"ok": True, "storage": storage_kind(), "rooms": len(rooms)}


@router.get("/config")
async def public_config():
    settings = await get_settings()
    return {**{key: settings[key] for key in GAME_KEYS}, "aiAvailable": wordsync_ai.is_available(settings["ai"]),
            "recordAudio": wordsync_ai.can_transcribe(settings["ai"])}


class SoloRequest(BaseModel):
    name: str = ""
    lang: str = "zh"
    giveWord: bool = True


@router.post("/solo")
async def solo(request: SoloRequest):
    """Create a room whose second player is the AI."""
    settings = await get_settings()
    if not wordsync_ai.is_available(settings["ai"]):
        raise HTTPException(status_code=503, detail="ai_unavailable")
    sweep_rooms()
    lang = request.lang if request.lang in LANGUAGES else "zh"
    human = new_player(request.name.strip()[:MAX_NAME_LENGTH] or ("Player" if lang == "en" else "玩家"))
    bot = new_player("AI")
    bot.update({"ai": True, "ready": True})
    code = "ai-" + secrets.token_hex(6)  # not a four-digit code, so nobody else can join it
    room = rooms[code] = {"code": code, "phase": "lobby", "players": [human, bot], "touched": time.time(),
                          "sessionId": None, "lang": lang, "giveWord": request.giveWord, "ai": True}
    persist(room)
    return {"token": human["token"], "code": code, "state": view(room, 0)}


@router.post("/join")
async def join(request: JoinRequest):
    code = request.code.strip()
    digits = bool(re.fullmatch(r"\d{4}", code))
    if not digits and not (request.token and re.fullmatch(r"ai-[0-9a-f]{12}", code)):
        raise HTTPException(status_code=400, detail="bad_code")
    name = request.name.strip()[:MAX_NAME_LENGTH]
    sweep_rooms()
    now = time.time()
    room = await load_room(code)
    if room and request.token:
        for index, player in enumerate(room["players"]):
            if hmac.compare_digest(player["token"], request.token) and not player.get("left"):
                if name:
                    player["name"] = name
                player["lastSeen"] = room["touched"] = now
                advance(room)
                return {"token": player["token"], "state": view(room, index)}
    if not digits:
        raise HTTPException(status_code=404, detail="room_not_found")
    if room and all(now - player["lastSeen"] > ABANDONED_AFTER for player in room["players"]):
        room = None  # everyone left long ago: the code is free again
    if room is None:
        room = rooms[code] = {"code": code, "phase": "lobby", "players": [], "touched": now, "sessionId": None,
                              "lang": request.lang if request.lang in LANGUAGES else "zh",
                              "giveWord": request.giveWord}
    if room["phase"] != "lobby" or len(room["players"]) >= 2:
        raise HTTPException(status_code=409, detail="room_full")
    taken = {player["name"] for player in room["players"]}
    name = name or (f"Player {len(room['players']) + 1}" if room.get("lang") == "en" else f"玩家{len(room['players']) + 1}")
    if name in taken:
        name = f"{name[:MAX_NAME_LENGTH - 1]}2"
    player = new_player(name)
    room["players"].append(player)
    room["touched"] = now
    persist(room)
    return {"token": player["token"], "state": view(room, len(room["players"]) - 1)}


@router.get("/state")
async def state(code: str, token: str):
    room, index = await find_room(code, token)
    return view(room, index)


@router.post("/ready")
async def ready(request: ReadyRequest):
    room, index = await find_room(request.code, request.token)
    if room["phase"] == "lobby":
        room["players"][index]["ready"] = request.ready
        if len(room["players"]) == 2 and all(player["ready"] for player in room["players"]):
            start_game(room, await get_settings())
        persist(room)
    return view(room, index)


@router.post("/transcript")
async def transcript(request: TranscriptRequest):
    room, index = await find_room(request.code, request.token)
    store_transcript(room, index, request)
    return {"ok": True}


@router.post("/audio")
async def audio(request: Request, code: str, token: str, round: int):
    """Receive one player's recording of one round, for the high-accuracy transcript.
    Replies as soon as the audio is in memory; transcription carries on in the background."""
    room, index = await find_room(code, token)
    settings = await get_settings()
    if not wordsync_ai.can_transcribe(settings["ai"]):
        raise HTTPException(status_code=409, detail="transcription_off")
    if not room.get("sessionId") or not 1 <= round <= room.get("round", 0):
        raise HTTPException(status_code=409, detail="round_over")
    declared = request.headers.get("content-length", "")
    if declared.isdigit() and int(declared) > wordsync_ai.MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="audio_too_large")
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > wordsync_ai.MAX_AUDIO_BYTES:
            raise HTTPException(status_code=413, detail="audio_too_large")
    if len(data) < 200:  # an empty recording: nothing to transcribe
        return {"ok": True, "skipped": True}
    task = asyncio.get_running_loop().create_task(transcribe_round(
        room, room["sessionId"], round, index, bytes(data), request.headers.get("content-type", "audio/webm")))
    _pending.add(task)
    task.add_done_callback(_pending.discard)
    return {"ok": True}


@router.post("/submit")
async def submit(request: SubmitRequest):
    room, index = await find_room(request.code, request.token)
    if request.round != room.get("round") or room["phase"] not in ("think", "input"):
        raise HTTPException(status_code=409, detail="round_over")
    if room["phase"] == "think" and not room["settings"].get("allowEarlySubmit"):
        raise HTTPException(status_code=409, detail="too_early")
    current = room["current"]
    if current["words"][index] is not None:
        raise HTTPException(status_code=409, detail="already_submitted")
    word = display_word(request.word)
    if room.get("lang", "zh") == "zh":
        word = word.replace(" ", "")
    if not word:
        raise HTTPException(status_code=400, detail="empty_word")
    if len(word) > MAX_WORD_LENGTH[room.get("lang", "zh")]:
        raise HTTPException(status_code=400, detail="word_too_long")
    if room["settings"]["noRepeat"] and normalize_word(word) in room["used"]:
        raise HTTPException(status_code=400, detail="word_used")
    store_transcript(room, index, request)
    current["words"][index] = word
    current["submittedMs"][index] = int((time.time() - room["roundStartedAt"]) * 1000)
    if all(item is not None for item in current["words"]):
        resolve_round(room)
    else:
        persist(room)
    return view(room, index)


@router.post("/restart")
async def restart(request: PlayerRequest):
    room, index = await find_room(request.code, request.token)
    if room["phase"] in ("won", "lost", "quit"):
        me = room["players"][index]
        room["phase"] = "lobby"
        room["sessionId"] = None
        room["players"] = [player for player in room["players"] if not player.get("left")]
        for player in room["players"]:
            player["ready"] = bool(player.get("ai"))
        index = room["players"].index(me)
        persist(room)
    return view(room, index)


@router.post("/leave")
async def leave(request: PlayerRequest):
    room, index = await find_room(request.code, request.token)
    if room["phase"] == "lobby":
        del room["players"][index]
        for player in room["players"]:
            player["ready"] = bool(player.get("ai"))
        if all(player.get("ai") for player in room["players"]):
            rooms.pop(room["code"], None)
            background(store().delete_room, room["code"])
        else:
            persist(room)
    else:
        if room["phase"] in ("think", "input"):
            quit_game(room, index)
        # Keep the seat until the next game so round history still lines up for the other player.
        room["players"][index]["left"] = True
        room["players"][index]["lastSeen"] = 0
        if all(player.get("left") or player.get("ai") for player in room["players"]):
            rooms.pop(room["code"], None)
            background(store().save_session, session_document(room))
            background(store().delete_room, room["code"])
        else:
            persist(room)
    return {"ok": True}


# ---------------------------------------------------------------- admin API

def require_admin(password: Optional[str]):
    expected = os.getenv("WORDSYNC_ADMIN_PASSWORD", "")
    if not expected and os.getenv("ENVIRONMENT", "development") != "production":
        expected = "admin"
    if not expected:
        raise HTTPException(status_code=503, detail="服务器还没有设置 WORDSYNC_ADMIN_PASSWORD 环境变量")
    if not password or not hmac.compare_digest(password.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(status_code=401, detail="密码不正确")


def admin_settings_view(settings):
    return {**settings, "ai": wordsync_ai.public_ai(settings["ai"])}


@router.get("/admin/settings")
async def admin_get_settings(x_admin_password: Optional[str] = Header(None)):
    require_admin(x_admin_password)
    return {"settings": admin_settings_view(await get_settings()), "limits": LIMITS,
            "builtinWordCount": len(builtin_words("zh")), "builtinWordCountEn": len(builtin_words("en")),
            "storage": storage_kind(), "modelSuggestions": wordsync_ai.MODEL_SUGGESTIONS,
            "transcribeSuggestions": wordsync_ai.TRANSCRIBE_SUGGESTIONS,
            "aiDefaults": {"prompt": wordsync_ai.DEFAULT_PROMPT, "schema": wordsync_ai.DEFAULT_SCHEMA,
                           "baseUrl": wordsync_ai.DEFAULT_BASE_URL}}


@router.put("/admin/settings")
async def admin_put_settings(payload: Dict[str, Any], x_admin_password: Optional[str] = Header(None)):
    global _settings
    require_admin(x_admin_password)
    try:
        cleaned = clean_settings(payload, await get_settings())
    except wordsync_ai.AIError as error:
        raise HTTPException(status_code=400, detail=str(error))
    try:
        await asyncio.to_thread(store().save_settings, cleaned)
    except Exception as error:
        logger.error("wordsync: could not save settings: %s", error)
        raise HTTPException(status_code=500, detail="设置保存失败，请稍后重试")
    _settings = cleaned
    return {"settings": admin_settings_view(cleaned)}


@router.post("/admin/ai-test")
async def admin_ai_test(x_admin_password: Optional[str] = Header(None)):
    """Make one real call with the saved AI settings, so the key, model and prompt can be checked."""
    require_admin(x_admin_password)
    ai = (await get_settings())["ai"]
    context = wordsync_ai.round_context("zh", "苹果", [], ["苹果"], 1, 20)
    try:
        answer = await wordsync_ai.ask(ai, context)
    except wordsync_ai.AIError as error:
        return {"ok": False, "error": str(error), "sent": context}
    return {"ok": True, "sent": context, **answer}


@router.get("/admin/sessions")
async def admin_sessions(x_admin_password: Optional[str] = Header(None)):
    require_admin(x_admin_password)
    try:
        sessions = await asyncio.to_thread(store().list_sessions)
    except Exception as error:
        logger.error("wordsync: could not list sessions: %s", error)
        raise HTTPException(status_code=500, detail="读取对局记录失败")
    return {"sessions": sessions, "storage": storage_kind()}


@router.delete("/admin/sessions/{session_id}")
async def admin_delete_session(session_id: str, x_admin_password: Optional[str] = Header(None)):
    require_admin(x_admin_password)
    if not re.fullmatch(r"[0-9a-f]{32}", session_id):
        raise HTTPException(status_code=400, detail="无效的对局编号")
    await asyncio.to_thread(store().delete_session, session_id)
    return {"ok": True}

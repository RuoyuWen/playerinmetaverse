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

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/wordsync")

WORDS_FILE = Path(__file__).with_name("wordsync_words.txt")
DEFAULT_SETTINGS: Dict[str, Any] = {
    "lives": 20,            # 血量：两人共用，每次没对上扣一格
    "thinkSeconds": 30,     # 思考（think aloud）倒计时；玩家想好了可以提前提交
    "inputSeconds": 0,      # 输入限时，0 = 不限时
    "noRepeat": True,       # 不允许使用已经出现过的词
    "requireSpeech": True,  # 必须通过语音识别检测才能准备
    "customWords": [],      # 自定义起始词库，留空则用内置词库
}
LIMITS = {"lives": (1, 99), "thinkSeconds": (5, 300), "inputSeconds": (0, 300)}
MAX_WORD_LENGTH = 12
MAX_NAME_LENGTH = 12
MAX_SEGMENTS = 200
MAX_SEGMENT_LENGTH = 500
OFFLINE_AFTER = 8          # seconds without polling before a player shows as offline
ABANDONED_AFTER = 90       # a non-member may reclaim the code after everyone is gone this long
ROOM_TTL = 2 * 3600

rooms: Dict[str, Dict[str, Any]] = {}
_settings: Optional[Dict[str, Any]] = None
_builtin_words: Optional[List[str]] = None


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

    def list_sessions(self):
        with self._connect() as connection:
            rows = connection.execute("SELECT data FROM wordsync_sessions ORDER BY started_at DESC").fetchall()
            return [row[0] for row in rows]

    def delete_session(self, session_id):
        with self._connect() as connection:
            connection.execute("DELETE FROM wordsync_sessions WHERE id = %s", (session_id,))


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

def clean_settings(raw: Any) -> Dict[str, Any]:
    raw = raw if isinstance(raw, dict) else {}
    result = dict(DEFAULT_SETTINGS)
    for key, (low, high) in LIMITS.items():
        try:
            result[key] = max(low, min(high, int(raw.get(key, result[key]))))
        except (TypeError, ValueError):
            pass
    for key in ("noRepeat", "requireSpeech"):
        if isinstance(raw.get(key), bool):
            result[key] = raw[key]
    words, custom = [], raw.get("customWords")
    if isinstance(custom, list):
        for item in custom[:5000]:
            word = normalize_word(item) if isinstance(item, str) else ""
            if word and len(word) <= MAX_WORD_LENGTH and word not in words:
                words.append(word)
    result["customWords"] = words
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


def builtin_words() -> List[str]:
    global _builtin_words
    if _builtin_words is None:
        lines = WORDS_FILE.read_text(encoding="utf-8").splitlines()
        _builtin_words = [line.strip() for line in lines if line.strip() and not line.startswith("#")]
    return _builtin_words


def normalize_word(word: str) -> str:
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


def start_game(room, settings):
    words = settings["customWords"] or builtin_words()
    room.update({
        "sessionId": uuid.uuid4().hex, "startedAt": now_iso(), "endedAt": None, "result": None,
        "startedTs": time.time(), "durationMs": None,
        "settings": {k: v for k, v in settings.items() if k != "customWords"},
        "lives": settings["lives"], "round": 0, "rounds": [], "startWord": random.choice(words),
    })
    room["used"] = {normalize_word(room["startWord"])}
    begin_round(room, [room["startWord"]])


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
    })
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


def session_document(room):
    document = {
        "id": room["sessionId"], "code": room["code"], "startedAt": room["startedAt"],
        "endedAt": room["endedAt"], "result": room["result"], "settings": room["settings"],
        "players": [player["name"] for player in room["players"]], "startWord": room["startWord"],
        "livesLeft": room["lives"], "rounds": room["rounds"],
        # 研究者面板用的汇总：猜测次数 = 已完成的轮数，用时 = 开局到结束（毫秒）
        "guesses": len(room["rounds"]), "durationMs": room["durationMs"],
    }
    if room["phase"] in ("think", "input"):  # keep think-aloud text of an unfinished round too
        document["unfinishedRound"] = {
            "round": room["round"], "prompt": room["prompt"], "transcripts": room["current"]["transcripts"]}
    return json.loads(json.dumps(document))  # snapshot: the room keeps changing while we write


def persist(room):
    if not room.get("sessionId"):
        return
    document = session_document(room)

    async def write():
        try:
            await asyncio.to_thread(store().save_session, document)
        except Exception as error:
            logger.error("wordsync: could not save session %s: %s", document["id"], error)

    task = asyncio.get_running_loop().create_task(write())
    _pending.add(task)
    task.add_done_callback(_pending.discard)


_pending: set = set()


def sweep_rooms():
    now = time.time()
    for code in [code for code, room in rooms.items() if now - room["touched"] > ROOM_TTL]:
        del rooms[code]


def find_room(code: str, token: str):
    room = rooms.get(code)
    if not room:
        raise HTTPException(status_code=404, detail="房间不存在或已过期，请重新输入房间号")
    for index, player in enumerate(room["players"]):
        if hmac.compare_digest(player["token"], token):
            now = time.time()
            player["lastSeen"] = room["touched"] = now
            advance(room)
            return room, index
    raise HTTPException(status_code=403, detail="你不在这个房间里，请重新加入")


def view(room, index):
    now = time.time()
    me = room["players"][index]
    other_index = 1 - index
    partner = room["players"][other_index] if len(room["players"]) > 1 else None
    playing = room["phase"] in ("think", "input")
    state = {
        "code": room["code"], "phase": room["phase"], "serverNow": now,
        "me": {"name": me["name"], "ready": me["ready"]},
        "partner": partner and {
            "name": partner["name"], "ready": partner["ready"],
            "online": now - partner["lastSeen"] < OFFLINE_AFTER,
        },
    }
    if room.get("sessionId"):
        state.update({
            "sessionId": room["sessionId"], "round": room["round"], "lives": room["lives"],
            "maxLives": room["settings"]["lives"], "settings": room["settings"],
            "startWord": room["startWord"], "phaseEndsAt": room["phaseEndsAt"],
            "roundStartedAt": room["roundStartedAt"],
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
    return {key: value for key, value in settings.items() if key != "customWords"}


@router.post("/join")
async def join(request: JoinRequest):
    code = request.code.strip()
    if not re.fullmatch(r"\d{4}", code):
        raise HTTPException(status_code=400, detail="房间号必须是 4 位数字")
    name = request.name.strip()[:MAX_NAME_LENGTH]
    sweep_rooms()
    now = time.time()
    room = rooms.get(code)
    if room and request.token:
        for index, player in enumerate(room["players"]):
            if hmac.compare_digest(player["token"], request.token):
                if name:
                    player["name"] = name
                player["lastSeen"] = room["touched"] = now
                advance(room)
                return {"token": player["token"], "state": view(room, index)}
    if room and all(now - player["lastSeen"] > ABANDONED_AFTER for player in room["players"]):
        room = None  # everyone left long ago: the code is free again
    if room is None:
        room = rooms[code] = {"code": code, "phase": "lobby", "players": [], "touched": now, "sessionId": None}
    if room["phase"] != "lobby" or len(room["players"]) >= 2:
        raise HTTPException(status_code=409, detail="这个房间已经有两位玩家了，换一个房间号试试")
    taken = {player["name"] for player in room["players"]}
    name = name or f"玩家{len(room['players']) + 1}"
    if name in taken:
        name = f"{name[:MAX_NAME_LENGTH - 1]}2"
    player = new_player(name)
    room["players"].append(player)
    room["touched"] = now
    return {"token": player["token"], "state": view(room, len(room["players"]) - 1)}


@router.get("/state")
async def state(code: str, token: str):
    room, index = find_room(code, token)
    return view(room, index)


@router.post("/ready")
async def ready(request: ReadyRequest):
    room, index = find_room(request.code, request.token)
    if room["phase"] == "lobby":
        room["players"][index]["ready"] = request.ready
        if len(room["players"]) == 2 and all(player["ready"] for player in room["players"]):
            start_game(room, await get_settings())
            persist(room)
    return view(room, index)


@router.post("/transcript")
async def transcript(request: TranscriptRequest):
    room, index = find_room(request.code, request.token)
    store_transcript(room, index, request)
    return {"ok": True}


@router.post("/submit")
async def submit(request: SubmitRequest):
    room, index = find_room(request.code, request.token)
    if request.round != room.get("round") or room["phase"] not in ("think", "input"):
        raise HTTPException(status_code=409, detail="这一轮已经结束了")
    current = room["current"]
    if current["words"][index] is not None:
        raise HTTPException(status_code=409, detail="你已经提交过这一轮的词了")
    word = re.sub(r"\s+", "", unicodedata.normalize("NFKC", request.word))
    if not word:
        raise HTTPException(status_code=400, detail="请输入一个词")
    if len(word) > MAX_WORD_LENGTH:
        raise HTTPException(status_code=400, detail=f"词太长了，最多 {MAX_WORD_LENGTH} 个字")
    if room["settings"]["noRepeat"] and normalize_word(word) in room["used"]:
        raise HTTPException(status_code=400, detail="这个词已经出现过了，换一个吧")
    store_transcript(room, index, request)
    current["words"][index] = word
    current["submittedMs"][index] = int((time.time() - room["roundStartedAt"]) * 1000)
    if all(item is not None for item in current["words"]):
        resolve_round(room)
    return view(room, index)


@router.post("/restart")
async def restart(request: PlayerRequest):
    room, index = find_room(request.code, request.token)
    if room["phase"] in ("won", "lost"):
        room["phase"] = "lobby"
        room["sessionId"] = None
        for player in room["players"]:
            player["ready"] = False
    return view(room, index)


@router.post("/leave")
async def leave(request: PlayerRequest):
    room, index = find_room(request.code, request.token)
    if room["phase"] == "lobby":
        del room["players"][index]
        for player in room["players"]:
            player["ready"] = False
        if not room["players"]:
            rooms.pop(room["code"], None)
    else:
        room["players"][index]["lastSeen"] = 0  # show as offline right away
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


@router.get("/admin/settings")
async def admin_get_settings(x_admin_password: Optional[str] = Header(None)):
    require_admin(x_admin_password)
    return {"settings": await get_settings(), "defaults": DEFAULT_SETTINGS, "limits": LIMITS,
            "builtinWordCount": len(builtin_words()), "storage": storage_kind()}


@router.put("/admin/settings")
async def admin_put_settings(payload: Dict[str, Any], x_admin_password: Optional[str] = Header(None)):
    global _settings
    require_admin(x_admin_password)
    cleaned = clean_settings(payload)
    try:
        await asyncio.to_thread(store().save_settings, cleaned)
    except Exception as error:
        logger.error("wordsync: could not save settings: %s", error)
        raise HTTPException(status_code=500, detail="设置保存失败，请稍后重试")
    _settings = cleaned
    return {"settings": cleaned}


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

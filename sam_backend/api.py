"""Same SAM HTTP contract, backed by PostgreSQL transactions rather than a remote proxy."""

import asyncio
import csv
import hmac
import io
import json
import logging
import os
import re
from datetime import datetime, timezone
from weakref import WeakKeyDictionary

import psycopg
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from psycopg.rows import dict_row
from psycopg.conninfo import conninfo_to_dict
from psycopg_pool import AsyncConnectionPool, PoolTimeout

from .config import (BASE_PARTICIPANTS, CODING, COHORT_PROTOCOL, EXPLANATION_VERSION, PARTICIPANTS, PROFILES,
                     RATERS, REPLACEMENT_SOURCES, SCORES, SKETCH_PROTOCOL, STAGE2_PROFILES, STAGE2_PROTOCOL,
                     config, digest, schedule_source, sequence, validate_access, validate_catalog)

logger = logging.getLogger(__name__)
HEADERS = {"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-SAM-Ingress-Revision": "20261110-postgres-v1"}
TABLES = {"sketch": "sketch_ratings", "cohort": "cohort_ratings", "stage2": "sketch_stage2_ratings"}
_connection_gates = WeakKeyDictionary()
_pools = WeakKeyDictionary()


async def connection_pool(dsn):
    # Check syntax before background pool workers can log a malformed connection string.
    conninfo_to_dict(dsn)
    loop = asyncio.get_running_loop()
    tasks = _pools.setdefault(loop, {})
    if dsn not in tasks:
        async def create():
            pool = AsyncConnectionPool(dsn, min_size=0, max_size=8, max_idle=60, timeout=8,
                                       kwargs={"connect_timeout": 8, "prepare_threshold": None, "row_factory": dict_row}, open=False)
            await pool.open()
            return pool
        tasks[dsn] = asyncio.create_task(create())
    return await tasks[dsn]


async def close_connections():
    tasks = _pools.pop(asyncio.get_running_loop(), {})
    for task in tasks.values():
        if not task.cancelled():
            try:
                await (await task).close()
            except Exception:
                pass


async def target_is_ready():
    dsn = os.environ.get("SAM_DATABASE_URL", "")
    if not dsn:
        raise ValueError("SAM database configuration missing")
    pool = await connection_pool(dsn)
    async with pool.connection() as connection:
        row = await (await connection.execute("SELECT document FROM sam_settings WHERE key='migration'")).fetchone()
        return bool(row and row["document"].get("ready") is True)


def reply(data, status=200):
    return JSONResponse(data, status_code=status, headers=HEADERS)


def failure(message, status=400):
    return reply({"error": message}, status)


def query(request, name, default=None):
    values = request.query_params.getlist(name)
    return values[0] if values else default


def now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def csv_response(data, fields, mode, layout):
    stream = io.StringIO(newline="")
    stream.write("\ufeff")
    writer = csv.writer(stream, quoting=csv.QUOTE_ALL, lineterminator="\r\n")
    writer.writerow(fields)
    for row in data:
        writer.writerow([row.get(field) if row.get(field) is not None else "" for field in fields])
    return Response(stream.getvalue(), headers={**HEADERS, "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": f'attachment; filename="sketch_sam_{mode}_{layout}.csv"'})


def complete(rows):
    return set(PROFILES).issubset({row["profile"] for row in rows})


class Study:
    def __init__(self, connection, catalog, access, expert_2d_explanations=None):
        self.db, self.catalog, self.access = connection, catalog, access
        self.expert_2d_explanations = expert_2d_explanations

    def schedule(self, participant):
        return self.catalog["schedules"][schedule_source(participant)]

    async def all(self, statement, params=()):
        return await (await self.db.execute(statement, params)).fetchall()

    async def one(self, statement, params=()):
        return await (await self.db.execute(statement, params)).fetchone()

    async def rows(self, family, mode, identity=None):
        table = TABLES[family]
        key = "participant" if family == "cohort" else "rater"
        if identity:
            rows = await self.all(f"SELECT * FROM {table} WHERE mode=%s AND {key}=%s ORDER BY trial_index", (mode, identity))
        else:
            rows = await self.all(f"SELECT * FROM {table} WHERE mode=%s ORDER BY {key},trial_index", (mode,))
        if family == "stage2":
            for row in rows:
                row["baseline"] = json.loads(row.pop("baseline_json"))
        return rows

    async def lock(self, identity):
        # Transaction-scoped locks work across processes and PgBouncer pooled connections.
        await self.db.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s,0))", (identity,))

    async def role(self, request, family):
        match = re.fullmatch(r"Bearer ([A-Za-z0-9_-]{32})", request.headers.get("authorization", ""))
        if not match:
            return None, None
        token_hash = digest(match[1])
        roles = PARTICIPANTS + ["ADMIN"] if family == "cohort" else RATERS + ["ADMIN"]
        for role in roles:
            expected = self.access[family].get(role)
            if expected and hmac.compare_digest(expected, token_hash):
                return role, token_hash
        if family == "cohort":
            claim = await self.one("SELECT participant FROM cohort_claims WHERE token_hash=%s", (token_hash,))
            if claim and claim["participant"] in PARTICIPANTS:
                return claim["participant"], token_hash
        return None, token_hash

    def body(self, request, raw, limit=8192):
        if not request.headers.get("content-type", "").startswith("application/json"):
            return None, failure("JSON required")
        if len(raw) > limit:
            return None, failure("Request too large", 413)
        try:
            body = json.loads(raw)
        except (ValueError, UnicodeError):
            return None, failure("Invalid JSON")
        if not isinstance(body, dict):
            return None, failure("Invalid request")
        return body, None

    async def join(self, request, raw):
        body, error = self.body(request, raw, 1024)
        if error is not None:
            return error
        token = body.get("token")
        if not isinstance(token, str) or not re.fullmatch(r"[A-Za-z0-9_-]{32}", token):
            return failure("无效恢复码。")
        token_hash = digest(token)
        await self.lock("sam:cohort:claim")
        existing = await self.one("SELECT participant FROM cohort_claims WHERE token_hash=%s", (token_hash,))
        if existing:
            return reply({"ok": True, "role": existing["participant"]})
        candidate = await self.one("""SELECT candidate.participant FROM unnest(%s::text[]) AS candidate(participant)
            WHERE NOT EXISTS (SELECT 1 FROM cohort_claims c WHERE c.participant=candidate.participant)
            AND NOT EXISTS (SELECT 1 FROM cohort_ratings r WHERE r.mode='production' AND r.participant=candidate.participant)
            ORDER BY candidate.participant LIMIT 1""", (BASE_PARTICIPANTS,))
        if not candidate:
            # Extra slots reuse a schedule that nobody (original or earlier extra slot) has completed yet.
            # The schedule with the least best progress goes first; completed schedules are skipped.
            candidate = await self.one("""WITH holders AS (
                    SELECT h.source, coalesce(max(r.n), 0) AS best
                    FROM unnest(%s::text[], %s::text[]) AS h(participant, source)
                    LEFT JOIN (SELECT participant, count(*) AS n FROM cohort_ratings
                               WHERE mode='production' GROUP BY participant) r ON r.participant=h.participant
                    GROUP BY h.source)
                SELECT slot.participant FROM unnest(%s::text[], %s::text[]) AS slot(participant, source)
                JOIN holders ON holders.source=slot.source
                WHERE holders.best < 12
                AND NOT EXISTS (SELECT 1 FROM cohort_claims c WHERE c.participant=slot.participant)
                AND NOT EXISTS (SELECT 1 FROM cohort_ratings r WHERE r.mode='production' AND r.participant=slot.participant)
                ORDER BY holders.best, slot.participant LIMIT 1""",
                (PARTICIPANTS, [schedule_source(p) for p in PARTICIPANTS],
                 list(REPLACEMENT_SOURCES), list(REPLACEMENT_SOURCES.values())))
        if not candidate:
            return reply({"error": "本次研究的名额已领完。已领取者请使用原浏览器或自己的恢复码继续，不要重新报名。", "full": True}, 409)
        saved = await self.one("""INSERT INTO cohort_claims (participant,token_hash,claimed_at_utc)
            VALUES (%s,%s,%s) ON CONFLICT DO NOTHING RETURNING participant""", (candidate["participant"], token_hash, now()))
        if not saved:
            return failure("名额分配未确认，请使用原恢复码重试。", 503)
        return reply({"ok": True, "role": saved["participant"]})

    async def handle(self, request, raw):
        path = request.url.path
        if path == "/api/sam/health":
            from .expert import PROTOCOL_2D as expert_protocol
            return reply({"ok": True, "service": "Sketch SAM", "protocol": SKETCH_PROTOCOL,
                          "cohort_protocol": COHORT_PROTOCOL, "stage2_protocol": STAGE2_PROTOCOL,
                          "audio_version": "none", "storage": "postgresql", "revision": "20261111-expert-2d-v1",
                          "expert_protocol": expert_protocol, "expert_condition": "2D", "expert_stage2_total": 11})
        family = "cohort" if path.startswith("/api/cohort/") else "sketch"
        endpoint = path.removeprefix("/api/cohort" if family == "cohort" else "/api")
        if family == "cohort" and endpoint == "/join" and request.method == "POST":
            return await self.join(request, raw)
        role, token_hash = await self.role(request, family)
        if not role:
            return failure("请使用本实验的专属邀请链接。", 401)
        if endpoint == "/auth":
            result = {"ok": True, "role": role}
            if family == "cohort":
                claim = await self.one("SELECT participant FROM cohort_claims WHERE token_hash=%s", (token_hash,))
                result["access"] = "claim" if claim else "invitation"
            return reply(result)
        if family == "sketch" and query(request, "instrument") is not None:
            from .expert import ExpertStudy, Expert2DStudy, INSTRUMENT, INSTRUMENT_2D
            if query(request, "instrument") not in (INSTRUMENT, INSTRUMENT_2D):
                return failure("问卷版本不匹配，请刷新。")
            expert_class = Expert2DStudy if query(request, "instrument") == INSTRUMENT_2D else ExpertStudy
            return await expert_class(self).handle(request, raw, role)
        mode = query(request, "mode", "production")
        if mode not in ("production", "test"):
            return failure("Invalid mode")
        stage = query(request, "stage", "1") if family == "sketch" else "1"
        if stage not in ("1", "2"):
            return failure("Invalid stage")
        phase2 = stage == "2"
        active = "stage2" if phase2 else family
        cfg = config(family, 2 if phase2 else 1)
        identities = PARTICIPANTS if family == "cohort" else RATERS
        if request.method == "POST" and endpoint == "/submit":
            return await self.submit(request, raw, family, phase2, role)
        if request.method != "GET":
            return failure("Not found", 404)
        if endpoint == "/status":
            visible = identities if role == "ADMIN" else [role]
            data = await self.rows(active, mode, None if role == "ADMIN" else role)
            key = "participant" if family == "cohort" else "rater"
            result = {**cfg, "raters": visible, "role": role,
                      "counts": {r: sum(row[key] == r for row in data) for r in visible}}
            if phase2:
                original = await self.rows("sketch", mode, None if role == "ADMIN" else role)
                result["first_stage_counts"] = {r: sum(row["rater"] == r for row in original) for r in visible}
                result["eligible"] = {r: complete([row for row in original if row["rater"] == r]) for r in visible}
            return reply(result)
        if endpoint == "/session":
            identity = query(request, "rater")
            if identity not in identities or (role != "ADMIN" and role != identity) or (role == "ADMIN" and mode != "test"):
                return failure("只能进入自己的任务；研究者请使用测试模式。", 403)
            data = await self.rows(active, mode, identity)
            if family == "cohort":
                trials = self.schedule(identity)
                return reply({**cfg, "sequence": [t["profile"] for t in trials], "trials": trials,
                              "completed": [row["profile"] for row in data]})
            order = sequence(identity)
            result = {**cfg, "sequence": order, "completed": [row["profile"] for row in data]}
            if phase2:
                original = await self.rows("sketch", mode, identity)
                if not complete(original):
                    return failure("请先完成第一阶段的全部 24 张评价，再进入第二阶段。", 403)
                order = [p for p in order if p in STAGE2_PROFILES]
                result.update(sequence=order, contexts={p: {"explanation": self.catalog["explanations"][p],
                              "baseline": next(row for row in original if row["profile"] == p)} for p in order})
            return reply(result)
        if endpoint in ("/results", "/export.csv", "/assignments.csv"):
            if role != "ADMIN":
                return failure("仅研究者可查看或下载评分结果。", 403)
            if family == "cohort" and endpoint == "/assignments.csv":
                data = [{"participant": p, "trial_index": i + 1, **trial, "protocol": COHORT_PROTOCOL}
                        for p in PARTICIPANTS for i, trial in enumerate(self.schedule(p))]
                for row in data:
                    row["schedule_source"] = schedule_source(row["participant"])
                return csv_response(data, ["participant", "trial_index", "profile", "condition", "protocol", "schedule_source"], "assignment", "cohort")
            if endpoint == "/assignments.csv":
                return failure("Not found", 404)
            data = await self.rows(active, mode)
            if endpoint == "/results":
                if family == "cohort":
                    claims = await self.all("SELECT participant,claimed_at_utc FROM cohort_claims ORDER BY participant")
                    return reply({**cfg, "participants": identities, "rows": data, "claims": claims,
                                  "base_participants": BASE_PARTICIPANTS, "replacements": REPLACEMENT_SOURCES})
                return reply({**cfg, "raters": RATERS, "rows": data})
            return self.export(data, family, phase2, mode, query(request, "layout", "long"))
        return failure("Not found", 404)

    async def submit(self, request, raw, family, phase2, role):
        body, error = self.body(request, raw)
        if error is not None:
            return error
        identity, profile, mode = (body.get(k) for k in ("rater", "profile", "mode"))
        identities = PARTICIPANTS if family == "cohort" else RATERS
        profiles = STAGE2_PROFILES if phase2 else PROFILES
        if identity not in identities or profile not in profiles or mode not in ("production", "test"):
            return failure("Invalid rater, profile or mode")
        if (role != "ADMIN" and role != identity) or (role == "ADMIN" and mode != "test"):
            return failure("不能为其他评价者提交；研究者只能提交测试数据。", 403)
        expected = STAGE2_PROTOCOL if phase2 else COHORT_PROTOCOL if family == "cohort" else SKETCH_PROTOCOL
        if body.get("protocol") != expected or body.get("audio_version") != "none" or type(body.get("audio_ms")) is not int or body["audio_ms"] != 0:
            return failure("问卷版本已更新，请刷新后重试。")
        if phase2 and body.get("explanation_version") != EXPLANATION_VERSION:
            return failure("第二阶段版本已更新，请刷新。")
        if any(type(body.get(k)) is not int or not 1 <= body[k] <= (7 if k == "confidence" else 9) for k in SCORES):
            return failure("请完整填写三项 SAM（1–9）和信心评分（1–7）。")
        if type(body.get("view_ms")) is not int or not 0 <= body["view_ms"] <= 604800000:
            return failure("Invalid viewing duration")
        active = "stage2" if phase2 else family
        if family == "cohort":
            trials = self.schedule(identity)
            order = [t["profile"] for t in trials]
            trial = next((t for t in trials if t["profile"] == profile), None)
            if not trial or trial["condition"] != body.get("condition"):
                return failure("任务版本或条件不匹配，请刷新。")
        else:
            order = sequence(identity)
            if phase2:
                order = [p for p in order if p in STAGE2_PROFILES]
        await self.lock(f"sam:{active}:{mode}:{identity}")
        baseline = None
        if phase2:
            original = await self.rows("sketch", mode, identity)
            if not complete(original):
                return failure("请先完成第一阶段的全部 24 张评价。", 403)
            baseline = next(row for row in original if row["profile"] == profile)
        existing = await self.rows(active, mode, identity)
        previous = next((row for row in existing if row["profile"] == profile), None)
        same = lambda row: all(row[k] == body[k] for k in SCORES) and (family != "cohort" or row["condition"] == body["condition"])
        if previous:
            return reply({"ok": True, "already_saved": True}) if same(previous) else failure("该评分已保存，不会覆盖。请返回首页继续。", 409)
        done = {row["profile"] for row in existing}
        if profile != next((p for p in order if p not in done), None):
            return failure("进度已更新，请返回首页继续。", 409)
        row = {"mode": mode, "participant" if family == "cohort" else "rater": identity,
               "profile": profile, "trial_index": order.index(profile) + 1, **{k: body[k] for k in SCORES},
               "view_ms": body["view_ms"], "submitted_at_utc": now(), "protocol": expected}
        if phase2:
            text = self.catalog["explanations"][profile]
            row.update(sketch_sha256=self.catalog["sketch_hashes"][profile], explanation_version=EXPLANATION_VERSION,
                       explanation_text=text, explanation_sha256=digest(text),
                       baseline_json=json.dumps(baseline, ensure_ascii=False, separators=(",", ":")))
        else:
            row.update(audio_version="none", audio_ms=0, audio_sha256="")
            if family == "cohort":
                row.update(condition=trial["condition"], image_sha256=self.catalog["media_hashes"][profile][trial["condition"]])
            else:
                row["sketch_sha256"] = self.catalog["sketch_hashes"][profile]
        fields = list(row)
        # Table/field names are server constants; only values come from requests.
        statement = f"INSERT INTO {TABLES[active]} ({','.join(fields)}) VALUES ({','.join(['%s'] * len(fields))}) ON CONFLICT DO NOTHING"
        await self.db.execute(statement, tuple(row.values()))
        saved = next((item for item in await self.rows(active, mode, identity) if item["profile"] == profile), None)
        return reply({"ok": True}) if saved and same(saved) else failure("未确认保存，请重试。", 503)

    def export(self, data, family, phase2, mode, layout):
        if family == "cohort":
            fields = ["mode", "participant", "trial_index", "profile", "condition", *SCORES, "view_ms", "audio_ms",
                      "audio_version", "submitted_at_utc", "protocol", "image_sha256", "audio_sha256", "dominance_coding",
                      "schedule_source"]
            return csv_response([{**r, "dominance_coding": CODING, "schedule_source": schedule_source(r["participant"])}
                                 for r in data], fields, mode, "cohort")
        if layout not in ("long", "wide"):
            return failure("Invalid layout")
        if phase2:
            baseline_fields = [*SCORES, "view_ms", "submitted_at_utc", "protocol", "sketch_sha256", "audio_version", "audio_ms", "audio_sha256"]
            fields = ["mode", "rater", "profile", "trial_index", *SCORES, "view_ms", "submitted_at_utc", "protocol",
                      "sketch_sha256", "explanation_version", "explanation_text", "explanation_sha256"]
            expanded = []
            for item in data:
                row = {k: v for k, v in item.items() if k != "baseline"}
                row.update({"baseline_" + k: item["baseline"].get(k, "") for k in baseline_fields})
                expanded.append({**row, "dominance_coding": CODING})
            if layout == "long":
                return csv_response(expanded, [*fields, *("baseline_" + k for k in baseline_fields), "dominance_coding"], mode, "stage2_long")
            comparison = [*SCORES, *("baseline_" + k for k in baseline_fields), "protocol", "submitted_at_utc", "explanation_version", "explanation_text", "explanation_sha256", "sketch_sha256", "view_ms"]
            wide = []
            for profile in STAGE2_PROFILES:
                row = {"profile": profile, "mode": mode, "dominance_coding": CODING}
                for rater in RATERS:
                    item = next((r for r in expanded if r["rater"] == rater and r["profile"] == profile), {})
                    row.update({f"{rater}_{k}": item.get(k, "") for k in comparison})
                wide.append(row)
            return csv_response(wide, ["profile", "mode", "dominance_coding", *(f"{r}_{k}" for r in RATERS for k in comparison)], mode, "stage2_wide")
        if layout == "long":
            fields = ["mode", "rater", "profile", "trial_index", *SCORES, "view_ms", "submitted_at_utc", "protocol",
                      "sketch_sha256", "audio_version", "audio_ms", "audio_sha256", "dominance_coding"]
            return csv_response([{**row, "dominance_coding": CODING} for row in data], fields, mode, "long")
        fields = [*SCORES, "protocol", "audio_version", "audio_ms"]
        wide = []
        for profile in PROFILES:
            matches = [r for r in data if r["profile"] == profile]
            protocols = set(r["protocol"] for r in matches)
            row = {"profile": profile, "mode": mode, "completed_raters": len(matches), "dominance_coding": CODING,
                   "protocol": "mixed" if len(protocols) > 1 else next(iter(protocols), SKETCH_PROTOCOL)}
            for rater in RATERS:
                item = next((r for r in matches if r["rater"] == rater), {})
                row.update({f"{rater}_{k}": item.get(k, "") for k in fields})
            wide.append(row)
        return csv_response(wide, ["profile", "mode", "completed_raters", "protocol", "dominance_coding", *(f"{r}_{k}" for r in RATERS for k in fields)], mode, "wide")


async def _database_request(request: Request, raw: bytes):
    dsn = os.environ.get("SAM_DATABASE_URL", "")
    if not dsn:
        return failure("研究数据服务尚未配置完成，请稍后重试。", 503)
    for attempt in range(2):
        try:
            pool = await connection_pool(dsn)
            async with pool.connection() as connection:
                await connection.execute("SET LOCAL statement_timeout = '10s'")
                await connection.execute("SET LOCAL lock_timeout = '5s'")
                documents = {row["key"]: row["document"] for row in await (await connection.execute("SELECT key,document FROM sam_settings")).fetchall()}
                if documents.get("migration", {}).get("ready") is not True:
                    return failure("研究数据迁移尚未完成，请稍后重试。", 503)
                catalog, access = documents["catalog"], documents["access_hashes"]
                validate_catalog(catalog)
                validate_access(access)
                result = await Study(connection, catalog, access, documents.get("expert_2d_explanations")).handle(request, raw)
            # Connection context commits successfully before the response is returned.
            return result
        except (psycopg.OperationalError, psycopg.errors.SerializationFailure, psycopg.errors.DeadlockDetected, PoolTimeout) as error:
            logger.warning("SAM database operation unavailable (%s)", type(error).__name__)
            if attempt == 0:
                await asyncio.sleep(0.25)
                continue
        except Exception as error:
            # Never emit connection strings, SQL parameters, invitation keys or participant scores.
            logger.error("SAM database operation failed (%s)", type(error).__name__)
        break
    return failure("服务器暂时不可用，未确认保存。请稍后重试。", 503)


async def handle_request(request: Request, raw: bytes):
    # Bound connection bursts on the small compute plan, independently per worker/event loop.
    loop = asyncio.get_running_loop()
    gate = _connection_gates.setdefault(loop, asyncio.BoundedSemaphore(8))
    try:
        await asyncio.wait_for(gate.acquire(), timeout=8)
    except TimeoutError:
        return failure("服务器正在处理其他请求，当前选择已保留，请稍后重试。", 503)
    try:
        return await _database_request(request, raw)
    finally:
        gate.release()

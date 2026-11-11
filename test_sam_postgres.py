"""Integration tests against an isolated, disposable LOCAL PostgreSQL schema."""

import asyncio
import copy
import json
import os
import sys
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

import httpx
import psycopg
from fastapi import FastAPI
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from sam_backend.config import (BASE_PARTICIPANTS, COHORT_PROTOCOL, EXPLANATION_VERSION, PARTICIPANTS, PROFILES,
                                REPLACEMENT_SOURCES,
                                RATERS, SHUFFLE_SEED, SKETCH_PROTOCOL, STAGE2_PROFILES,
                                STAGE2_PROTOCOL, digest, sequence, validate_catalog)
from sam_backend.migration import checksum, import_bundle, normalized
from sam_backend.api import close_connections
from sam_proxy import router

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

KEYS = {role: role.ljust(32, "a") for role in RATERS + ["ADMIN"]}


def catalog_fixture():
    schedules = {}
    for i, participant in enumerate(BASE_PARTICIPANTS):
        schedules[participant] = [{"profile": PROFILES[(2 * (i % 12) + j) % 24],
                                  "condition": "2D" if (j + i % 12 + i // 12) % 2 == 0 else "Sketch"} for j in range(12)]
    return {"shuffle_seed": SHUFFLE_SEED, "sketch_protocol": SKETCH_PROTOCOL, "cohort_protocol": COHORT_PROTOCOL,
            "stage2_protocol": STAGE2_PROTOCOL, "explanation_version": EXPLANATION_VERSION, "schedules": schedules,
            "sketch_hashes": {p: digest("sketch-" + p) for p in PROFILES},
            "media_hashes": {p: {c: digest(c + p) for c in ["2D", "Sketch"]} for p in PROFILES},
            "explanations": {p: "Synthetic test explanation " + p for p in STAGE2_PROFILES}}


@unittest.skipUnless(os.environ.get("SAM_TEST_DATABASE_URL"), "Set SAM_TEST_DATABASE_URL to a disposable local PostgreSQL instance")
class PostgresStudyTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        base = os.environ["SAM_TEST_DATABASE_URL"]
        if conninfo_to_dict(base).get("host") not in ("localhost", "127.0.0.1", "::1"):
            raise RuntimeError("Integration tests require a LOCAL disposable database")
        self.schema = "sam_test_" + uuid.uuid4().hex
        with psycopg.connect(base, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.dsn = make_conninfo(base, options="-c search_path=" + self.schema)
        self.catalog = catalog_fixture()
        validate_catalog(self.catalog)
        self.access = {"sketch": {r: digest(k) for r, k in KEYS.items()},
                       "cohort": {"ADMIN": digest(KEYS["ADMIN"])}}
        with self.connect() as connection:
            connection.execute(Path("sam_backend/schema.sql").read_text(encoding="utf-8"))
            connection.execute(Path("sam_backend/expert_schema.sql").read_text(encoding="utf-8"))
            connection.execute(Path("sam_backend/expert_2d_schema.sql").read_text(encoding="utf-8"))
            for key, value in [("catalog", self.catalog), ("access_hashes", self.access), ("migration", {"ready": True})]:
                connection.execute("INSERT INTO sam_settings VALUES (%s,%s)", (key, Jsonb(value)))
        self.environment = patch.dict(os.environ, {"SAM_DATABASE_URL": self.dsn, "SAM_BACKEND": "postgres", "SAM_WRITE_PAUSED": "0"})
        self.environment.start()
        app = FastAPI()
        app.include_router(router)
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url="https://test.example")

    async def asyncTearDown(self):
        await self.client.aclose()
        await close_connections()
        self.environment.stop()
        with psycopg.connect(os.environ["SAM_TEST_DATABASE_URL"], autocommit=True) as connection:
            # Only this test's random local schema is removed; production URLs are rejected above.
            connection.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(self.schema)))

    def connect(self):
        return psycopg.connect(self.dsn, row_factory=dict_row, autocommit=True)

    async def call(self, path, role="R1", body=None, token=None):
        key = token or KEYS.get(role)
        return await self.client.request("POST" if body is not None else "GET", path,
                                         headers={"Authorization": "Bearer " + key} if key else {},
                                         **({"json": body} if body is not None else {}))

    def payload(self, rater, profile, protocol=SKETCH_PROTOCOL, mode="production", **extra):
        return {"rater": rater, "profile": profile, "mode": mode, "protocol": protocol,
                "audio_version": "none", "audio_ms": 0, "view_ms": 2000,
                "valence": 5, "arousal": 4, "dominance": 6, "confidence": 7, **extra}

    def count(self, table):
        with self.connect() as connection:
            return connection.execute(sql.SQL("SELECT count(*) AS n FROM {}").format(sql.Identifier(table))).fetchone()["n"]

    async def complete_sketch(self, rater, mode="production", role=None):
        for profile in sequence(rater):
            response = await self.call("/api/submit", role=role or rater, body=self.payload(rater, profile, mode=mode))
            self.assertEqual(response.status_code, 200, response.text)

    async def test_native_health_access_and_fail_closed_migration_gate(self):
        self.assertEqual((await self.client.get("/api/auth")).status_code, 401)
        health = await self.call("/api/sam/health")
        self.assertEqual(health.json()["storage"], "postgresql")
        self.assertNotIn("postgresql://", health.text)
        self.assertEqual((await self.call("/api/session?rater=R2")).status_code, 403)
        self.assertEqual((await self.call("/api/results")).status_code, 403)
        self.assertEqual((await self.call("/api/session?rater=R1", "ADMIN")).status_code, 403)
        unknown = "unknown-role".ljust(32, "x")
        self.access["sketch"]["R99"] = digest(unknown)
        with self.connect() as connection:
            connection.execute("UPDATE sam_settings SET document=%s WHERE key='access_hashes'", (Jsonb(self.access),))
        self.assertEqual((await self.call("/api/auth", token=unknown)).status_code, 401)
        with self.connect() as connection:
            connection.execute("UPDATE sam_settings SET document=%s WHERE key='migration'", (Jsonb({"ready": False}),))
        self.assertEqual((await self.call("/api/sam/health")).status_code, 503)
        self.assertEqual((await self.call("/api/submit", body=self.payload("R1", sequence("R1")[0]))).status_code, 503)
        self.assertEqual(self.count("sketch_ratings"), 0)

    async def test_concurrent_claims_capacity_and_recovery_never_duplicate(self):
        tokens = [f"claim{i}".ljust(32, "x") for i in range(80)]
        responses = await asyncio.gather(*(self.call("/api/cohort/join", body={"token": token}) for token in tokens))
        successes = [(token, response.json()["role"]) for token, response in zip(tokens, responses) if response.status_code == 200]
        self.assertEqual(len(successes), len(PARTICIPANTS))
        self.assertEqual({role for _, role in successes}, set(PARTICIPANTS))
        self.assertEqual(sum(r.status_code == 409 for r in responses), 80 - len(PARTICIPANTS))
        self.assertEqual(self.count("cohort_claims"), len(PARTICIPANTS))
        token, participant = successes[0]
        retries = await asyncio.gather(*(self.call("/api/cohort/join", body={"token": token}) for _ in range(12)))
        self.assertTrue(all(r.json()["role"] == participant for r in retries))
        auth = await self.call("/api/cohort/auth", token=token)
        self.assertEqual(auth.json(), {"ok": True, "role": participant, "access": "claim"})
        self.assertEqual((await self.call("/api/cohort/results", token=token)).status_code, 403)
        self.assertEqual(self.count("cohort_claims"), len(PARTICIPANTS))

    async def test_replacement_slots_reuse_unfinished_schedules_least_progress_first(self):
        for i in range(60):
            self.assertEqual((await self.call("/api/cohort/join", body={"token": f"base{i}".ljust(32, "b")})).status_code, 200)
        sources = dict(REPLACEMENT_SOURCES)
        # S04 finished by its original holder; S11 finished by its round-1 extra slot S64 (never claimed here);
        # S06 partially done by its original holder.
        done_by = {"S04": "S04", "S11": "S64"}
        with self.connect() as connection:
            for holder, schedule, n in (("S04", "S04", 12), ("S64", "S11", 12), ("S06", "S06", 3)):
                for index, trial in enumerate(self.catalog["schedules"][schedule][:n]):
                    connection.execute("INSERT INTO cohort_ratings VALUES ('production',%s,%s,%s,%s,5,4,6,7,1000,0,'none','t',%s,'h','')",
                                       (holder, trial["profile"], trial["condition"], index + 1, COHORT_PROTOCOL))
        expected = [p for p, src in sources.items() if src not in done_by and p not in done_by.values()]
        roles = []
        for i in range(len(sources)):
            response = await self.call("/api/cohort/join", body={"token": f"extra{i}".ljust(32, "e")})
            roles.append(response.json().get("role") if response.status_code == 200 else None)
        handed = [r for r in roles if r]
        self.assertEqual(sorted(handed), sorted(expected))
        self.assertTrue(all(r is None for r in roles[len(handed):]))
        self.assertEqual(handed[-1], "S62")
        self.assertNotIn("S75", handed)
        token = "extra0".ljust(32, "e")
        session = (await self.call(f"/api/cohort/session?rater={roles[0]}", token=token)).json()
        self.assertEqual(session["trials"], self.catalog["schedules"][sources[roles[0]]])
        trial = session["trials"][0]
        body = self.payload(roles[0], trial["profile"], COHORT_PROTOCOL, condition=trial["condition"])
        self.assertEqual((await self.call("/api/cohort/submit", token=token, body=body)).status_code, 200)
        results = (await self.call("/api/cohort/results", "ADMIN")).json()
        self.assertEqual(results["replacements"], sources)
        export = (await self.call("/api/cohort/export.csv", "ADMIN")).text
        self.assertIn(f'"{roles[0]}"', export)
        line = next(l for l in export.splitlines() if l.startswith(f'"production","{roles[0]}"'))
        self.assertTrue(line.endswith(f'"{sources[roles[0]]}"'))

    async def test_same_token_simultaneous_join_occupies_one_slot_and_skips_started_tasks(self):
        token = "same-token".ljust(32, "x")
        responses = await asyncio.gather(*(self.call("/api/cohort/join", body={"token": token}) for _ in range(25)))
        self.assertTrue(all(r.json()["role"] == "S01" for r in responses))
        self.assertEqual(self.count("cohort_claims"), 1)
        with self.connect() as connection:
            connection.execute("""INSERT INTO cohort_ratings VALUES ('production','S02','P1','Sketch',1,5,4,6,7,1000,0,'none','old','old','old','')""")
        response = await self.call("/api/cohort/join", body={"token": "new-token".ljust(32, "y")})
        self.assertEqual(response.json()["role"], "S03")

    async def test_concurrent_submissions_are_idempotent_and_ordered(self):
        first, second = sequence("R1")[:2]
        body = self.payload("R1", first)
        responses = await asyncio.gather(*(self.call("/api/submit", body=body) for _ in range(16)))
        self.assertTrue(all(r.status_code == 200 for r in responses))
        self.assertEqual(self.count("sketch_ratings"), 1)
        self.assertEqual((await self.call("/api/submit", body={**body, "valence": 1})).status_code, 409)
        self.assertEqual((await self.call("/api/submit", body=self.payload("R1", sequence("R1")[3]))).status_code, 409)
        self.assertEqual((await self.call("/api/submit", body=self.payload("R1", second, valence=True))).status_code, 400)
        self.assertEqual((await self.call("/api/submit", body=self.payload("R1", second, audio_ms=10))).status_code, 400)
        self.assertEqual((await self.call("/api/submit", body=self.payload("R1", second))).status_code, 200)
        self.assertEqual((await self.call("/api/session?rater=R1")).json()["completed"], [first, second])

    async def test_all_720_cohort_scores_resume_and_authorization(self):
        for participant in BASE_PARTICIPANTS:
            token = ("legacy-" + participant).ljust(32, "z")
            self.access["cohort"][participant] = digest(token)
        with self.connect() as connection:
            connection.execute("UPDATE sam_settings SET document=%s WHERE key='access_hashes'", (Jsonb(self.access),))
        for participant in BASE_PARTICIPANTS:
            token = ("legacy-" + participant).ljust(32, "z")
            for trial in self.catalog["schedules"][participant]:
                body = self.payload(participant, trial["profile"], COHORT_PROTOCOL, condition=trial["condition"])
                response = await self.call("/api/cohort/submit", token=token, body=body)
                self.assertEqual(response.status_code, 200, response.text)
            session = (await self.call("/api/cohort/session?rater=" + participant, token=token)).json()
            self.assertEqual(len(session["completed"]), 12)
            self.assertEqual(session["trials"], self.catalog["schedules"][participant])
        self.assertEqual(self.count("cohort_ratings"), 720)
        response = await self.call("/api/cohort/results", "ADMIN")
        self.assertEqual(len(response.json()["rows"]), 720)
        self.assertNotIn("token_hash", response.text)
        csv = await self.call("/api/cohort/export.csv", "ADMIN")
        self.assertEqual(len(csv.text.strip().splitlines()), 721)
        self.assertEqual(len((await self.call("/api/cohort/assignments.csv", "ADMIN")).text.strip().splitlines()), 1 + 12 * len(PARTICIPANTS))

    async def test_all_standalone_and_second_stage_scores_preserve_originals_and_export(self):
        self.assertEqual((await self.call("/api/session?stage=2&rater=R1")).status_code, 403)
        for rater in RATERS:
            await self.complete_sketch(rater)
        with self.connect() as connection:
            before = connection.execute("SELECT * FROM sketch_ratings ORDER BY rater,profile").fetchall()
        for rater in RATERS:
            session = (await self.call(f"/api/session?stage=2&rater={rater}", rater)).json()
            self.assertEqual(session["sequence"], [p for p in sequence(rater) if p in STAGE2_PROFILES])
            self.assertTrue(all(c["baseline"]["rater"] == rater for c in session["contexts"].values()))
            for profile in session["sequence"]:
                body = self.payload(rater, profile, STAGE2_PROTOCOL, explanation_version=EXPLANATION_VERSION,
                                    baseline={"valence": 1}, explanation_text="ignored client context", valence=8)
                self.assertEqual((await self.call("/api/submit?stage=2", rater, body)).status_code, 200)
            self.assertEqual(len((await self.call(f"/api/session?stage=2&rater={rater}", rater)).json()["completed"]), 7)
        self.assertEqual(self.count("sketch_stage2_ratings"), 21)
        with self.connect() as connection:
            self.assertEqual(connection.execute("SELECT * FROM sketch_ratings ORDER BY rater,profile").fetchall(), before)
        rows = (await self.call("/api/results?stage=2", "ADMIN")).json()["rows"]
        self.assertTrue(all(r["baseline"]["valence"] == 5 and r["explanation_text"] == self.catalog["explanations"][r["profile"]] for r in rows))
        for stage, long_count, wide_count in [(1, 73, 25), (2, 22, 8)]:
            for layout, count in [("long", long_count), ("wide", wide_count)]:
                response = await self.call(f"/api/export.csv?stage={stage}&layout={layout}", "ADMIN")
                self.assertEqual(len(response.text.strip().splitlines()), count)
                self.assertIn("Content-Disposition".lower(), response.headers)
        self.assertEqual((await self.call("/api/results?mode=test&stage=2", "ADMIN")).json()["rows"], [])
        self.assertEqual((await self.call("/api/session?mode=test&stage=2&rater=R1", "ADMIN")).status_code, 403)
        await self.complete_sketch("R1", "test", "ADMIN")
        self.assertEqual((await self.call("/api/session?mode=test&stage=2&rater=R1", "ADMIN")).status_code, 200)

    async def test_import_roundtrip_keeps_every_historical_value_and_refuses_conflicting_data(self):
        await self.complete_sketch("R1")
        await self.call("/api/cohort/join", body={"token": "migration-token".ljust(32, "x")})
        with self.connect() as connection:
            connection.execute("UPDATE sketch_ratings SET protocol='legacy-audio',audio_version='matched-sound-effect-v1',audio_ms=1234,audio_sha256='old-audio' WHERE rater='R1' AND profile=%s", (sequence("R1")[0],))
            tables = {table: connection.execute(sql.SQL("SELECT * FROM {}").format(sql.Identifier(table))).fetchall() for table in ["sketch_ratings", "cohort_ratings", "cohort_claims", "sketch_stage2_ratings"]}
        bundle = {"format": "sam-migration-v1", "catalog": self.catalog, "access_hashes": self.access, "tables": tables,
                  "source_checked_at_utc": "2026-11-10T00:00:00Z", "source_write_frozen": True}
        bundle["table_checksums"] = {table: checksum(normalized(table, rows)) for table, rows in tables.items()}
        bundle["dataset_checksum"] = checksum({"catalog": self.catalog, "access_hashes": self.access, "tables": {table: normalized(table, rows) for table, rows in tables.items()}})
        target_schema = self.schema + "_import"
        with psycopg.connect(os.environ["SAM_TEST_DATABASE_URL"], autocommit=True, row_factory=dict_row) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(target_schema)))
            connection.execute(sql.SQL("SET search_path TO {}").format(sql.Identifier(target_schema)))
            result = import_bundle(connection, bundle)
            self.assertFalse(result["ready"])
            broken = copy.deepcopy(bundle)
            broken["tables"]["sketch_ratings"][0]["valence"] = 1
            broken["table_checksums"]["sketch_ratings"] = checksum(normalized("sketch_ratings", broken["tables"]["sketch_ratings"]))
            broken["dataset_checksum"] = checksum({"catalog": broken["catalog"], "access_hashes": broken["access_hashes"], "tables": {table: normalized(table, rows) for table, rows in broken["tables"].items()}})
            with self.assertRaises(ValueError):
                import_bundle(connection, broken)
            final = import_bundle(connection, bundle, final=True)
            self.assertTrue(final["ready"])
            with self.assertRaises(ValueError):
                import_bundle(connection, bundle, final=True)
            for table, rows in tables.items():
                saved = connection.execute(sql.SQL("SELECT * FROM {}").format(sql.Identifier(table))).fetchall()
                self.assertEqual(checksum(normalized(table, saved)), checksum(normalized(table, rows)))
            connection.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(target_schema)))

    async def test_write_pause_preserves_read_access_without_any_write(self):
        with patch.dict(os.environ, {"SAM_WRITE_PAUSED": "1"}):
            self.assertEqual((await self.call("/api/cohort/join", body={"token": "pause-token".ljust(32, "x")})).status_code, 503)
            self.assertEqual((await self.call("/api/status")).status_code, 200)
        self.assertEqual(self.count("cohort_claims"), 0)

    async def test_prepared_migration_switches_only_after_verified_commit_and_never_falls_back_on_errors(self):
        def legacy_handler(request):
            return httpx.Response(200, json={"ok": True, "revision": "legacy"})
        def legacy_client():
            return httpx.AsyncClient(transport=httpx.MockTransport(legacy_handler))
        with self.connect() as connection:
            connection.execute("UPDATE sam_settings SET document=%s WHERE key='migration'", (Jsonb({"ready": False}),))
        with patch.dict(os.environ, {"SAM_BACKEND": "migrate"}), patch("sam_proxy.storage_client", side_effect=legacy_client):
            health = await self.call("/api/sam/health")
            self.assertEqual(health.json()["revision"], "legacy")
            self.assertFalse(health.json()["migration_target_ready"])
            with self.connect() as connection:
                connection.execute("UPDATE sam_settings SET document=%s WHERE key='migration'", (Jsonb({"ready": True}),))
            with patch("sam_proxy.storage_client", side_effect=AssertionError("No legacy request after activation")):
                self.assertEqual((await self.call("/api/sam/health")).json()["storage"], "postgresql")
                self.assertEqual((await self.call("/api/cohort/join", body={})).status_code, 400)
                with patch.dict(os.environ, {"SAM_DATABASE_URL": "invalid connection syntax"}):
                    self.assertEqual((await self.call("/api/sam/health")).status_code, 503)


if __name__ == "__main__":
    unittest.main()

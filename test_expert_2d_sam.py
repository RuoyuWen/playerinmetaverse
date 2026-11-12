"""2D expert condition, eight explanations (P6-P8 withdrawn but retained), and isolation from Sketch history."""

import csv
import io
import os
import unittest
from pathlib import Path

from psycopg.types.json import Jsonb
import test_expert_sam as sketch
from sam_backend.config import PROFILES, RATERS, sequence
from sam_backend.expert import (INSTRUMENT_2D, PROTOCOL_2D, REASSESS_PROTOCOL_2D, EXPLANATION_SETTING_2D,
                                EXPLANATION_VERSION_2D, STAGE2_PROFILES_2D, STAGE2_INDEX_PROFILES_2D)


def explanation_fixture():
    return {"version": EXPLANATION_VERSION_2D,
            "explanations": {p: "Synthetic revised 2D creator explanation: " + p for p in STAGE2_PROFILES_2D}}


@unittest.skipUnless(os.environ.get("SAM_TEST_DATABASE_URL"), "Requires disposable LOCAL PostgreSQL")
class Expert2DTests(unittest.IsolatedAsyncioTestCase):
    asyncTearDown = sketch.ExpertInstrumentTests.asyncTearDown
    connect = sketch.ExpertInstrumentTests.connect
    call = sketch.ExpertInstrumentTests.call
    count = sketch.ExpertInstrumentTests.count

    async def asyncSetUp(self):
        await sketch.ExpertInstrumentTests.asyncSetUp(self)
        self.explanations = explanation_fixture()
        with self.connect() as db:
            db.execute("INSERT INTO sam_settings VALUES (%s,%s)", (EXPLANATION_SETTING_2D, Jsonb(self.explanations)))

    async def expert(self, path, role="R1", body=None, second=False, mode="production"):
        suffix = "&" if "?" in path else "?"
        return await self.call(path + suffix + f"instrument={INSTRUMENT_2D}&stage={2 if second else 1}&mode={mode}", role, body)

    def answer(self, rater, profile, second=False, mode="production"):
        body = sketch.ExpertInstrumentTests.answer(self, rater, profile, second, mode)
        body.update(condition="2D", protocol=REASSESS_PROTOCOL_2D if second else PROTOCOL_2D)
        if second:
            body["explanation_version"] = EXPLANATION_VERSION_2D
        else:
            body["atmosphere_confidence"] = 5
            body.pop("visual_elements")
            body.pop("personal_meaning")
        return body

    async def test_72_2d_ratings_24_reassessments_exact_contexts_hashes_and_exports(self):
        # Complete the Sketch dual instrument; it still must not unlock 2D explanations.
        for profile in sequence("R1"):
            body = sketch.ExpertInstrumentTests.answer(self, "R1", profile)
            response = await sketch.ExpertInstrumentTests.expert(self, "/api/submit", body=body)
            self.assertEqual(response.status_code, 200, response.text)
        with self.connect() as db:
            previous = db.execute("SELECT * FROM expert_ratings ORDER BY profile").fetchall()
        self.assertEqual((await self.expert("/api/session?rater=R1", second=True)).status_code, 403)
        for rater in RATERS:
            first = (await self.expert("/api/session?rater=" + rater, rater)).json()
            self.assertEqual(first["total"], 24)
            self.assertEqual(first["condition"], "2D")
            self.assertEqual(first["completed"], [])
            self.assertEqual(first["trials"], [{"profile": p, "condition": "2D"} for p in sequence(rater)])
            self.assertNotIn("contexts", first)
            for profile in first["sequence"]:
                body = self.answer(rater, profile)
                self.assertEqual((await self.expert("/api/submit", rater, body)).status_code, 200)
            second = (await self.expert("/api/session?rater=" + rater, rater, second=True)).json()
            self.assertEqual(second["total"], 8)
            self.assertEqual(second["sequence"], [p for p in sequence(rater) if p in STAGE2_PROFILES_2D])
            self.assertEqual(set(second["contexts"]), set(STAGE2_PROFILES_2D))
            for profile in second["sequence"]:
                context = second["contexts"][profile]
                self.assertEqual(context["explanation"], self.explanations["explanations"][profile])
                self.assertEqual(context["baseline"]["image_sha256"], self.catalog["media_hashes"][profile]["2D"])
                self.assertNotIn("sketch_sha256", context["baseline"])
                self.assertIsNone(context["baseline"]["visual_elements"])
                self.assertIsNone(context["baseline"]["personal_meaning"])
                body = self.answer(rater, profile, second=True)
                body.update(explanation_text="Forged", baseline={"intended_valence": 1})
                self.assertEqual((await self.expert("/api/submit", rater, body, second=True)).status_code, 200)
                self.assertTrue((await self.expert("/api/submit", rater, body, second=True)).json()["already_saved"])
        self.assertEqual(self.count("expert_2d_ratings"), 72)
        self.assertEqual(self.count("expert_2d_stage2_ratings"), 24)
        with self.connect() as db:
            self.assertEqual(previous, db.execute("SELECT * FROM expert_ratings ORDER BY profile").fetchall())
        for second in (False, True):
            result = (await self.expert("/api/results", "ADMIN", second=second)).json()
            self.assertEqual(len(result["rows"]), 24 if second else 72)
            self.assertEqual(result["condition"], "2D")
            if second:
                for row in result["rows"]:
                    self.assertEqual(row["explanation_text"], self.explanations["explanations"][row["profile"]])
                    self.assertEqual(row["baseline"]["rater"], row["rater"])
                    self.assertEqual(row["image_sha256"], self.catalog["media_hashes"][row["profile"]]["2D"])
            for layout in ("long", "wide"):
                response = await self.expert("/api/export.csv?layout=" + layout, "ADMIN", second=second)
                exported = list(csv.DictReader(io.StringIO(response.content.decode("utf-8-sig"))))
                self.assertEqual(len(exported), (8 if second else 24) if layout == "wide" else (24 if second else 72))
                prefix = "R1_" if layout == "wide" else ""
                self.assertEqual(exported[0][prefix + "condition"], "2D")
                self.assertIn(prefix + "image_sha256", exported[0])
                self.assertNotIn(prefix + "sketch_sha256", exported[0])
                if second:
                    self.assertIn(prefix + "baseline_image_sha256", exported[0])
                    self.assertEqual(exported[0][prefix + "baseline_atmosphere_confidence"], "5")
                else:
                    self.assertEqual(exported[0][prefix + "atmosphere_confidence"], "5")
                self.assertNotIn(prefix + "visual_elements", exported[0])
                self.assertNotIn(prefix + "personal_meaning", exported[0])

    async def test_withdrawn_works_are_kept_hidden_and_never_collide(self):
        rater = "R2"
        for profile in sequence(rater):
            self.assertEqual((await self.expert("/api/submit", rater, self.answer(rater, profile))).status_code, 200)
        index_order = [p for p in sequence(rater) if p in STAGE2_INDEX_PROFILES_2D]
        withdrawn = next(p for p in index_order if p not in STAGE2_PROFILES_2D)
        with self.connect() as db:
            # An earlier v1 reassessment of a withdrawn work, exactly as the old 11-work version stored it.
            db.execute("""INSERT INTO expert_2d_stage2_ratings (mode,rater,profile,trial_index,intended_valence,intended_arousal,
                intended_dominance,confidence,view_ms,submitted_at_utc,protocol,image_sha256,explanation_version,explanation_text,
                explanation_sha256,baseline_json) VALUES ('production',%s,%s,%s,5,5,5,5,1000,'historical',%s,%s,
                'creator-explanations-20261111-2d-v1','Old explanation',%s,'{}')""",
                (rater, withdrawn, index_order.index(withdrawn) + 1, REASSESS_PROTOCOL_2D, self.catalog["media_hashes"][withdrawn]["2D"], "0" * 64))
            before = db.execute("SELECT * FROM expert_2d_stage2_ratings WHERE profile=%s", (withdrawn,)).fetchone()
        session = (await self.expert("/api/session?rater=" + rater, rater, second=True)).json()
        self.assertEqual(session["total"], 8)
        self.assertNotIn(withdrawn, session["sequence"])
        self.assertEqual(session["completed"], [])
        for profile in session["sequence"]:
            response = await self.expert("/api/submit", rater, self.answer(rater, profile, second=True), second=True)
            self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual((await self.expert("/api/status", rater, second=True)).json()["counts"][rater], 8)
        rows = (await self.expert("/api/results", "ADMIN", second=True)).json()["rows"]
        self.assertEqual(sorted(r["profile"] for r in rows), sorted(STAGE2_PROFILES_2D))
        for layout in ("long", "wide"):
            text = (await self.expert("/api/export.csv?layout=" + layout, "ADMIN", second=True)).content.decode("utf-8-sig")
            self.assertNotIn("Old explanation", text)
            self.assertFalse(any(r.get("profile") == withdrawn for r in csv.DictReader(io.StringIO(text))))
        with self.connect() as db:
            self.assertEqual(before, db.execute("SELECT * FROM expert_2d_stage2_ratings WHERE profile=%s", (withdrawn,)).fetchone())
            self.assertEqual(db.execute("SELECT count(*) AS n FROM expert_2d_stage2_ratings").fetchone()["n"], 9)
            stored = {r["profile"]: r["trial_index"] for r in db.execute("SELECT profile,trial_index FROM expert_2d_stage2_ratings").fetchall()}
            self.assertEqual(stored, {p: index_order.index(p) + 1 for p in stored})

    async def test_wrong_condition_version_auth_incomplete_and_missing_config(self):
        profile = sequence("R1")[0]
        body = self.answer("R1", profile)
        for change in ({"condition": "Sketch"}, {"protocol": "sketch-expert-atmosphere-intention-v1"},
                       {"atmosphere_confidence": None}, {"atmosphere_confidence": True},
                       {"atmosphere_confidence": 0}, {"atmosphere_confidence": 8}):
            self.assertEqual((await self.expert("/api/submit", body={**body, **change})).status_code, 400)
        self.assertEqual((await self.expert("/api/submit", "R2", body)).status_code, 403)
        self.assertEqual((await self.expert("/api/session?rater=R2")).status_code, 403)
        self.assertEqual((await self.expert("/api/results")).status_code, 403)
        self.assertEqual((await self.expert("/api/submit", body=body)).status_code, 200)
        self.assertTrue((await self.expert("/api/submit", body=body)).json()["already_saved"])
        self.assertEqual((await self.expert("/api/submit", body={**body, "intended_valence": 2})).status_code, 409)
        self.assertEqual((await self.expert("/api/submit", body={**body, "atmosphere_confidence": 2})).status_code, 409)
        self.assertEqual((await self.expert("/api/status", mode="test")).json()["counts"]["R1"], 0)
        locked = await self.expert("/api/session?rater=R1", second=True)
        self.assertEqual(locked.status_code, 403)
        self.assertNotIn("contexts", locked.json())
        with self.connect() as db:
            db.execute("UPDATE sam_settings SET document='{}'::jsonb WHERE key=%s", (EXPLANATION_SETTING_2D,))
        self.assertEqual((await self.expert("/api/status")).status_code, 503)
        # Missing 2D configuration cannot break existing cohort or older expert endpoints.
        self.assertEqual((await self.call("/api/status?instrument=expert-dual-v1")).status_code, 200)
        self.assertEqual((await self.call("/api/cohort/status", "ADMIN")).status_code, 200)

    async def test_upgrade_preserves_old_answers_null_confidence_and_progress(self):
        # This random local schema deliberately reproduces the earlier table layout.
        with self.connect() as db:
            db.execute("ALTER TABLE expert_2d_ratings DROP COLUMN atmosphere_confidence")
            db.execute("ALTER TABLE expert_2d_ratings ALTER COLUMN visual_elements SET NOT NULL")
            db.execute("ALTER TABLE expert_2d_ratings ALTER COLUMN personal_meaning SET NOT NULL")
            profile = sequence("R1")[0]
            body = self.answer("R1", profile)
            row = {k: v for k, v in body.items() if k not in ("condition", "audio_ms", "audio_version", "atmosphere_confidence")}
            row.update(protocol="2d-expert-atmosphere-intention-v1", visual_elements="Historical visual answer",
                       personal_meaning="Historical meaning answer", trial_index=1, submitted_at_utc="historical",
                       image_sha256=self.catalog["media_hashes"][profile]["2D"])
            db.execute("INSERT INTO expert_2d_ratings (" + ",".join(row) + ") VALUES (" + ",".join(["%s"] * len(row)) + ")", tuple(row.values()))
            before = db.execute("SELECT * FROM expert_2d_ratings").fetchone()
            db.execute(Path("sam_backend/expert_2d_schema.sql").read_text(encoding="utf-8"))
            after = db.execute("SELECT * FROM expert_2d_ratings").fetchone()
            self.assertIsNone(after.pop("atmosphere_confidence"))
            self.assertEqual(before, after)
        session = (await self.expert("/api/session?rater=R1")).json()
        self.assertEqual(session["completed"], [profile])
        next_profile = sequence("R1")[1]
        self.assertEqual((await self.expert("/api/submit", body=self.answer("R1", next_profile))).status_code, 200)
        with self.connect() as db:
            newest = db.execute("SELECT * FROM expert_2d_ratings WHERE profile=%s", (next_profile,)).fetchone()
            self.assertEqual(newest["atmosphere_confidence"], 5)
            self.assertIsNone(newest["visual_elements"])
            self.assertIsNone(newest["personal_meaning"])

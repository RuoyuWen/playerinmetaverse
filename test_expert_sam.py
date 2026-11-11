"""New expert instrument: meaningful end-to-end checks in disposable local schemas."""

import copy
import csv
import io
import json
import os
import unittest

import test_sam_postgres as legacy
from sam_backend.config import EXPLANATION_VERSION, PROFILES, RATERS, STAGE2_PROFILES, sequence
from sam_backend.expert import ATMOSPHERE, INSTRUMENT, INTENDED, PROTOCOL, REASSESS_PROTOCOL, question_order


class CounterbalanceTests(unittest.TestCase):
    def test_balanced_within_each_expert_and_across_works(self):
        for rater in RATERS:
            self.assertEqual(sum(question_order(rater, p) == "atmosphere_first" for p in PROFILES), 12)
        for p in PROFILES:
            self.assertIn(sum(question_order(r, p) == "atmosphere_first" for r in RATERS), (1, 2))


@unittest.skipUnless(os.environ.get("SAM_TEST_DATABASE_URL"), "Requires disposable LOCAL PostgreSQL")
class ExpertInstrumentTests(unittest.IsolatedAsyncioTestCase):
    asyncSetUp = legacy.PostgresStudyTests.asyncSetUp
    asyncTearDown = legacy.PostgresStudyTests.asyncTearDown
    connect = legacy.PostgresStudyTests.connect
    call = legacy.PostgresStudyTests.call
    count = legacy.PostgresStudyTests.count

    async def expert(self, path, role="R1", body=None, second=False, mode="production"):
        suffix = "&" if "?" in path else "?"
        return await self.call(path + suffix + f"instrument={INSTRUMENT}&stage={2 if second else 1}&mode={mode}", role, body)

    def answer(self, rater, profile, second=False, mode="production"):
        return {"mode": mode, "rater": rater, "profile": profile,
                "protocol": REASSESS_PROTOCOL if second else PROTOCOL, "view_ms": 1234,
                "audio_version": "none", "audio_ms": 0,
                **dict(zip(INTENDED, [7, 3, 8])), "confidence": 6,
                **({"explanation_version": EXPLANATION_VERSION} if second else {
                    **dict(zip(ATMOSPHERE, [2, 8, 3])), "question_order": question_order(rater, profile),
                    "visual_elements": "Synthetic: warm colours, water and framing.\nA second line.",
                    "personal_meaning": "Cannot infer personal meaning from the image alone."})}

    async def test_full_instrument_stage2_export_and_legacy_isolation(self):
        # A fully completed earlier questionnaire cannot unlock the new explanation phase.
        for profile in sequence("R1"):
            response = await self.call("/api/submit", body=legacy.PostgresStudyTests.payload(self, "R1", profile))
            self.assertEqual(response.status_code, 200)
        with self.connect() as db:
            before = db.execute("SELECT * FROM sketch_ratings ORDER BY profile").fetchall()
        status = await self.expert("/api/status", second=True)
        self.assertFalse(status.json()["eligible"]["R1"])
        locked = await self.expert("/api/session?rater=R1", second=True)
        self.assertEqual(locked.status_code, 403)
        self.assertNotIn("contexts", locked.json())
        for rater in RATERS:
            session = (await self.expert("/api/session?rater=" + rater, rater)).json()
            self.assertEqual(session["completed"], [])
            self.assertNotIn("contexts", session)
            for profile in session["sequence"]:
                body = self.answer(rater, profile)
                self.assertEqual(session["question_orders"][profile], body["question_order"])
                self.assertEqual((await self.expert("/api/submit", rater, body)).status_code, 200)
                retry = await self.expert("/api/submit", rater, body)
                self.assertTrue(retry.json()["already_saved"])
            second_session = (await self.expert("/api/session?rater=" + rater, rater, second=True)).json()
            self.assertEqual(len(second_session["sequence"]), 7)
            for profile in second_session["sequence"]:
                context = second_session["contexts"][profile]
                self.assertEqual(context["baseline"]["intended_valence"], 7)
                self.assertEqual(context["baseline"]["atmosphere_valence"], 2)
                self.assertEqual(context["baseline"]["rater"], rater)
                body = self.answer(rater, profile, second=True)
                body.update(intended_valence=8, baseline={"intended_valence": 1}, explanation_text="Forged client text")
                self.assertEqual((await self.expert("/api/submit", rater, body, second=True)).status_code, 200)
                self.assertTrue((await self.expert("/api/submit", rater, body, second=True)).json()["already_saved"])
        self.assertEqual(self.count("expert_ratings"), 72)
        self.assertEqual(self.count("expert_stage2_ratings"), 21)
        with self.connect() as db:
            self.assertEqual(before, db.execute("SELECT * FROM sketch_ratings ORDER BY profile").fetchall())
        for second in (False, True):
            result = await self.expert("/api/results", "ADMIN", second=second)
            self.assertEqual(len(result.json()["rows"]), 21 if second else 72)
            for layout in ("long", "wide"):
                exported = await self.expert("/api/export.csv?layout=" + layout, "ADMIN", second=second)
                rows = list(csv.DictReader(io.StringIO(exported.content.decode("utf-8-sig"))))
                self.assertEqual(len(rows), (7 if second else 24) if layout == "wide" else (21 if second else 72))
                prefix = "R1_" if layout == "wide" else ""
                self.assertIn(prefix + "intended_valence", rows[0])
                self.assertIn(prefix + ("baseline_" if second else "") + "visual_elements", rows[0])
            if second:
                row = result.json()["rows"][0]
                self.assertEqual(row["baseline"]["intended_valence"], 7)
                self.assertEqual(row["intended_valence"], 8)
                self.assertNotEqual(row["explanation_text"], "Forged client text")

    async def test_strict_validation_permissions_immutable_retry_and_resume(self):
        profile = sequence("R1")[0]
        body = self.answer("R1", profile)
        for change in [{"intended_valence": True}, {"atmosphere_valence": 10}, {"confidence": 8},
                       {"personal_meaning": " "}, {"visual_elements": "x" * 2001},
                       {"visual_elements": "invalid\x00text"}, {"question_order": "wrong"}, {"protocol": "legacy"}]:
            response = await self.expert("/api/submit", body={**body, **change})
            self.assertEqual(response.status_code, 400, response.text)
        self.assertEqual(self.count("expert_ratings"), 0)
        self.assertEqual((await self.expert("/api/submit", "R2", body)).status_code, 403)
        self.assertEqual((await self.expert("/api/submit", "ADMIN", body)).status_code, 403)
        self.assertEqual((await self.expert("/api/session?rater=R2")).status_code, 403)
        self.assertEqual((await self.expert("/api/results")).status_code, 403)
        self.assertEqual((await self.expert("/api/submit", body=self.answer("R1", sequence("R1")[1]))).status_code, 409)
        self.assertEqual((await self.expert("/api/submit", body=body)).status_code, 200)
        for change in [{"atmosphere_arousal": 1}, {"intended_dominance": 2}, {"personal_meaning": "Changed"}]:
            self.assertEqual((await self.expert("/api/submit", body={**body, **change})).status_code, 409)
        session = (await self.expert("/api/session?rater=R1")).json()
        self.assertEqual(session["completed"], [profile])
        self.assertEqual((await self.expert("/api/submit", body=self.answer("R1", STAGE2_PROFILES[0], second=True), second=True)).status_code, 403)
        self.assertEqual((await self.expert("/api/status", mode="test")).json()["counts"]["R1"], 0)
        test_body = self.answer("R1", profile, mode="test")
        self.assertEqual((await self.expert("/api/submit", "ADMIN", test_body, mode="test")).status_code, 200)
        self.assertEqual(self.count("expert_ratings"), 2)

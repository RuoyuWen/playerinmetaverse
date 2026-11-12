"""Versioned expert instrument; legacy and cohort ratings stay independent."""

import json

from .config import CODING, EXPLANATION_VERSION, PROFILES, RATERS, STAGE2_PROFILES, digest, sequence

INSTRUMENT = "expert-dual-v1"
PROTOCOL = "sketch-expert-atmosphere-intention-v1"
REASSESS_PROTOCOL = "sketch-expert-intention-explanations-v2"
DIMENSIONS = ("valence", "arousal", "dominance")
INTENDED = ["intended_" + k for k in DIMENSIONS]
ATMOSPHERE = ["atmosphere_" + k for k in DIMENSIONS]
TEXT_FIELDS = ["visual_elements", "personal_meaning"]
TABLES = {False: "expert_ratings", True: "expert_stage2_ratings"}


def question_order(rater, profile):
    # 12/12 within every rater; each work has a 2/1 split across the three raters.
    return "atmosphere_first" if (int(profile[1:]) + RATERS.index(rater)) % 2 == 0 else "intention_first"


def settings(second=False):
    return {"instrument": INSTRUMENT, "protocol": REASSESS_PROTOCOL if second else PROTOCOL,
            "total": 7 if second else 24, "stage": 2 if second else 1,
            "profiles": STAGE2_PROFILES if second else PROFILES,
            "audio_version": "none", "dominance_low": "Low control", "dominance_high": "High control",
            "dominance_coding": CODING, "explanation_version": EXPLANATION_VERSION}


class ExpertStudy:
    instrument = INSTRUMENT
    protocol = PROTOCOL
    reassess_protocol = REASSESS_PROTOCOL
    stage2_profiles = STAGE2_PROFILES
    stage2_index_profiles = STAGE2_PROFILES
    explanation_version = EXPLANATION_VERSION
    tables = TABLES
    condition = 'Sketch'
    hash_column = 'sketch_sha256'

    def settings(self, second=False):
        return {**settings(second), 'instrument': self.instrument,
                'protocol': self.reassess_protocol if second else self.protocol,
                'total': len(self.stage2_profiles) if second else len(PROFILES),
                'profiles': self.stage2_profiles if second else PROFILES,
                'condition': self.condition, 'stage2_total': len(self.stage2_profiles), 'explanation_version': self.explanation_version}

    def image_hash(self, profile):
        return self.study.catalog['sketch_hashes'][profile]

    def explanations(self):
        return self.study.catalog['explanations']

    def __init__(self, study):
        self.study = study

    async def rows(self, second, mode, identity=None):
        table = self.tables[second]
        if identity:
            data = await self.study.all(f"SELECT * FROM {table} WHERE mode=%s AND rater=%s ORDER BY trial_index", (mode, identity))
        else:
            data = await self.study.all(f"SELECT * FROM {table} WHERE mode=%s ORDER BY rater,trial_index", (mode,))
        if second:
            for row in data:
                row["baseline"] = json.loads(row.pop("baseline_json"))
        return data

    async def handle(self, request, raw, role):
        from .api import complete, failure, query, reply
        endpoint = request.url.path.removeprefix("/api")
        stage, mode = query(request, "stage", "1"), query(request, "mode", "production")
        if stage not in ("1", "2") or mode not in ("production", "test"):
            return failure("Invalid stage or mode")
        second = stage == "2"
        cfg = self.settings(second)
        if endpoint == "/submit" and request.method == "POST":
            return await self.submit(request, raw, role, second)
        if request.method != "GET":
            return failure("Not found", 404)
        if endpoint == "/status":
            visible = RATERS if role == "ADMIN" else [role]
            data = await self.rows(second, mode, None if role == "ADMIN" else role)
            result = {**cfg, "role": role, "raters": visible,
                      "counts": {r: sum(row["rater"] == r for row in data) for r in visible}}
            if second:
                original = await self.rows(False, mode, None if role == "ADMIN" else role)
                result["first_stage_counts"] = {r: sum(row["rater"] == r for row in original) for r in visible}
                result["eligible"] = {r: complete([row for row in original if row["rater"] == r]) for r in visible}
            return reply(result)
        if endpoint == "/session":
            identity = query(request, "rater")
            if identity not in RATERS or (role != "ADMIN" and identity != role) or (role == "ADMIN" and mode != "test"):
                return failure("只能进入自己的任务；研究者请使用测试模式。", 403)
            data = await self.rows(second, mode, identity)
            order = sequence(identity)
            result = {**cfg, "completed": [row["profile"] for row in data]}
            if second:
                original = await self.rows(False, mode, identity)
                if not complete(original):
                    return failure("请先完成新版第一阶段的全部 24 张评价，再进入第二阶段。", 403)
                order = [p for p in order if p in self.stage2_profiles]
                result["contexts"] = {p: {"explanation": self.explanations()[p],
                    "baseline": next(row for row in original if row["profile"] == p)} for p in order}
            else:
                result["question_orders"] = {p: question_order(identity, p) for p in order}
            return reply({**result, "sequence": order, "trials": [{"profile": p, "condition": self.condition} for p in order]})
        if endpoint in ("/results", "/export.csv"):
            if role != "ADMIN":
                return failure("仅研究者可查看或下载评分结果。", 403)
            data = await self.rows(second, mode)
            if endpoint == "/results":
                return reply({**cfg, "raters": RATERS, "rows": data})
            return self.export(data, second, mode, query(request, "layout", "long"))
        return failure("Not found", 404)

    async def submit(self, request, raw, role, second):
        from .api import complete, failure, now, reply
        body, error = self.study.body(request, raw, 16384)
        if error is not None:
            return error
        rater, profile, mode = (body.get(k) for k in ("rater", "profile", "mode"))
        if rater not in RATERS or profile not in (self.stage2_profiles if second else PROFILES) or mode not in ("production", "test"):
            return failure("Invalid rater, profile or mode")
        if (role != "ADMIN" and role != rater) or (role == "ADMIN" and mode != "test"):
            return failure("不能为其他评价者提交；研究者只能提交测试数据。", 403)
        if self.condition == "2D" and body.get("condition") != "2D":
            return failure("图片条件不匹配，请刷新后重试。")
        expected = self.reassess_protocol if second else self.protocol
        if body.get("protocol") != expected or body.get("audio_version") != "none" or type(body.get("audio_ms")) is not int or body["audio_ms"] != 0:
            return failure("问卷版本已更新，请刷新后重试。")
        numeric = [*INTENDED, "confidence"] + ([] if second else ATMOSPHERE)
        if self.condition == "2D" and not second:
            numeric.append("atmosphere_confidence")
        if any(type(body.get(k)) is not int or not 1 <= body[k] <= (7 if k.endswith("confidence") else 9) for k in numeric):
            return failure("请完整填写 SAM（1–9）和 Confidence（1–7）。")
        if type(body.get("view_ms")) is not int or not 0 <= body["view_ms"] <= 604800000:
            return failure("Invalid viewing duration")
        if second:
            if body.get("explanation_version") != self.explanation_version:
                return failure("第二阶段版本已更新，请刷新。")
        else:
            if body.get("question_order") != question_order(rater, profile):
                return failure("题目顺序不匹配，请刷新。")
            if self.condition != "2D" and any(not isinstance(body.get(k), str) or not body[k].strip() or len(body[k]) > 2000 or "\x00" in body[k] for k in TEXT_FIELDS):
                return failure("请回答两道文字题（每题最多 2000 字）；无法判断时可直接说明。")
        await self.study.lock(f"sam:expert:{int(second)}:{mode}:{rater}")
        baseline = None
        if second:
            original = await self.rows(False, mode, rater)
            if not complete(original):
                return failure("请先完成新版第一阶段的全部 24 张评价。", 403)
            baseline = next(row for row in original if row["profile"] == profile)
        existing = await self.rows(second, mode, rater)
        answer_fields = numeric + ([] if second else [*(TEXT_FIELDS if self.condition != "2D" else []), "question_order"])
        same = lambda row: all(row[k] == body[k] for k in answer_fields)
        previous = next((row for row in existing if row["profile"] == profile), None)
        if previous:
            return reply({"ok": True, "already_saved": True}) if same(previous) else failure("该评分已保存，不会覆盖。请返回首页继续。", 409)
        order = [p for p in sequence(rater) if not second or p in self.stage2_profiles]
        done = {row["profile"] for row in existing}
        if profile != next((p for p in order if p not in done), None):
            return failure("进度已更新，请返回首页继续。", 409)
        index_order = [p for p in sequence(rater) if not second or p in self.stage2_index_profiles]
        row = {"mode": mode, "rater": rater, "profile": profile, "trial_index": index_order.index(profile) + 1,
               **{k: body[k] for k in answer_fields}, "view_ms": body["view_ms"], "submitted_at_utc": now(),
               "protocol": expected, self.hash_column: self.image_hash(profile)}
        if second:
            text = self.explanations()[profile]
            row.update(explanation_version=self.explanation_version, explanation_text=text, explanation_sha256=digest(text),
                       baseline_json=json.dumps(baseline, ensure_ascii=False, separators=(",", ":")))
        fields = list(row)
        await self.study.db.execute(f"INSERT INTO {self.tables[second]} ({','.join(fields)}) VALUES ({','.join(['%s'] * len(fields))}) ON CONFLICT DO NOTHING", tuple(row.values()))
        saved = next((r for r in await self.rows(second, mode, rater) if r["profile"] == profile), None)
        return reply({"ok": True}) if saved and same(saved) else failure("未确认保存，请重试。", 503)

    def export(self, data, second, mode, layout):
        from .api import csv_response, failure
        if layout not in ("long", "wide"):
            return failure("Invalid layout")
        baseline_fields = [*ATMOSPHERE, *INTENDED, "confidence", *(TEXT_FIELDS if self.condition != "2D" else []), "question_order", "protocol", "submitted_at_utc", "view_ms", self.hash_column]
        if self.condition == "2D":
            baseline_fields.append("atmosphere_confidence")
        fields = ["condition", "trial_index", *INTENDED, "confidence", "view_ms", "submitted_at_utc", "protocol", self.hash_column]
        if second:
            fields += ["explanation_version", "explanation_text", "explanation_sha256", *("baseline_" + k for k in baseline_fields)]
        else:
            fields += [*ATMOSPHERE, *(TEXT_FIELDS if self.condition != "2D" else []), "question_order"]
            if self.condition == "2D":
                fields.append("atmosphere_confidence")
        expanded = []
        for item in data:
            row = {k: v for k, v in item.items() if k != "baseline"}
            if second:
                row.update({"baseline_" + k: item["baseline"].get(k, "") for k in baseline_fields})
            expanded.append({**row, "condition": self.condition, "dominance_coding": CODING})
        if layout == "long":
            return csv_response(expanded, ["mode", "rater", "profile", *fields, "dominance_coding"], mode, "expert_stage2" if second else "expert_dual")
        wide = []
        for profile in self.stage2_profiles if second else PROFILES:
            row = {"profile": profile, "mode": mode, "dominance_coding": CODING}
            for rater in RATERS:
                item = next((r for r in expanded if r["rater"] == rater and r["profile"] == profile), {})
                row.update({f"{rater}_{k}": item.get(k, "") for k in fields})
            wide.append(row)
        return csv_response(wide, ["profile", "mode", "dominance_coding", *(f"{r}_{k}" for r in RATERS for k in fields)], mode, "expert_wide")


INSTRUMENT_2D = 'expert-2d-dual-v1'
PROTOCOL_2D = '2d-expert-atmosphere-intention-v2'
REASSESS_PROTOCOL_2D = '2d-expert-intention-explanations-v1'
# v2 (2026-11-12): explanations rewritten from interview transcripts using only the creators' own words.
# P6, P7 and P8 were withdrawn because their interviews contain no usable creator statements.
EXPLANATION_VERSION_2D = 'creator-explanations-20261112-2d-v2'
STAGE2_PROFILES_2D = ['P1','P2','P3','P5','P12','P22','P23','P24']
# Original 11-work list: stored trial_index keeps this numbering so earlier rows (kept but hidden) never collide.
STAGE2_INDEX_PROFILES_2D = ['P1','P2','P3','P5','P6','P7','P8','P12','P22','P23','P24']
EXPLANATION_SETTING_2D = 'expert_2d_explanations_v2'


class Expert2DStudy(ExpertStudy):
    instrument = INSTRUMENT_2D
    protocol = PROTOCOL_2D
    reassess_protocol = REASSESS_PROTOCOL_2D
    stage2_profiles = STAGE2_PROFILES_2D
    stage2_index_profiles = STAGE2_INDEX_PROFILES_2D
    explanation_version = EXPLANATION_VERSION_2D
    tables = {False: 'expert_2d_ratings', True: 'expert_2d_stage2_ratings'}
    condition = '2D'
    hash_column = 'image_sha256'

    def __init__(self, study):
        super().__init__(study)
        document = study.settings_documents.get(EXPLANATION_SETTING_2D)
        if (not isinstance(document, dict) or document.get('version') != self.explanation_version
                or set(document.get('explanations', {})) != set(self.stage2_profiles)
                or any(not isinstance(t, str) or not t.strip() for t in document['explanations'].values())):
            raise ValueError('2D expert explanation configuration missing or mismatched')
        self.creator_text = document['explanations']

    async def rows(self, second, mode, identity=None):
        # Withdrawn works stay in the database but are excluded from progress, results and exports.
        data = await super().rows(second, mode, identity)
        return [row for row in data if row['profile'] in self.stage2_profiles] if second else data

    def image_hash(self, profile):
        return self.study.catalog['media_hashes'][profile]['2D']

    def explanations(self):
        return self.creator_text

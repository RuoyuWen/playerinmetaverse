"""Public protocol contracts. Private assignments and explanations live in the database."""

import hashlib

RATERS = ["R1", "R2", "R3"]
PROFILES = [f"P{i}" for i in range(1, 25)]
BASE_PARTICIPANTS = [f"S{i:02}" for i in range(1, 61)]
# Extra group-link slots opened on 2026-11-11 (NZDT). Each reuses the fixed schedule of a base
# participant who had claimed but not finished. Both copies may finish; the researcher filters later.
REPLACEMENT_SOURCES = {f"S{61 + i}": source for i, source in enumerate(
    ["S04", "S06", "S08", "S11", "S15", "S16", "S30", "S39", "S41", "S44", "S45", "S46", "S50", "S55"])}
PARTICIPANTS = BASE_PARTICIPANTS + list(REPLACEMENT_SOURCES)
SCORES = ["valence", "arousal", "dominance", "confidence"]
STAGE2_PROFILES = ["P1", "P2", "P3", "P5", "P12", "P22", "P24"]
SHUFFLE_SEED = "sketch-sam-v1-low-to-high-control"
SKETCH_PROTOCOL = "sketch-sam-v2-image-only"
COHORT_PROTOCOL = "2d-sketch-60-image-only-v2"
STAGE2_PROTOCOL = "sketch-sam-stage2-explanations-v1"
EXPLANATION_VERSION = "creator-explanations-20261110-v1"
CODING = "1=Low control;9=High control"


def digest(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def schedule_source(participant):
    return REPLACEMENT_SOURCES.get(participant, participant)


def sequence(rater):
    return sorted(PROFILES, key=lambda profile: digest(f"{SHUFFLE_SEED}/{rater}/{profile}"))


def validate_catalog(catalog):
    expected = {
        "shuffle_seed": SHUFFLE_SEED, "sketch_protocol": SKETCH_PROTOCOL,
        "cohort_protocol": COHORT_PROTOCOL, "stage2_protocol": STAGE2_PROTOCOL,
        "explanation_version": EXPLANATION_VERSION,
    }
    if not isinstance(catalog, dict) or any(catalog.get(k) != v for k, v in expected.items()):
        raise ValueError("SAM protocol configuration mismatch")
    schedules = catalog.get("schedules", {})
    if set(schedules) != set(BASE_PARTICIPANTS):
        raise ValueError("SAM participant schedules are incomplete")
    allocations = {(p, c): 0 for p in PROFILES for c in ("2D", "Sketch")}
    for trials in schedules.values():
        if len(trials) != 12 or len({t["profile"] for t in trials}) != 12:
            raise ValueError("SAM schedule has invalid trial count")
        if any(sum(t["condition"] == c for t in trials) != 6 for c in ("2D", "Sketch")):
            raise ValueError("SAM schedule has invalid condition balance")
        for trial in trials:
            key = (trial["profile"], trial["condition"])
            if key not in allocations:
                raise ValueError("SAM schedule has an invalid stimulus")
            allocations[key] += 1
    if any(count != 15 for count in allocations.values()):
        raise ValueError("SAM allocations do not match the 60-person study")
    if set(catalog.get("explanations", {})) != set(STAGE2_PROFILES):
        raise ValueError("SAM second-stage explanations are incomplete")
    for profile in PROFILES:
        hashes = [catalog.get("sketch_hashes", {}).get(profile)]
        hashes += [catalog.get("media_hashes", {}).get(profile, {}).get(c) for c in ("2D", "Sketch")]
        if any(not isinstance(h, str) or len(h) != 64 for h in hashes):
            raise ValueError("SAM stimulus checksums are incomplete")


def validate_access(access):
    if not isinstance(access, dict):
        raise ValueError("SAM access configuration is incomplete")
    for family, required in (("sketch", RATERS + ["ADMIN"]), ("cohort", ["ADMIN"])):
        values = access.get(family, {})
        if any(not isinstance(values.get(role), str) or len(values[role]) != 64 for role in required):
            raise ValueError("SAM invitation hashes are incomplete")


def config(family, stage=1):
    result = {"protocol": COHORT_PROTOCOL if family == "cohort" else SKETCH_PROTOCOL,
              "total": 12 if family == "cohort" else 24,
              "dominance_low": "Low control", "dominance_high": "High control", "audio_version": "none"}
    if family == "sketch":
        result["dominance_coding"] = CODING
    if stage == 2:
        result.update(stage=2, protocol=STAGE2_PROTOCOL, total=7, profiles=STAGE2_PROFILES,
                      explanation_version=EXPLANATION_VERSION)
    return result

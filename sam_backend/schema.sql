-- Additive schema: historical rating fields remain text/integer, with their exact values.
CREATE TABLE IF NOT EXISTS sam_settings (
 key TEXT PRIMARY KEY,
 document JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS sketch_ratings (
 mode TEXT NOT NULL CHECK(mode IN ('production','test')),
 rater TEXT NOT NULL CHECK(rater IN ('R1','R2','R3')),
 profile TEXT NOT NULL,
 trial_index INTEGER NOT NULL,
 valence INTEGER NOT NULL CHECK(valence BETWEEN 1 AND 9),
 arousal INTEGER NOT NULL CHECK(arousal BETWEEN 1 AND 9),
 dominance INTEGER NOT NULL CHECK(dominance BETWEEN 1 AND 9),
 confidence INTEGER NOT NULL CHECK(confidence BETWEEN 1 AND 7),
 view_ms INTEGER NOT NULL,
 submitted_at_utc TEXT NOT NULL,
 protocol TEXT NOT NULL,
 sketch_sha256 TEXT NOT NULL,
 audio_version TEXT NOT NULL DEFAULT 'none',
 audio_ms INTEGER NOT NULL DEFAULT 0,
 audio_sha256 TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(mode,rater,profile)
);
CREATE TABLE IF NOT EXISTS cohort_ratings (
 mode TEXT NOT NULL CHECK(mode IN ('production','test')),
 participant TEXT NOT NULL,
 profile TEXT NOT NULL,
 condition TEXT NOT NULL CHECK(condition IN ('2D','Sketch')),
 trial_index INTEGER NOT NULL CHECK(trial_index BETWEEN 1 AND 12),
 valence INTEGER NOT NULL CHECK(valence BETWEEN 1 AND 9),
 arousal INTEGER NOT NULL CHECK(arousal BETWEEN 1 AND 9),
 dominance INTEGER NOT NULL CHECK(dominance BETWEEN 1 AND 9),
 confidence INTEGER NOT NULL CHECK(confidence BETWEEN 1 AND 7),
 view_ms INTEGER NOT NULL,
 audio_ms INTEGER NOT NULL,
 audio_version TEXT NOT NULL,
 submitted_at_utc TEXT NOT NULL,
 protocol TEXT NOT NULL,
 image_sha256 TEXT NOT NULL,
 audio_sha256 TEXT NOT NULL,
 PRIMARY KEY(mode,participant,profile),
 UNIQUE(mode,participant,trial_index)
);
CREATE TABLE IF NOT EXISTS cohort_claims (
 participant TEXT PRIMARY KEY,
 token_hash TEXT UNIQUE NOT NULL,
 claimed_at_utc TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sketch_stage2_ratings (
 mode TEXT NOT NULL CHECK(mode IN ('production','test')),
 rater TEXT NOT NULL CHECK(rater IN ('R1','R2','R3')),
 profile TEXT NOT NULL CHECK(profile IN ('P1','P2','P3','P5','P12','P22','P24')),
 trial_index INTEGER NOT NULL CHECK(trial_index BETWEEN 1 AND 7),
 valence INTEGER NOT NULL CHECK(valence BETWEEN 1 AND 9),
 arousal INTEGER NOT NULL CHECK(arousal BETWEEN 1 AND 9),
 dominance INTEGER NOT NULL CHECK(dominance BETWEEN 1 AND 9),
 confidence INTEGER NOT NULL CHECK(confidence BETWEEN 1 AND 7),
 view_ms INTEGER NOT NULL,
 submitted_at_utc TEXT NOT NULL,
 protocol TEXT NOT NULL,
 sketch_sha256 TEXT NOT NULL,
 explanation_version TEXT NOT NULL,
 explanation_text TEXT NOT NULL,
 explanation_sha256 TEXT NOT NULL,
 baseline_json TEXT NOT NULL CHECK(jsonb_typeof(baseline_json::jsonb) = 'object'),
 PRIMARY KEY(mode,rater,profile),
 UNIQUE(mode,rater,trial_index),
 FOREIGN KEY(mode,rater,profile) REFERENCES sketch_ratings(mode,rater,profile)
);

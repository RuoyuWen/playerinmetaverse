# SAM PostgreSQL service

The existing public API and invitation tokens are preserved. The service handles the 60-participant cohort, the three-rater first stage and the seven-work second stage. Schedules, media checksums, creator explanations and invitation hashes are private database configuration, not files in this public repository.

## Runtime

- `SAM_DATABASE_URL`: Neon PostgreSQL connection string for the `sam_app` role. Store only in Render's secret environment configuration.
- `SAM_BACKEND=sites`: default during preparation; continues the existing service.
- `SAM_BACKEND=migrate`: checks the destination's verified activation marker. Until activation, forwards to the source. Once the verified import commits, serves PostgreSQL directly. Database errors return 503; they never trigger a fallback to the old data store.
- `SAM_BACKEND=postgres`: direct PostgreSQL operation after migration.
- `SAM_WRITE_PAUSED=1`: optional operator pause for public POST requests; GET access is preserved.

Connections are pooled with a maximum of eight per worker and a minimum of zero. Idle excess connections close after 60 seconds. Prepared statements are disabled for compatibility with a Neon pooled connection. Each submission is transactional and the response is returned only after commit. Transaction-scoped advisory locks protect claim allocation and per-rater submission order. Duplicate submissions compare the saved values; existing scores cannot be replaced. The runtime database role needs SELECT on configuration/study tables and INSERT on study tables, with no UPDATE/DELETE grants.

`GET /api/sam/health` reports `storage=postgresql` only when the verified dataset is active. In preparation mode, it reports `migration_target=postgresql` and `migration_target_ready=false` while the existing source still serves the study.

## Owner migration procedure

1. Deploy this code without changing the current backend setting. Prepare a Neon project in the same region as Render, initialize the schema/private catalog with a non-final migration bundle, and configure the limited `sam_app` role.
2. In Render, set `SAM_DATABASE_URL` and `SAM_BACKEND=migrate`. Confirm the preparation-mode health marker. The source remains writable and authoritative at this point.
3. The original Worker has a separate, temporary owner-only transfer API. After its SQL write guard has been deployed and older requests drained, freeze source writes. The SQL guard blocks even an in-flight request that passed the earlier request-level check.
4. Fetch the authenticated frozen snapshot. Keep all data, invitation hashes and backups outside this repository. Compute and validate the complete source manifest.
5. Run `python -m sam_backend.migration <private-bundle.json> --final --hidden-credentials` with the owner connection string entered at the hidden prompt. The importer inserts without overwriting, compares every row/column and table checksum, and sets the activation marker in the same transaction only after complete verification. Any mismatch rolls back.
6. Verify the public health response, authorization, all table counts and immutable metadata. Retire the old source, remove its temporary owner credential and keep the frozen database/snapshot as an archive.

Before activation, a failed import leaves the source authoritative and can be rolled back by the owner-only pre-activation resume command. After activation, never unfreeze or switch back without reconciling any new PostgreSQL writes. The importer refuses further imports into an active database.

## Verification

Use a disposable LOCAL PostgreSQL instance via `SAM_TEST_DATABASE_URL`, then run `python -m unittest test_sam_postgres test_sam_proxy -v`. The tests refuse a remote integration-test database. They cover concurrent claims, full capacity/recovery, all 720 cohort scores, both psychologist stages, immutable historical metadata, source/target checksum verification, activation gating and export compatibility. Test data is synthetic and confined to random local schemas. No production invitation keys or ratings belong in this repository.

## Versioned expert questionnaire (2026-11-11)

`expert.py` handles sketch requests carrying `instrument=expert-dual-v1`. Apply the additive `expert_schema.sql`, then grant SELECT and INSERT on `expert_ratings` and `expert_stage2_ratings` to `sam_app` before publishing the new frontend. Earlier tables and cohort routes are unchanged. New first-stage ratings store separate `atmosphere_*` and `intended_*` dimensions, Confidence, both qualitative answers and validated presentation order. New second-stage ratings refer only to a complete new first stage and save intended-emotion reassessments with a server-generated full baseline snapshot. The old migration importer is a retired one-time tool, not an ongoing backup mechanism; backups of the active service must include the two new tables.

Run `python -m unittest test_expert_sam test_sam_postgres test_sam_proxy -v` against a disposable local PostgreSQL instance.

## 2D expert condition (2026-11-11)

The current frontend uses `instrument=expert-2d-dual-v1`. Apply `expert_2d_schema.sql` additively and grant SELECT/INSERT on both new tables to `sam_app`. Populate the private `sam_settings.expert_2d_explanations` document with version `creator-explanations-20261111-2d-v1` and the eleven researcher-provided creator texts. Missing/mismatched configuration fails closed only for the 2D instrument. The original catalog and both earlier Sketch instruments remain intact. The first stage still contains all 24 works; the second contains P1/P2/P3/P5/P6/P7/P8/P12/P22/P23/P24. Both stages bind image_sha256 to the catalog's original 2D media hash; exports explicitly identify the condition. Explanations are served only after a complete 2D baseline and are snapshotted on reassessment. Active backups must include the two new tables and private setting.

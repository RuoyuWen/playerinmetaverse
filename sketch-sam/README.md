# Expert SAM study

Entry: https://playerinmetaverse.tech/sketch-sam/

Three invited experts independently rate 24 original 2D landscape images in their existing fixed shuffled order. GitHub Pages serves the frontend and images; the existing Render API reads/writes Neon PostgreSQL. The frozen Sites database is an archive only. Both public API hostnames reach the same current database. Invitations and identity restrictions are unchanged.

## New instrument — 2026-11-11

The frontend uses `expert-app.js` and `instrument=expert-2d-dual-v1`; the cohort continues to use the separate, unchanged `app.js` and cohort API.

Each first-stage image has two sequential question groups:

- “What emotional atmosphere does this landscape convey to you?” — atmosphere Valence / Arousal / Dominance (1–9).
- “What emotion do you think the creator intended to express through this landscape?” — intended Valence / Arousal / Dominance (1–9).

The server assigns and validates the order using profile number plus rater index parity. Each expert has 12 images in each order; each work has a 2/1 split across experts. The second group is hidden until all three first-group scores are chosen. The actual `question_order` is stored with the response. Scores are never prefilled.

After both groups, collect Confidence (1–7) for the intended-emotion interpretation, plus the exact visual-elements and possible-personal-meaning questions. Both text answers are required, up to 2000 characters each; “cannot infer” or “none” is valid for personal meaning. Unsubmitted numeric answers, text and group position are saved locally under the new protocol. Submit, resume and retries preserve the full response without overwriting saved data.

## Explanation-informed reassessment

Complete all 24 **new** first-stage images to unlock `stage2.html`. Existing legacy completion does not unlock it. The second stage includes P1, P2, P3, P5, P6, P7, P8, P12, P22, P23 and P24 (11 works; 33 total reassessments). Use the creator explanations supplied on 2026-11-11, kept in the private `expert_2d_explanations` database setting. Explanations never ship in public frontend/source files. Preserve the works' relative order in each expert's existing shuffled sequence.

The image and creator explanation appear alongside that expert's own first-stage **intended-emotion** scores (read-only). Ask: “After reading the creator's explanation, what emotion do you think the creator intended to express?” Collect intended Valence / Arousal / Dominance (1–9) and Confidence (1–7) again, with no preselected answers. The server saves its own complete baseline snapshot, creator text and explanation checksum; client-supplied baseline/text are ignored.

## Data versions and access

- New data is stored in `expert_2d_ratings` and `expert_2d_stage2_ratings`, protocols `2d-expert-atmosphere-intention-v1` and `2d-expert-intention-explanations-v1`.
- Earlier `sketch_ratings`, `sketch_stage2_ratings`, `expert_ratings` and `expert_stage2_ratings` remain unchanged; results provide separate Sketch-original and Sketch-dual selectors. All experts begin the new instrument from zero; no earlier scores are relabelled as a new construct.
- Researcher results default to the new instrument, with an explicit legacy-data selector. New long/wide CSV exports identify the 2D condition and original image SHA256 (not a Sketch checksum), and include both SAM groups, qualitative answers, question order and, for stage 2, the complete original baseline and explanation.
- Test and production are separate. ADMIN can submit only in test mode; experts can access only their own sessions; only ADMIN may view/export aggregate results.
- Audio remains removed. DOM rendering uses textContent for expert responses and explanations. Invitation keys, rating exports, private catalogs and database credentials must never be committed.

## Verification

`python -m unittest test_expert_2d_sam test_expert_sam test_sam_postgres test_sam_proxy -v` uses a disposable LOCAL `SAM_TEST_DATABASE_URL`; checks cover all 72 2D first-stage and 33 reassessment responses, counterbalance, legacy preservation, gating, permissions, strict validation, idempotent retries and both CSV layouts. The seven transport tests also passed. Browser QA used only a separate local synthetic database and checked sequential groups, blank scores, text input, pause/draft restoration, save/next, explanation context, reassessment and versioned results. No production enrollment or rating was created for QA.

All 24 local 2D image hashes were compared with the private media catalog. Browser QA additionally verified actual `/study-media/2d/` images in both observation and scoring views, the revised creator text, 11-work progress, blank reassessment scores, successful save/next and the 33-response results denominator. Original image files, cohort tasks, SAM question wording, confidence scale, counterbalance, invitation keys and resume behavior are unchanged.

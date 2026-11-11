# 2D / Sketch SAM — 60 participants

## Current image-only presentation

All SAM entry points now show images only: no player, headphone instruction, audio request, or playback requirement. New cohort rows use `2d-sketch-60-image-only-v2`, `audio_version=none`, `audio_ms=0`, and an empty audio checksum. Existing audio-enabled rows keep their original scores, protocol and audio metadata; exports retain these fields. Assignments, participant keys and saved progress are unchanged. A participant who resumes after the change may have rows from both versions; analyze rows using their recorded protocol.

## No-enrollment demo

Use `https://playerinmetaverse.tech/2d-sketch-sam/demo.html` for testing without reserving a slot. It uses the same image viewer and SAM UI with a separate browser-local adapter, not `auth.js`. It makes no research-backend requests, stores only demo-local progress (`self-scape-demo-local-silent-v2` / `demo-local-silent-v2` draft namespace), and can reset without clearing real credentials or drafts. No invitation or ADMIN key is required. Demo ratings are not cloud-saved or available in researcher exports.

## Extra slots S61–S74 (2026-11-11)

All 60 original slots had been claimed, and 14 claimants had not finished (S04, S06, S08, S11, S15, S16, S30, S39, S41, S44, S45, S46, S50, S55). The group link now hands out 14 extra slots, S61–S74, each reusing the fixed schedule of one of these participants. When a new person joins after the original 60 are gone, the server gives out the extra slot whose source participant has the least progress; a slot whose source has since finished all 12 trials is not handed out. Original claimants keep their tokens and can still finish. A schedule may therefore end up completed twice; the cohort export and assignments CSV include `schedule_source` so duplicates can be filtered before analysis. Assignments of S01–S60 and all saved scores are unchanged.

Round 2 (2026-11-11 16:26 NZDT): five schedules were still not completed by anyone (S11, S30, S44, S46, S50). S75–S79 reuse these schedules. Allocation now skips any extra slot whose schedule has already been completed by anyone (the original holder or any earlier extra slot), and hands out the schedule with the least best progress first.

## Group recruitment

Share `https://playerinmetaverse.tech/2d-sketch-sam/join.html`. Page previews and GET requests do not allocate slots. Only an explicit confirmed button click POSTs a browser-generated 192-bit recovery token. An IndexedDB read/write transaction creates one token across simultaneous tabs; a single atomic SQL statement reserves one unused participant. The server stores only its SHA256. Repeated requests and returning browsers recover the same task, even when capacity is full. Already-started production tasks are excluded from allocation. Claim records are never auto-recycled. The original 60 schedules and SAM scales stay unchanged.

This is browser-level deduplication, not person verification or bot protection: clearing storage, private browsing or switching devices without restoring the recovery code may consume another slot. Participants can save their private recovery code and restore it on the join page. Do not distribute independent invitations alongside the group link; keep the researcher ADMIN link private. No email, name or IP address is stored by application code. Researcher results show claimed/started/completed counts; token hashes are never returned in results.

S41–S60 were appended without changing S01–S40 assignments, existing invitations, or saved scores. Capacity is 720 ratings; historical audio-enabled rows retain their original protocol identifier.

Each S01–S60 has a fixed random mixture of six 2D and six Sketch trials from twelve different P1–P24 works. Across the complete allocation each work appears fifteen times in each condition. Allocation is server-side, remains unchanged, and resumes from confirmed submissions.

Both conditions display the original images only. The stimulus image remains visible during scoring.

## Image loading

After the current image loads, the viewer downloads only the next unfinished trial's original image in the background with low fetch priority. The current image has high fetch priority. Prefetched images are detached from the page and do not start observation timing or appear before their turn. Pausing cancels the pending prefetch; resuming uses the server-confirmed order and progress. This applies to the cohort, local demo and shared three-rater viewer.

Images still come directly from GitHub Pages, independently of the Render API ingress. The 24 original 2D PNGs total 71,637,119 bytes (2,261,596–3,794,474 bytes each). Prefetching can reduce waits between trials, but the first image and slow cross-border transfers still depend on the participant's connection. Original stimulus files, checksums, assignments and protocol identifiers are unchanged.

Validation (2026-11-10): JavaScript syntax and all seven transport checks passed. An offline viewer workflow checked mixed-condition URLs, skipping completed trials, no early display or observation timing, one pending prefetch, pause cancellation, image-error gating and the final trial. No participant was enrolled or submitted during validation. Mainland loading speed still requires verification on a participant's own connection.

SAM valence/arousal/dominance = 1–9, confidence = 1–7. Rate the emotion communicated by the work, not the viewer's own current mood. Dominance runs low-control to high-control.

The public frontend is hosted by GitHub Pages; authenticated submissions persist in the existing Sites D1 backend, in a separate `cohort_ratings` table. Test/production data are separate. Invite tokens are never committed. Each participant's bearer invitation restricts access to their own task. Researcher invitation is separate and exports ratings and all assignments. Treat invitations like passwords; distribute only one participant's link at a time.

The `/sketch-sam/` three-rater task also uses image-only presentation for new submissions (`sketch-sam-v2-image-only`). Original shuffle orders are preserved. Historical audio-enabled rows remain unchanged.

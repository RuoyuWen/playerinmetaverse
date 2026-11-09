# 2D / Sketch SAM — 60 participants

## No-enrollment demo

Use `https://playerinmetaverse.tech/2d-sketch-sam/demo.html` for testing without reserving a slot. It uses the same viewer, audio and SAM UI with a separate browser-local adapter, not `auth.js`. It makes no research-backend requests, stores only demo-local progress (`self-scape-demo-local-v1` / `demo-local-v1` draft namespace), and can reset without clearing real credentials or drafts. No invitation or ADMIN key is required. Demo ratings are not cloud-saved or available in researcher exports.

## Group recruitment

Share `https://playerinmetaverse.tech/2d-sketch-sam/join.html`. Page previews and GET requests do not allocate slots. Only an explicit confirmed button click POSTs a browser-generated 192-bit recovery token. An IndexedDB read/write transaction creates one token across simultaneous tabs; a single atomic SQL statement reserves one unused participant. The server stores only its SHA256. Repeated requests and returning browsers recover the same task, even when capacity is full. Already-started production tasks are excluded from allocation. Claim records are never auto-recycled. The original 60 schedules, scale protocol, SAM guidance and audio stay unchanged.

This is browser-level deduplication, not person verification or bot protection: clearing storage, private browsing or switching devices without restoring the recovery code may consume another slot. Participants can save their private recovery code and restore it on the join page. Do not distribute independent invitations alongside the group link; keep the researcher ADMIN link private. No email, name or IP address is stored by application code. Researcher results show claimed/started/completed counts; token hashes are never returned in results.

S41–S60 were appended without changing S01–S40 assignments, existing invitations, or saved scores. Capacity is 720 ratings; the historical protocol identifier retains `40` for compatibility.

Each S01–S60 has a fixed random mixture of six 2D and six Sketch trials from twelve different P1–P24 works. Across the complete allocation each work appears fifteen times in each condition. Allocation is server-side, immutable under `2d-sketch-40-mixed-audio-v1`, and resumes from confirmed submissions.

Both conditions play the matching work's original `2D/sound_effect.mp3` on loop. Explicit playback is required before rating. Audio pauses for the SAM screen, navigation, or hidden tabs. The stimulus image remains visible during scoring. Headphones and audible volume must be checked by the participant: browser playback duration is not proof of actual acoustic exposure.

SAM valence/arousal/dominance = 1–9, confidence = 1–7. Rate the emotion communicated by the work, not the viewer's own current mood. Dominance runs low-control to high-control.

The public frontend is hosted by GitHub Pages; authenticated submissions persist in the existing Sites D1 backend, in a separate `cohort_ratings` table. Test/production data are separate. Invite tokens are never committed. Each participant's bearer invitation restricts access to their own task. Researcher invitation is separate and exports ratings and all assignments. Treat invitations like passwords; distribute only one participant's link at a time.

The existing `/sketch-sam/` three-rater task also uses matched audio for new submissions. Previously saved silent rows remain unchanged and have `audio_version=none`. Never silently combine these as a single protocol.

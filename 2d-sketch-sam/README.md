# 2D / Sketch SAM — 40 participants

Each S01–S40 has a fixed random mixture of six 2D and six Sketch trials from twelve different P1–P24 works. Across the complete allocation each work appears ten times in each condition. Allocation is server-side, immutable under `2d-sketch-40-mixed-audio-v1`, and resumes from confirmed submissions.

Both conditions play the matching work's original `2D/sound_effect.mp3` on loop. Explicit playback is required before rating. Audio pauses for the SAM screen, navigation, or hidden tabs. The stimulus image remains visible during scoring. Headphones and audible volume must be checked by the participant: browser playback duration is not proof of actual acoustic exposure.

SAM valence/arousal/dominance = 1–9, confidence = 1–7. Rate the emotion communicated by the work, not the viewer's own current mood. Dominance runs low-control to high-control.

The public frontend is hosted by GitHub Pages; authenticated submissions persist in the existing Sites D1 backend, in a separate `cohort_ratings` table. Test/production data are separate. Invite tokens are never committed. Each participant's bearer invitation restricts access to their own task. Researcher invitation is separate and exports ratings and all assignments. Treat invitations like passwords; distribute only one participant's link at a time.

The existing `/sketch-sam/` three-rater task also uses matched audio for new submissions. Previously saved silent rows remain unchanged and have `audio_version=none`. Never silently combine these as a single protocol.

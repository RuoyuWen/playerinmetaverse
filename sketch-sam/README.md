# Sketch SAM online study

Entry: https://playerinmetaverse.tech/sketch-sam/

Three invited raters independently evaluate all 24 Sketch images. Each has a fixed shuffled order. The interface preserves the original Study 2 visual style and uses three 9-point SAM dimensions plus 7-point confidence.

## Current image-only presentation

There is no audio player, audio download or playback requirement. New scores use `sketch-sam-v2-image-only`, `audio_version=none`, zero audio duration and an empty audio checksum. The original shuffle seed is preserved so assignments do not change. Existing scores and their protocol/audio metadata remain untouched; historical audio-enabled and current image-only rows must be distinguished in exports.

## Access and persistence

- Each rater receives a private invitation link from the researcher. The key is passed in the URL fragment, removed from the address bar immediately, and used only as a bearer credential to the protected API.
- Raters cannot select someone else's identity or access aggregate results and downloads.
- Ratings are stored centrally in Cloudflare D1 through the separately deployed Sites backend; GitHub Pages only hosts this frontend and the study images.
- Production and test data are stored separately. Retries do not create duplicates; existing scores are not silently overwritten.
- Saved progress follows the invitation across browsers/devices. Unsubmitted drafts are local to the browser.
- Only the researcher invitation can open `results.html` and download long-form or wide-form CSV. ADMIN can practice in test mode but cannot submit production ratings.
- Dominance coding: 1 = Low control, 9 = High control. This direction is included in exports and the protocol ID.

Invitation keys, exported ratings and local databases must never be committed to this repository.

Backend origin is `https://sam-api.playerinmetaverse.tech`, configured in `auth.js`; recruitment uses the same origin in `../2d-sketch-sam/join.js`. It routes to the same existing Sites service and D1 database. DNS setup is documented in `../2d-sketch-sam/DNS_SETUP.md`.

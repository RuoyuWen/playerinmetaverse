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

`transport.js` uses `https://sam-api.playerinmetaverse.tech` first, with the existing Render ingress (`https://chi-backend-jif6.onrender.com`) as an automatic fallback for network failures, primary timeouts or HTML provider-block pages. JSON authorization errors are returned unchanged. Both routes use the same existing Sites service, D1 database and invitation keys; retries preserve the exact token and submitted body. Recruitment and authenticated requests share this transport. DNS setup is documented in `../2d-sketch-sam/DNS_SETUP.md`; the Render ingress is documented in `../2d-sketch-sam/RENDER_INGRESS.md`.
## 第二阶段：解释后的复评（2026-11-10）

三位 psychologists 各自完成第一阶段的全部 24 张正式评价后，首页及完成页会出现「进入第二阶段评价」按钮。沿用原邀请链接和编号，无需新邀请码；第二阶段页面为 `stage2.html`。第二阶段包含 P1、P2、P3、P5、P12、P22、P24，沿用该 Rater 第一阶段随机顺序中的相对顺序。

每张展示原 Sketch、创作者解释及该 Rater 本人第一阶段的四项评分（只读）。解释从已授权的后台 session 返回，第一阶段未完成时服务端不返回解释或原评分。Valence / Arousal / Dominance / Confidence 需要重新选择，不预填原评分；可以维持原判断或调整。暂停续填使用独立的第二阶段草稿。

复评分使用 `sketch-sam-stage2-explanations-v1`，解释版本为 `creator-explanations-20261110-v1`；保存到独立的 `sketch_stage2_ratings` 表，保留展示的解释原文、校验值和完整第一阶段评分快照。第一阶段已有数据保持原样。观察时长记录图片加载后、观察页可见的时间（包含阅读解释，不含评分页停留时间）。研究者结果页增加阶段选择，第二阶段长表和宽表都包含原评分与复评分。正式与测试数据分别保存；研究者测试第二阶段也需要先完成对应 Rater 的测试版第一阶段。此环节仅用于三位 Rater，不向 60 人的 2D / Sketch 问卷添加。

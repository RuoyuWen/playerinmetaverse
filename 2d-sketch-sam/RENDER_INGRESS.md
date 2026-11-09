# SAM public ingress on the existing Render backend

The Sites security layer blocked an affected participant before the request reached the study Worker, including on its custom hostname. The same participant confirmed that the existing Render service's `/health` response is reachable.

`sam_proxy.py` adds only fixed SAM routes to the existing FastAPI application. It forwards invitation authorization, query parameters and request bodies to the original storage hostname. The upstream remains `https://self-scape-sketch-sam-data.christianqaq.chatgpt.site`, so moving the public hostname cannot create a forwarding loop. It does not copy the database or change invitation keys, participant assignments, scores or protocol identifiers.

No arbitrary URL proxying, cookies or client IP forwarding are supported. The original Worker remains responsible for participant/researcher authorization, duplicate protection and persistence. Upstream redirects or HTML security/error pages produce a readable 503 response; POST requests are not automatically retried. CSV downloads preserve Content-Disposition. The existing chatbot/game/survey routes remain in place.

## Validate the deployed bridge before changing DNS

1. `GET https://chi-backend-jif6.onrender.com/api/sam/health` must return the existing image-only study protocols.
2. GET `/api/cohort/auth` without a credential must return JSON 401.
3. POST `/api/cohort/join` with `{}` must return JSON 400 without reserving a slot.
4. OPTIONS from `https://playerinmetaverse.tech` must accept Authorization and Content-Type.
5. Add `sam-api.playerinmetaverse.tech` as a custom domain on this existing Render service. Follow Render's returned DNS/certificate instructions; do not change the apex or www records.
6. Switch the sam-api DNS record only after Render confirms its domain setup. Verify valid HTTPS, the bridge health endpoint and the same non-enrolling API checks through the custom hostname.

The frontend uses `https://sam-api.playerinmetaverse.tech` as its primary origin. `../sketch-sam/transport.js` automatically retries a network failure, primary timeout or HTML provider-block page once on the deployed Render ingress. JSON API authorization errors do not trigger fallback. The exact same token, authorization and request body are reused, preserving the existing service's idempotent join/submission behavior. No stored recovery code or browser storage namespace changes.

The public Render bridge and `sam-api.playerinmetaverse.tech` have both passed health, non-enrolling invalid-join, unauthorized-auth/export and CORS checks. On 2026-11-10 (Pacific/Auckland), both the authoritative Aliyun DNS and a public resolver returned `chi-backend-jif6.onrender.com` as the CNAME target; HTTPS and the custom hostname's `/api/sam/health` were verified. The custom-domain reassignment is complete. Mainland participants still need to retry the actual study in their original browser to confirm their full browser-to-service path.

Tests: `python -m unittest test_sam_proxy -v` (mock upstream only; no production enrollments or ratings).

Transport checks: `node --test sketch-sam/transport.test.cjs` (mock fetch only; no production requests).

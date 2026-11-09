# SAM backend custom domain

Status: Public ingress moved to the existing Render service, with valid HTTPS verified on 2026-11-10 (Pacific/Auckland). The custom hostname passed bridge health, preflight, invalid-join and unauthorized auth/export checks without creating any production records.

- Frontend: `https://playerinmetaverse.tech/2d-sketch-sam/`
- Backend: `https://sam-api.playerinmetaverse.tech`
- Public ingress: existing Render service `chi-backend-jif6.onrender.com`.
- Storage: the same existing Sites project and D1 database; no data migration or credential replacement.
- Storage project: `appgprj_6af0fa29192c8191900ccfe4096c30bf`.
- Historical Sites domain binding: `appgdom_6af1ac5d56148191bbe30e53fa8d6ccd`; the public DNS no longer points there.

## Aliyun DNS records

The active record inside the `playerinmetaverse.tech` zone is below. Use the default TTL and default resolution line. Existing apex and `www` records are unchanged.

| Type | Host | Value |
| --- | --- | --- |
| CNAME | `sam-api` | `chi-backend-jif6.onrender.com` |

The following historical verification records from the original Sites binding may remain; they are not the active routing record. Do not restore the old CNAME target.

| Type | Host | Historical value |
| --- | --- | --- |
| TXT | `_openai-site-verification.sam-api` | `openai-site-verification=gc-btBvDPY5sMUaQkEOA12bPd1Vk068koV1BX1Ji4iE` |
| TXT | `_cf-custom-hostname.sam-api` | `1fd6becd-e81e-4fec-80e1-ee8211daa340` |

Domain verification and certificate management for the public hostname now take place in the existing Render service's Settings / Custom Domains panel. See `RENDER_INGRESS.md` for the fixed-destination bridge and automatic fallback.

## Cutover checks

1. The Render custom domain has valid HTTPS.
2. `GET https://sam-api.playerinmetaverse.tech/api/sam/health` returns the existing service's image-only protocols. The root `/health` is the existing Render application's generic health check.
3. Cross-origin OPTIONS from `https://playerinmetaverse.tech` accepts Authorization and Content-Type for GET and POST.
4. POST `/api/cohort/join` with an invalid diagnostic token returns a readable 400 response without allocating a participant.
5. Recruitment, study and results entries use the shared transport with this hostname first and the same Render service's default hostname as a network-failure fallback. Do not create production test enrollments.

Existing browser recovery tokens and researcher invitations remain valid because the backend database and verification secrets are unchanged. The browser will address the custom hostname; the backing hosting infrastructure remains the same. Mainland connectivity still needs to be checked from an affected participant's network.

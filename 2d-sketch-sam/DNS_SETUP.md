# SAM backend custom domain

Status: Domain and TLS certificate active, verified on 2026-11-10 (Pacific/Auckland). Health, GET/POST preflight and non-enrolling API checks passed before frontend cutover.

- Frontend: `https://playerinmetaverse.tech/2d-sketch-sam/`
- Backend: `https://sam-api.playerinmetaverse.tech`
- Same existing Sites project and D1 database; no data migration or credential replacement.
- Sites project: `appgprj_6af0fa29192c8191900ccfe4096c30bf`
- Domain binding: `appgdom_6af1ac5d56148191bbe30e53fa8d6ccd`

## Aliyun DNS records

Add these records inside the `playerinmetaverse.tech` zone. Host names below are relative to that zone. Use the default TTL and default resolution line. Existing apex and `www` records are unchanged.

| Type | Host | Value |
| --- | --- | --- |
| CNAME | `sam-api` | `custom-domains.chatgpt.site` |
| TXT | `_openai-site-verification.sam-api` | `openai-site-verification=gc-btBvDPY5sMUaQkEOA12bPd1Vk068koV1BX1Ji4iE` |
| TXT | `_cf-custom-hostname.sam-api` | `1fd6becd-e81e-4fec-80e1-ee8211daa340` |

Retain verification records after activation. Refresh the Sites domain status after public DNS resolves; if the certificate provider returns additional non-empty validation records, add those exact records before proceeding.

## Cutover checks

1. The Sites custom domain is active and its TLS certificate is valid.
2. `GET https://sam-api.playerinmetaverse.tech/health` returns the existing service's image-only protocols.
3. Cross-origin OPTIONS from `https://playerinmetaverse.tech` accepts Authorization and Content-Type for GET and POST.
4. POST `/api/cohort/join` with an invalid diagnostic token returns a readable 400 response without allocating a participant.
5. Publish the prepared frontend change, then verify recruitment, study and results entries load the updated scripts. Do not create production test enrollments.

Existing browser recovery tokens and researcher invitations remain valid because the backend database and verification secrets are unchanged. The browser will address the custom hostname; the backing hosting infrastructure remains the same. Mainland connectivity still needs to be checked from an affected participant's network.

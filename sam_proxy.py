"""SAM API ingress with a legacy bridge and a verified PostgreSQL cutover."""

import logging
import os

import httpx
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# Keep the storage hostname fixed: the public sam-api hostname may point at Render.
SAM_STORAGE_ORIGIN = "https://self-scape-sketch-sam-data.christianqaq.chatgpt.site"
MAX_REQUEST_BYTES = 16384
ROUTES = {
    "/api/sam/health": ("GET", "/health"),
    "/api/cohort/join": ("POST", "/api/cohort/join"),
    "/api/cohort/auth": ("GET", "/api/cohort/auth"),
    "/api/cohort/status": ("GET", "/api/cohort/status"),
    "/api/cohort/session": ("GET", "/api/cohort/session"),
    "/api/cohort/results": ("GET", "/api/cohort/results"),
    "/api/cohort/export.csv": ("GET", "/api/cohort/export.csv"),
    "/api/cohort/assignments.csv": ("GET", "/api/cohort/assignments.csv"),
    "/api/cohort/submit": ("POST", "/api/cohort/submit"),
    "/api/auth": ("GET", "/api/auth"),
    "/api/status": ("GET", "/api/status"),
    "/api/session": ("GET", "/api/session"),
    "/api/results": ("GET", "/api/results"),
    "/api/export.csv": ("GET", "/api/export.csv"),
    "/api/submit": ("POST", "/api/submit"),
}


def storage_client():
    return httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=8.0), follow_redirects=False)


def unavailable():
    return JSONResponse(
        {"error": "暂时无法连接研究数据服务。请保留当前浏览器和恢复码，稍后重试。"},
        status_code=503,
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )


async def forward_sam_request(request: Request):
    # Routes are literal and fixed; clients cannot choose an upstream host or URL.
    _, upstream_path = ROUTES[request.url.path]
    body = bytearray()
    async for chunk in request.stream():
        if len(body) + len(chunk) > MAX_REQUEST_BYTES:
            return JSONResponse({"error": "Request too large"}, status_code=413)
        body.extend(chunk)

    if request.method == "POST" and os.getenv("SAM_WRITE_PAUSED") == "1":
        return JSONResponse({"error": "数据迁移中，当前选择已保留，请稍后重试。"}, status_code=503,
                            headers={"Cache-Control": "no-store", "Retry-After": "15"})
    backend = os.getenv("SAM_BACKEND", "sites")
    migration_prepared = False
    if backend == "migrate":
        from sam_backend.api import target_is_ready
        try:
            backend = "postgres" if await target_is_ready() else "sites"
            migration_prepared = backend == "sites"
        except Exception as exc:
            logger.warning("SAM migration target unavailable (%s)", type(exc).__name__)
            return unavailable()
    if backend == "postgres":
        from sam_backend.api import handle_request
        return await handle_request(request, bytes(body))
    if backend != "sites":
        return unavailable()

    # Do not forward cookies, client IP headers, Host, or upstream CORS headers.
    headers = {
        name: request.headers[name]
        for name in ("authorization", "content-type", "accept")
        if name in request.headers
    }
    try:
        async with storage_client() as client:
            upstream = await client.request(
                request.method,
                SAM_STORAGE_ORIGIN + upstream_path,
                params=list(request.query_params.multi_items()),
                headers=headers,
                content=bytes(body),
            )
    except httpx.HTTPError as exc:
        # Never log authorization values or submitted bodies.
        logger.warning("SAM storage request failed (%s)", type(exc).__name__)
        return unavailable()

    content_type = upstream.headers.get("content-type", "")
    if upstream.is_redirect or not content_type.lower().startswith(("application/json", "text/csv")):
        return unavailable()

    response_headers = {
        "Content-Type": content_type,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-SAM-Ingress-Revision": "20261110-postgres-v1",
    }
    if migration_prepared and request.url.path == "/api/sam/health" and upstream.is_success:
        data = upstream.json()
        data.update(migration_target="postgresql", migration_target_ready=False)
        return JSONResponse(data, headers=response_headers)
    if "content-disposition" in upstream.headers:
        response_headers["Content-Disposition"] = upstream.headers["content-disposition"]
    return Response(content=upstream.content, status_code=upstream.status_code, headers=response_headers)


for public_path, (method, _) in ROUTES.items():
    router.add_api_route(public_path, forward_sam_request, methods=[method], include_in_schema=False)


@router.on_event("shutdown")
async def shutdown_sam_connections():
    from sam_backend.api import close_connections
    await close_connections()

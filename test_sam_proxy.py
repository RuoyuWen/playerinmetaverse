import unittest
from unittest.mock import patch

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sam_proxy import MAX_REQUEST_BYTES, SAM_STORAGE_ORIGIN, router


class SamIngressTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.app = FastAPI()
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["https://playerinmetaverse.tech"],
            allow_methods=["GET", "POST"],
            allow_headers=["Authorization", "Content-Type"],
            expose_headers=["Content-Disposition"],
        )
        self.app.include_router(router)

    async def call(self, method, path, handler, **kwargs):
        def upstream_client():
            return httpx.AsyncClient(transport=httpx.MockTransport(handler))

        async with httpx.AsyncClient(transport=httpx.ASGITransport(self.app), base_url="https://ingress.example") as client:
            with patch("sam_proxy.storage_client", side_effect=upstream_client):
                return await client.request(method, path, **kwargs)

    async def test_fixed_destination_preserves_auth_and_query_without_forwarding_client_identity(self):
        def handler(request):
            self.assertEqual(str(request.url), SAM_STORAGE_ORIGIN + "/api/cohort/session?rater=S03&mode=production")
            self.assertEqual(request.headers["authorization"], "Bearer " + "a" * 32)
            for header in ["cookie", "x-forwarded-for", "origin"]:
                self.assertNotIn(header, request.headers)
            return httpx.Response(200, json={"completed": ["P1"]}, headers={"Set-Cookie": "upstream=private"})

        response = await self.call("GET", "/api/cohort/session?rater=S03&mode=production", handler, headers={
            "Authorization": "Bearer " + "a" * 32,
            "Cookie": "local=private",
            "X-Forwarded-For": "192.0.2.1",
            "Origin": "https://playerinmetaverse.tech",
        })
        self.assertEqual(response.json(), {"completed": ["P1"]})
        self.assertEqual(response.headers["access-control-allow-origin"], "https://playerinmetaverse.tech")
        self.assertNotIn("set-cookie", response.headers)
        self.assertEqual(response.headers["cache-control"], "no-store")

    async def test_join_and_submit_bodies_are_forwarded_once_unchanged(self):
        calls = []

        def handler(request):
            calls.append((request.method, request.url.path, request.content))
            return httpx.Response(200, json={"ok": True})

        for path, body in [("/api/cohort/join", b'{"token":"fake-test-token"}'), ("/api/cohort/submit", b'{"valence":5}')]:
            response = await self.call("POST", path, handler, content=body, headers={"Content-Type": "application/json"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(calls[-1], ("POST", path, body))
        self.assertEqual(len(calls), 2)

    async def test_upstream_authorization_errors_are_preserved(self):
        response = await self.call("GET", "/api/cohort/results", lambda _: httpx.Response(403, json={"error": "ADMIN required"}))
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"], "ADMIN required")

    async def test_csv_response_keeps_download_metadata(self):
        response = await self.call("GET", "/api/cohort/export.csv", lambda _: httpx.Response(200, content=b"participant,score\n", headers={
            "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="ratings.csv"',
        }))
        self.assertEqual(response.content, b"participant,score\n")
        self.assertIn("ratings.csv", response.headers["content-disposition"])

    async def test_timeout_and_html_block_return_readable_errors(self):
        def timeout(request):
            raise httpx.ConnectTimeout("test timeout", request=request)

        for handler in [timeout, lambda _: httpx.Response(403, text="blocked", headers={"Content-Type": "text/html"})]:
            response = await self.call("GET", "/api/sam/health", handler)
            self.assertEqual(response.status_code, 503)
            self.assertIn("error", response.json())

    async def test_unknown_paths_methods_and_large_bodies_never_reach_storage(self):
        def forbidden(_):
            self.fail("This request must not reach storage")

        self.assertEqual((await self.call("GET", "/api/cohort/arbitrary", forbidden)).status_code, 404)
        self.assertEqual((await self.call("DELETE", "/api/cohort/join", forbidden)).status_code, 405)
        self.assertEqual((await self.call("POST", "/api/cohort/join", forbidden, content=b"x" * (MAX_REQUEST_BYTES + 1))).status_code, 413)

    async def test_cors_preflight_is_handled_without_upstream_request(self):
        def forbidden(_):
            self.fail("Preflight must not reach storage")

        response = await self.call("OPTIONS", "/api/cohort/join", forbidden, headers={
            "Origin": "https://playerinmetaverse.tech", "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], "https://playerinmetaverse.tech")


if __name__ == "__main__":
    unittest.main()

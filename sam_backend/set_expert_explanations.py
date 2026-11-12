"""Owner-only: store the private v2 2D creator explanations in sam_settings.

Usage (owner connection string is asked for at a hidden prompt, never stored):
    python -m sam_backend.set_expert_explanations <path-to-private-explanations.json> [--replace]

The JSON file must look like {"version": "...", "explanations": {"P1": "...", ...}} and must stay
outside this public repository. It is written under its own settings key, so the running service
keeps serving the previous version until the new code is deployed.
"""

import argparse
import getpass
import json
import sys

import psycopg
from psycopg.types.json import Jsonb

from .config import digest
from .expert import EXPLANATION_SETTING_2D, EXPLANATION_VERSION_2D, STAGE2_PROFILES_2D


def load(path):
    with open(path, encoding="utf-8") as handle:
        document = json.load(handle)
    texts = document.get("explanations", {})
    if document.get("version") != EXPLANATION_VERSION_2D:
        sys.exit(f"version must be {EXPLANATION_VERSION_2D}")
    if set(texts) != set(STAGE2_PROFILES_2D):
        sys.exit(f"explanations must cover exactly {', '.join(STAGE2_PROFILES_2D)}")
    if any(not isinstance(t, str) or not t.strip() for t in texts.values()):
        sys.exit("every explanation must be non-empty text")
    return {"version": document["version"], "explanations": {p: texts[p].strip() for p in STAGE2_PROFILES_2D}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("path")
    parser.add_argument("--replace", action="store_true", help="overwrite an existing v2 document")
    args = parser.parse_args()
    document = load(args.path)
    for profile, text in document["explanations"].items():
        print(f"{profile}: {len(text)} chars, sha256 {digest(text)[:12]}")
    dsn = getpass.getpass("Owner PostgreSQL connection string (hidden): ").strip()
    with psycopg.connect(dsn) as connection:
        current = connection.execute("SELECT document FROM sam_settings WHERE key=%s", (EXPLANATION_SETTING_2D,)).fetchone()
        if current and current[0] != document and not args.replace:
            sys.exit("A different v2 document already exists; rerun with --replace to overwrite it.")
        connection.execute("INSERT INTO sam_settings (key,document) VALUES (%s,%s) ON CONFLICT(key) DO UPDATE SET document=EXCLUDED.document",
                           (EXPLANATION_SETTING_2D, Jsonb(document)))
        saved = connection.execute("SELECT document FROM sam_settings WHERE key=%s", (EXPLANATION_SETTING_2D,)).fetchone()[0]
    if saved != document:
        sys.exit("Verification failed: stored document differs.")
    print(f"Stored {len(document['explanations'])} explanations under '{EXPLANATION_SETTING_2D}' and verified them.")


if __name__ == "__main__":
    main()

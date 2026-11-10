"""Import an owner-only SAM snapshot without replacing any existing rating.

The input contains research data and invitation hashes. Keep it outside the public
repository. Connection credentials are accepted through an environment variable or
a hidden terminal prompt, never a command-line argument.
"""

import argparse
import getpass
import hashlib
import json
import os
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from .config import validate_access, validate_catalog

KEYS = {
    "sketch_ratings": ["mode", "rater", "profile"],
    "cohort_ratings": ["mode", "participant", "profile"],
    "cohort_claims": ["participant"],
    "sketch_stage2_ratings": ["mode", "rater", "profile"],
}
ORDER = ["sketch_ratings", "cohort_ratings", "cohort_claims", "sketch_stage2_ratings"]


def checksum(value):
    encoded = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def normalized(table, rows):
    return sorted(rows, key=lambda row: tuple(row[key] for key in KEYS[table]))


def validate_bundle(bundle):
    if bundle.get("format") != "sam-migration-v1":
        raise ValueError("Unsupported migration bundle")
    validate_catalog(bundle["catalog"])
    validate_access(bundle["access_hashes"])
    if set(bundle["tables"]) != set(ORDER):
        raise ValueError("All four original tables are required")
    for table in ORDER:
        rows = normalized(table, bundle["tables"][table])
        if len({tuple(row[key] for key in KEYS[table]) for row in rows}) != len(rows):
            raise ValueError("Duplicate primary key in source snapshot: " + table)
        if checksum(rows) != bundle["table_checksums"][table]:
            raise ValueError("Source table checksum mismatch: " + table)
    expected = checksum({"catalog": bundle["catalog"], "access_hashes": bundle["access_hashes"],
                         "tables": {table: normalized(table, bundle["tables"][table]) for table in ORDER}})
    if bundle["dataset_checksum"] != expected:
        raise ValueError("Source dataset checksum mismatch")


def import_bundle(connection, bundle, final=False):
    validate_bundle(bundle)
    if final and bundle.get("source_write_frozen") is not True:
        raise ValueError("Final import requires a confirmed write-frozen source")
    with connection.transaction():
        connection.execute("SELECT pg_advisory_xact_lock(hashtextextended('sam:owner:migration',0))")
        connection.execute(Path(__file__).with_name("schema.sql").read_text(encoding="utf-8"))
        state = connection.execute("SELECT document FROM sam_settings WHERE key='migration'").fetchone()
        if state and state["document"].get("ready") is True:
            raise ValueError("Active database is sealed; refusing another import")
        for key in ("catalog", "access_hashes"):
            current = connection.execute("SELECT document FROM sam_settings WHERE key=%s", (key,)).fetchone()
            if current and current["document"] != bundle[key]:
                raise ValueError("Existing private configuration differs: " + key)
            connection.execute("INSERT INTO sam_settings (key,document) VALUES (%s,%s) ON CONFLICT DO NOTHING", (key, Jsonb(bundle[key])))
        counts = {}
        for table in ORDER:
            columns = [row["column_name"] for row in connection.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=%s ORDER BY ordinal_position", (table,)).fetchall()]
            for row in bundle["tables"][table]:
                if set(row) != set(columns):
                    raise ValueError("Column mismatch: " + table)
                statement = sql.SQL("INSERT INTO {} ({}) VALUES ({}) ON CONFLICT DO NOTHING").format(
                    sql.Identifier(table), sql.SQL(",").join(map(sql.Identifier, columns)),
                    sql.SQL(",").join(sql.Placeholder() for _ in columns))
                connection.execute(statement, [row[key] for key in columns])
            saved = connection.execute(sql.SQL("SELECT * FROM {}").format(sql.Identifier(table))).fetchall()
            saved = normalized(table, saved)
            if checksum(saved) != bundle["table_checksums"][table]:
                raise ValueError("Target verification failed; transaction rolled back: " + table)
            counts[table] = len(saved)
        document = {"ready": final, "dataset_checksum": bundle["dataset_checksum"],
                    "source_checked_at_utc": bundle["source_checked_at_utc"], "counts": counts}
        connection.execute("INSERT INTO sam_settings (key,document) VALUES ('migration',%s) ON CONFLICT(key) DO UPDATE SET document=EXCLUDED.document", (Jsonb(document),))
    return {"ready": final, "counts": counts, "dataset_checksum": bundle["dataset_checksum"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--final", action="store_true")
    parser.add_argument("--hidden-credentials", action="store_true")
    args = parser.parse_args()
    dsn = getpass.getpass("Database connection (hidden): ") if args.hidden_credentials else os.environ.get("SAM_DATABASE_URL")
    if not dsn:
        raise SystemExit("Set SAM_DATABASE_URL or use --hidden-credentials")
    bundle = json.loads(args.bundle.read_text(encoding="utf-8"))
    try:
        with psycopg.connect(dsn, row_factory=dict_row, autocommit=True, prepare_threshold=None, connect_timeout=15) as connection:
            result = import_bundle(connection, bundle, args.final)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as error:
        # Exception text from drivers can contain SQL values or credentials.
        print(json.dumps({"error": type(error).__name__, "imported": False}))
        raise SystemExit(1)


if __name__ == "__main__":
    main()

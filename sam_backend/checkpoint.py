"""Add canonical checksums to an owner-only source export, without printing its values."""

import argparse
import json
from pathlib import Path

from .migration import ORDER, checksum, normalized, validate_bundle


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    bundle = json.loads(args.source.read_text(encoding="utf-8"))
    bundle["tables"] = {table: normalized(table, bundle["tables"][table]) for table in ORDER}
    bundle["table_checksums"] = {table: checksum(rows) for table, rows in bundle["tables"].items()}
    bundle["dataset_checksum"] = checksum({key: bundle[key] for key in ("catalog", "access_hashes", "tables")})
    validate_bundle(bundle)
    args.destination.write_text(json.dumps(bundle, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({"counts": {table: len(rows) for table, rows in bundle["tables"].items()},
                      "source_write_frozen": bundle["source_write_frozen"], "dataset_checksum": bundle["dataset_checksum"]}))


if __name__ == "__main__":
    main()

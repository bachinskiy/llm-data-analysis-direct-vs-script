"""Build the minimal Series B selection manifest from a retained DB export.

The source CSV is not redistributed in this package. This helper accepts a
reader-provided export with the technical `raw_id` column used by the study.
"""
import argparse
import csv
import gzip
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--out", type=Path, default=ROOT / "B" / "selection_provenance.csv")
    args = parser.parse_args()

    with gzip.open(ROOT / "B" / "input.jsonl.gz", "rt", encoding="utf-8") as stream:
        input_rows = [json.loads(line) for line in stream if line.strip()]
    expected_ids = [str(row["raw_id"]) for row in input_rows]
    expected_years = {str(row["raw_id"]): row["report_year"] for row in input_rows}

    selected = {}
    with args.source.open("r", encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            raw_id = row.get("raw_id")
            if raw_id in expected_years:
                selected[raw_id] = {
                    "raw_id": raw_id,
                    "report_year": row["Report Year"],
                    "accident_type": row["Accident Type"],
                }

    if set(selected) != set(expected_ids):
        raise ValueError("Source rows do not reproduce the Series B raw_id set")
    ordered = [selected[raw_id] for raw_id in expected_ids]
    for item in ordered:
        if item["report_year"] != expected_years[item["raw_id"]] or item["accident_type"] != "Derailment":
            raise ValueError("Series B source filter mismatch")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=["raw_id", "report_year", "accident_type"])
        writer.writeheader()
        writer.writerows(ordered)
    print(json.dumps({"rows": len(selected), "source_sha256": sha256(args.source), "output_sha256": sha256(args.out)}))


if __name__ == "__main__":
    main()

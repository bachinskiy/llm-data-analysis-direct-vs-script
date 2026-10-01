"""Check whether saved JavaScript programs preserve a safe integer boundary.

This is a post hoc contract diagnostic. It does not alter historical outputs,
trial counts, or token accounting.
"""
import argparse
import gzip
import json
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CASE_PATH = ROOT / "numeric_precision_cases.jsonl"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--node", default="node")
    parser.add_argument("--report", default=ROOT / "numeric_precision_diagnostic.json", type=Path)
    args = parser.parse_args()

    cases = [json.loads(line) for line in CASE_PATH.read_text(encoding="utf-8").splitlines() if line.strip()]
    registry = json.loads((ROOT / "runs.json").read_text(encoding="utf-8"))
    expected_damage = int(cases[0]["damage_text"])
    findings = []

    for run in registry:
        folder = ROOT / run["path"]
        program = folder / "generated.js"
        if not program.exists():
            continue
        with tempfile.TemporaryDirectory() as tmp:
            temp = Path(tmp)
            input_path = temp / "case.jsonl.gz"
            output_path = temp / "output.jsonl"
            with gzip.open(input_path, "wt", encoding="utf-8") as stream:
                for case in cases:
                    stream.write(json.dumps(case) + "\n")
            subprocess.run(
                [args.node, str(ROOT / "replay.js"), str(input_path), str(program), str(output_path)],
                check=True,
                capture_output=True,
                text=True,
                timeout=30,
            )
            output = [json.loads(line) for line in output_path.read_text(encoding="utf-8").splitlines() if line.strip()]
        actual_damage = output[0]["valid_damage_usd"]
        findings.append(
            {
                "id": run["id"],
                "expected_valid_damage_usd": expected_damage,
                "actual_valid_damage_usd": actual_damage,
                "matches_exact_integer": actual_damage == expected_damage,
            }
        )

    report = {
        "scope": "Post hoc JavaScript Number precision diagnostic. The historical contract did not specify a maximum integer range. This test is excluded from model trials, token accounting, and claims about the retained FRA input.",
        "case_file": CASE_PATH.name,
        "safe_integer_max": 9007199254740991,
        "programs_tested": len(findings),
        "programs_with_exact_integer_output": sum(item["matches_exact_integer"] for item in findings),
        "runs": findings,
    }
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in report if key != "runs"}, ensure_ascii=False))


if __name__ == "__main__":
    main()

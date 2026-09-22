"""
scripts/flag_stale_analyses.py
==============================
Week 8 — Deliverable 1: Stale Analysis Migration & Flagging Script.

Inspects document analyses across the system, compares their model_version
against the active production version (legalease-v1.2.0), and marks or flags
outdated records as 'stale' for Shalvi's Sunday-2am BullMQ re-analysis job.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List

# Add project root to sys.path
REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT))

from classification.versioning import (
    CURRENT_MODEL_VERSION,
    check_analysis_staleness,
    is_stale_version,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def flag_stale_analyses_in_records(
    records: List[Dict[str, Any]],
    current_version: str = CURRENT_MODEL_VERSION,
) -> Dict[str, Any]:
    """
    Evaluates a collection of analysis records and partitions them into
    'up_to_date' and 'stale'.
    """
    stale_records = []
    up_to_date_records = []

    for item in records:
        analysis_id = item.get("id") or item.get("analysis_id") or "unknown-id"
        doc_id = item.get("document_id") or item.get("doc_id") or "unknown-doc"
        ver = item.get("model_version")

        staleness = check_analysis_staleness(ver, current_version=current_version)

        enriched = {
            "analysis_id": analysis_id,
            "document_id": doc_id,
            "model_version": ver,
            "is_stale": staleness.is_stale,
            "reason": staleness.reason,
            "s3_key": item.get("s3_key"),
        }

        if staleness.is_stale:
            stale_records.append(enriched)
        else:
            up_to_date_records.append(enriched)

    # Chunk stale records into batches of 50 for Shalvi's Sunday job
    batch_size = 50
    stale_batches = [
        stale_records[i : i + batch_size]
        for i in range(0, len(stale_records), batch_size)
    ]

    return {
        "current_model_version": current_version,
        "total_evaluated": len(records),
        "total_stale": len(stale_records),
        "total_up_to_date": len(up_to_date_records),
        "batches_count": len(stale_batches),
        "stale_records": stale_records,
        "up_to_date_records": up_to_date_records,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Flag stale LegalEase analyses.")
    parser.add_argument(
        "--input-json",
        type=str,
        help="Optional path to JSON file containing list of analysis objects.",
    )
    parser.add_argument(
        "--output-json",
        type=str,
        help="Optional path to output JSON file containing flagged records.",
    )
    parser.add_argument(
        "--target-version",
        type=str,
        default=CURRENT_MODEL_VERSION,
        help=f"Target model version to compare against (default: {CURRENT_MODEL_VERSION}).",
    )
    args = parser.parse_args()

    # If an input file is provided, read from it
    if args.input_json:
        input_path = Path(args.input_json)
        if not input_path.exists():
            logger.error("Input file '%s' not found.", input_path)
            sys.exit(1)
        data = json.loads(input_path.read_text(encoding="utf-8"))
    else:
        # Default sample dataset representing typical production records
        data = [
            {
                "id": "analysis-001",
                "document_id": "doc-uuid-001",
                "model_version": "legal-bert-v1.0.0",
                "s3_key": "user_1/doc-uuid-001/contract.pdf",
            },
            {
                "id": "analysis-002",
                "document_id": "doc-uuid-002",
                "model_version": "legal-bert-v1.1.0",
                "s3_key": "user_2/doc-uuid-002/nda.pdf",
            },
            {
                "id": "analysis-003",
                "document_id": "doc-uuid-003",
                "model_version": CURRENT_MODEL_VERSION,
                "s3_key": "user_3/doc-uuid-003/employment.pdf",
            },
            {
                "id": "analysis-004",
                "document_id": "doc-uuid-004",
                "model_version": None,  # Legacy analysis
                "s3_key": "user_4/doc-uuid-004/lease.pdf",
            },
        ]

    report = flag_stale_analyses_in_records(data, current_version=args.target_version)

    print("\n=======================================================")
    print(f"LegalEase Stale Analysis Flagging Report")
    print(f"Target Active Version: {report['current_model_version']}")
    print("=======================================================")
    print(f"Total Evaluated: {report['total_evaluated']}")
    print(f"Up to date:     {report['total_up_to_date']}")
    print(f"Flagged Stale:  {report['total_stale']} (in {report['batches_count']} batch(es) of <=50)")
    print("-------------------------------------------------------")

    for idx, r in enumerate(report["stale_records"], 1):
        print(f"[{idx}] Doc {r['document_id']} (Analysis {r['analysis_id']}):")
        print(f"    Version: '{r['model_version']}' -> STALE")
        print(f"    Reason:  {r['reason']}")

    if args.output_json:
        out_path = Path(args.output_json)
        out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        logger.info("Exported stale report to '%s'.", out_path)


if __name__ == "__main__":
    main()

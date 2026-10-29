import asyncio
import time
from pathlib import Path
from routers.internal_classify import classify_document_handler, ClassifyRequest

async def run_measure():
    print("=" * 70)
    print("RUNNING BASELINE MEASUREMENT: sample_docs/sample_contract.pdf")
    print("=" * 70)
    req = ClassifyRequest(doc_id="measure-baseline-pdf")
    t0 = time.perf_counter()
    res = await classify_document_handler(req)
    t_end = (time.perf_counter() - t0) * 1000
    print(f"Status: {res.status}")
    print(f"Overall Risk Score: {res.overall_risk_score} ({res.overall_risk_level})")
    print(f"Clauses Count: {len(res.clauses)}")
    print(f"Classifier Method: {res.classifier_method}")
    print(f"Total Call Duration: {t_end:.1f} ms")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_measure())


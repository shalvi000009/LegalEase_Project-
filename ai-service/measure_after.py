import asyncio
import time
from pathlib import Path
from routers.internal_classify import classify_document_handler, ClassifyRequest

async def run():
    print("--- FIRST CALL (WARMUP / UNCACHED) ---")
    req1 = ClassifyRequest(doc_id="measure-after-run1")
    t0 = time.perf_counter()
    res1 = await classify_document_handler(req1)
    t1 = (time.perf_counter() - t0) * 1000
    print(f"Run 1 Total Time: {t1:.1f} ms | Score: {res1.overall_risk_score} | Clauses: {len(res1.clauses)}")

    print("\n--- SECOND CALL (CACHED VIA SHA-256) ---")
    req2 = ClassifyRequest(doc_id="measure-after-run2")
    t0 = time.perf_counter()
    res2 = await classify_document_handler(req2)
    t2 = (time.perf_counter() - t0) * 1000
    print(f"Run 2 Total Time: {t2:.1f} ms | Score: {res2.overall_risk_score} | Clauses: {len(res2.clauses)}")

if __name__ == "__main__":
    asyncio.run(run())


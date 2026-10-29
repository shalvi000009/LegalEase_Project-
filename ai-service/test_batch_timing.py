import time
import torch
from classification.classifier import ClauseClassifier

print(f"PyTorch threads: {torch.get_num_threads()}")
classifier = ClauseClassifier()
sample_texts = [
    "1. SCOPE OF SERVICES: The Provider will render technical consulting services.",
    "2. PAYMENT TERMS: The Client agrees to pay $10,000 within 30 days of invoice receipt.",
    "3. TERM AND TERMINATION: Either party may terminate with 30 days written notice.",
    "4. CONFIDENTIALITY: Both parties agree to protect proprietary technical data.",
    "5. INTELLECTUAL PROPERTY: All deliverables belong exclusively to Client upon payment.",
    "6. LIMITATION OF LIABILITY: Neither party liable for indirect or consequential damages.",
    "7. INDEMNIFICATION: Provider shall indemnify and hold harmless the Client.",
    "8. GOVERNING LAW: This agreement governed by laws of State of New York.",
    "9. FORCE MAJEURE: Neither party liable for failure caused by acts of God or war.",
    "10. SEVERABILITY: Invalidity of any provision shall not void the whole contract."
]

t0 = time.perf_counter()
results = classifier.classify_batch(sample_texts, batch_size=16)
dur = (time.perf_counter() - t0) * 1000
print(f"Batch classification of 10 clauses took: {dur:.1f} ms")
for r in results[:3]:
    print(f" - {r['clause_type']} ({r['confidence']:.2f}) via {r['method']}")


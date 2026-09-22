"""
classification/document_classifier.py
======================================
Week 7 — Deliverables 1 & 2:
1. Lightweight legal document classifier (~50ms inference) scoring 0.0–1.0: 'is this a legal contract?'
2. Threshold logic:
   - score > 0.75: auto-proceeds
   - 0.50 <= score <= 0.75: queued for user confirmation
   - score < 0.50: silently ignored
"""

from __future__ import annotations

import io
import logging
import os
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# Check if Legal-BERT is enabled via environment variable
HAS_BERT = False
if os.getenv("USE_LEGAL_BERT", "0") == "1":
    try:
        import torch
        import transformers
        from transformers import AutoModel, AutoTokenizer
        if getattr(transformers, "is_torch_available", lambda: False)():
            HAS_BERT = True
        else:
            logger.warning("transformers reports torch not available; using fast calibrated classifier.")
    except Exception as exc:
        logger.warning("BERT dependencies unavailable (%s); using fast calibrated classifier.", exc)


# ---------------------------------------------------------------------------
# Structural Contract Feature Indicators
# ---------------------------------------------------------------------------

CONTRACT_TITLE_PATTERNS = [
    r"\b(agreement|contract|memorandum of understanding|mou|terms of service|terms and conditions|nda|non-disclosure|lease|indenture)\b",
    r"\b(employment agreement|consulting agreement|service agreement|license agreement|vendor agreement|partnership agreement)\b",
    r"\b(settlement agreement|master services agreement|msa|statement of work|sow|purchase agreement)\b",
]

CONTRACT_PREAMBLE_PATTERNS = [
    r"\b(by and between|entered into by and between|this agreement is made|hereinafter referred to as)\b",
    r"\b(the parties hereto|client and contractor|company and employee|lessor and lessee)\b",
    r"\b(witnesseth|now therefore|in consideration of|mutual covenants|agree as follows)\b",
    r"\b(whereas\b.*?\bwhereas\b)",
]

CONTRACT_CLAUSE_PATTERNS = [
    r"\b(term and termination|termination for cause|termination for convenience)\b",
    r"\b(confidentiality|proprietary information|non-disclosure)\b",
    r"\b(indemnif(y|ication)|hold harmless|defend and hold harmless)\b",
    r"\b(governing law|jurisdiction|venue|laws of the state of)\b",
    r"\b(limitation of liability|consequential damages|aggregate liability)\b",
    r"\b(severability|entire agreement|counterparts|amendments in writing)\b",
    r"\b(force majeure|acts of god|representations and warranties)\b",
    r"\b(non-compete|non-solicitation|intellectual property rights|ownership of deliverables)\b",
]

CONTRACT_SIGNATURE_PATTERNS = [
    r"\b(in witness whereof|duly authorized|signatures? below|executed as of the date)\b",
    r"\b(by:\s*_+|name:\s*_+|title:\s*_+|date:\s*_+)\b",
    r"\b(authorized signature|authorized representative|signatures of the parties)\b",
]

# Negative indicators for non-contract documents (invoices, receipts, marketing, etc.)
NEGATIVE_PATTERNS = [
    (r"\b(invoice\s*(#|no|number)?|subtotal|amount due|balance due|total due|billing address|ship to:|remit to:)\b", 0.35),
    (r"\b(receipt\s*(#|no|number)?|cashier|order number|payment received|thank you for your purchase)\b", 0.35),
    (r"\b(unsubscribe|click here to view|email preferences|privacy policy\s*\|\s*terms of use|newsletter)\b", 0.25),
    (r"\b(curriculum vitae|resume|education|work experience|skills|objective|references available)\b", 0.30),
    (r"\b(meeting minutes|agenda items|attendees:\s*|adjournment|action items)\b", 0.25),
]

# Borderline patterns indicating preliminary/draft/non-binding documents (target bucket: 0.50 - 0.75)
BORDERLINE_PATTERNS = [
    (r"\b(proposal|term sheet|letter of intent|\bloi\b|preliminary terms?|non-binding|draft agreement|indicative terms?)\b", 0.16),
]

# Archetypal sample texts for prototype-based semantic comparison
CONTRACT_PROTOTYPES = [
    "This Non-Disclosure and Confidentiality Agreement is entered into by and between the parties. WHEREAS the parties agree to share proprietary information, NOW THEREFORE in consideration of the mutual covenants contained herein, the Recipient agrees to maintain strict confidentiality. This agreement shall be governed by the laws of New York. IN WITNESS WHEREOF the parties have executed this Agreement.",
    "Master Services Agreement by and between Client and Contractor. The term shall commence on the Effective Date and continue until terminated. Either party may terminate upon 30 days notice. Contractor agrees to defend and indemnify Client. The total liability shall be limited to fees paid. IN WITNESS WHEREOF, the authorized representatives sign below.",
    "Employment Agreement made between Employer and Employee. Employee agrees to devote full working time and not compete with Company during employment. Confidential Information must not be disclosed. Governing law is Delaware.",
    "Software License and Commercial Terms of Agreement. The Licensor grants a non-exclusive license. In no event shall Licensor be liable for indirect damages. Either party may terminate for default.",
]

NON_CONTRACT_PROTOTYPES = [
    "INVOICE #INV-2026-0042. Bill To: Acme Corp. Subtotal: $1,250.00. Tax (8%): $100.00. Total Balance Due: $1,350.00. Payment due within 15 days. Remit payment to bank account. Thank you for your business.",
    "Order Receipt and Payment Confirmation. Store #104. Cashier: Sarah. 1x Laptop Stand $45.00, 2x Cable $15.00. Total Paid: $60.00. Return policy: 30 days with receipt.",
    "Weekly Product Engineering Team Update Newsletter. Hey everyone, here are our highlights for the sprint! Click here to view online or manage email notification preferences. Unsubscribe at any time.",
    "Meeting Minutes and Agenda. Attendees: Alice, Bob, Charlie. Discussion of quarterly roadmap, budget allocation, sprint retro, action items assigned to team leads. Adjourned at 3:30 PM.",
    "Jane Doe - Software Engineer Resume. Experience: Senior Developer at TechCorp. Education: BS in Computer Science. Skills: Python, TypeScript, React, PostgreSQL. References available upon request.",
]


@dataclass
class DocumentClassificationResult:
    """Detailed result of legal contract source document classification."""
    is_legal_doc_score: float
    action: str  # 'auto_proceed' | 'queued_for_confirmation' | 'silently_ignored'
    threshold_bucket: str  # 'high' | 'medium' | 'low'
    confidence: float
    recommendation: str
    inference_time_ms: float
    classifier_method: str
    extracted_chars: int
    page_count: int
    key_indicators_found: List[str] = field(default_factory=list)
    negative_indicators_found: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_legal_doc_score": self.is_legal_doc_score,
            "action": self.action,
            "threshold_bucket": self.threshold_bucket,
            "confidence": self.confidence,
            "recommendation": self.recommendation,
            "inference_time_ms": self.inference_time_ms,
            "classifier_method": self.classifier_method,
            "extracted_chars": self.extracted_chars,
            "page_count": self.page_count,
            "details": {
                "confidence": self.confidence,
                "recommendation": self.recommendation,
                "key_indicators_found": self.key_indicators_found,
                "negative_indicators_found": self.negative_indicators_found,
            },
        }


def extract_document_sample_text(
    content: bytes | str | Path,
    filename: Optional[str] = None,
    max_chars: int = 3500,
    max_pages: int = 3,
) -> Tuple[str, int]:
    """
    Rapidly extracts introductory text (first 1–3 pages or up to max_chars)
    from PDF bytes/path, plain text, or images.
    Target execution time: < 10ms.

    Returns:
        (extracted_text, page_count)
    """
    # 1. Plain text string passed directly
    if isinstance(content, str):
        if Path(content).exists():
            content = Path(content).read_bytes()
        else:
            # Direct text payload
            return content[:max_chars], 1

    # 2. Path passed
    if isinstance(content, Path):
        content = content.read_bytes()

    # 3. Handle bytes (PDF, Image, or UTF-8 text)
    if not isinstance(content, bytes):
        content = bytes(content)

    # Detect PDF by magic bytes %PDF or filename
    is_pdf = content.startswith(b"%PDF") or (filename and filename.lower().endswith(".pdf"))

    if is_pdf:
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=content, filetype="pdf")
            page_count = doc.page_count
            text_parts = []
            for idx in range(min(page_count, max_pages)):
                page = doc.load_page(idx)
                text_parts.append(page.get_text("text"))
            doc.close()
            extracted = "\n".join(text_parts).strip()
            if extracted:
                return extracted[:max_chars], page_count
        except Exception as exc:
            logger.debug("Fast PyMuPDF extraction failed (%s), falling back to raw decode.", exc)

    # Detect text file or raw UTF-8
    try:
        text = content.decode("utf-8")
        return text[:max_chars], 1
    except UnicodeDecodeError:
        pass

    # Detect Image files (.png, .jpg, etc.)
    image_exts = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"}
    is_image = filename and any(filename.lower().endswith(ext) for ext in image_exts)
    if is_image or content.startswith(b"\x89PNG") or content.startswith(b"\xff\xd8"):
        try:
            import pytesseract
            from PIL import Image
            img = Image.open(io.BytesIO(content))
            text = pytesseract.image_to_string(img)
            return text[:max_chars], 1
        except Exception as exc:
            logger.warning("Image OCR sample extraction failed (%s).", exc)

    # Final fallback: best-effort ascii extraction
    extracted = "".join(chr(b) for b in content[:max_chars] if 32 <= b <= 126 or b in (10, 13))
    return extracted, 1


class LegalDocumentClassifier:
    """
    Lightweight, fast (~50ms) legal document classifier.
    Scores 0.0 to 1.0 whether an incoming file is a legal contract.
    """
    _instance = None

    def __new__(cls) -> LegalDocumentClassifier:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_name: str = "nlpaueb/legal-bert-base-uncased") -> None:
        if getattr(self, "_initialized", False):
            return

        self.model_name = model_name
        self.use_bert = HAS_BERT
        self.tokenizer = None
        self.model = None
        self.device = "cpu"

        # Precomputed prototype embeddings
        self.contract_proto_vec: Optional[np.ndarray] = None
        self.non_contract_proto_vec: Optional[np.ndarray] = None

        # TF-IDF fast representation
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            sublinear_tf=True,
            max_features=2500,
        )
        self.tfidf_contract_proto: Optional[np.ndarray] = None
        self.tfidf_non_contract_proto: Optional[np.ndarray] = None

        self._initialize()
        self._initialized = True

    def _initialize(self) -> None:
        """Fit fast TF-IDF prototypes and optionally initialize Legal-BERT."""
        # 1. Initialize TF-IDF prototype vectors
        all_texts = CONTRACT_PROTOTYPES + NON_CONTRACT_PROTOTYPES
        tfidf_matrix = self.vectorizer.fit_transform(all_texts).toarray()
        n_contract = len(CONTRACT_PROTOTYPES)

        self.tfidf_contract_proto = np.mean(tfidf_matrix[:n_contract], axis=0)
        self.tfidf_non_contract_proto = np.mean(tfidf_matrix[n_contract:], axis=0)

        # 2. Initialize Legal-BERT if enabled
        if self.use_bert:
            try:
                import torch
                from transformers import AutoModel, AutoTokenizer
                logger.info("Initializing Legal-BERT for document classifier...")
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                self.model = AutoModel.from_pretrained(self.model_name)
                self.device = "cuda" if torch.cuda.is_available() else "cpu"
                self.model.to(self.device)
                self.model.eval()

                # Precompute prototypes
                c_embs = [self._get_bert_embedding(t) for t in CONTRACT_PROTOTYPES]
                nc_embs = [self._get_bert_embedding(t) for t in NON_CONTRACT_PROTOTYPES]
                self.contract_proto_vec = np.mean(c_embs, axis=0)
                self.non_contract_proto_vec = np.mean(nc_embs, axis=0)
                logger.info("Legal-BERT document classifier initialized successfully.")
            except Exception as exc:
                logger.warning("Legal-BERT initialization failed (%s); using TF-IDF classifier.", exc)
                self.use_bert = False

    def _get_bert_embedding(self, text: str) -> np.ndarray:
        """Fast mean-pooled 768-dim embedding via Legal-BERT for first 256 tokens."""
        import torch
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=256,
            padding=True,
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        with torch.no_grad():
            outputs = self.model(**inputs)

        attention_mask = inputs["attention_mask"].unsqueeze(-1)
        token_embeddings = outputs.last_hidden_state
        weighted = token_embeddings * attention_mask
        summed = weighted.sum(dim=1)
        mask_sum = attention_mask.sum(dim=1).clamp(min=1e-9)
        return (summed / mask_sum).squeeze(0).cpu().numpy()

    def _compute_semantic_score(self, text: str) -> Tuple[float, str]:
        """
        Computes semantic similarity score in [0.0, 1.0] comparing input text
        against contract prototypes vs. non-contract prototypes.
        """
        if self.use_bert and self.contract_proto_vec is not None and self.non_contract_proto_vec is not None:
            try:
                emb = self._get_bert_embedding(text)
                sim_c = float(np.dot(emb, self.contract_proto_vec) / (np.linalg.norm(emb) * np.linalg.norm(self.contract_proto_vec)))
                sim_nc = float(np.dot(emb, self.non_contract_proto_vec) / (np.linalg.norm(emb) * np.linalg.norm(self.non_contract_proto_vec)))
                # Softmax between contract vs non-contract similarity
                diff = sim_c - sim_nc
                prob = 1.0 / (1.0 + np.exp(-diff * 8.0))
                return float(prob), "legal-bert"
            except Exception as exc:
                logger.warning("BERT embedding failed during classify (%s); falling back to TF-IDF.", exc)

        # Fast TF-IDF representation
        vec = self.vectorizer.transform([text]).toarray()[0]
        norm = np.linalg.norm(vec)
        if norm == 0:
            return 0.20, "tfidf-fast"

        sim_c = float(np.dot(vec, self.tfidf_contract_proto) / (norm * np.linalg.norm(self.tfidf_contract_proto)))
        sim_nc = float(np.dot(vec, self.tfidf_non_contract_proto) / (norm * np.linalg.norm(self.tfidf_non_contract_proto)))

        # Scaled logistic probability
        diff = sim_c - sim_nc
        prob = 1.0 / (1.0 + np.exp(-diff * 12.0))
        return float(prob), "tfidf-fast"

    def _extract_indicators(self, text: str) -> Tuple[List[str], List[str], float]:
        """
        Detects structural legal contract signals and negative non-contract signals.
        Returns:
            (positive_indicators, negative_indicators, structural_boost)
        """
        text_lower = text.lower()
        positives: List[str] = []
        negatives: List[str] = []
        boost: float = 0.0

        # 1. Contract Title / Header
        for p in CONTRACT_TITLE_PATTERNS:
            if re.search(p, text_lower):
                positives.append("contract_title_or_header")
                boost += 0.18
                break

        # 2. Preamble & Parties definition
        preamble_hits = sum(1 for p in CONTRACT_PREAMBLE_PATTERNS if re.search(p, text_lower))
        if preamble_hits >= 1:
            positives.append("preamble_parties_and_recitals")
            boost += min(0.24, 0.12 * preamble_hits)

        # 3. Operative Legal Clauses
        clause_hits = sum(1 for p in CONTRACT_CLAUSE_PATTERNS if re.search(p, text_lower))
        if clause_hits >= 1:
            positives.append(f"operative_legal_clauses_{clause_hits}")
            boost += min(0.30, 0.08 * clause_hits)

        # 4. Signatures / Execution block
        for p in CONTRACT_SIGNATURE_PATTERNS:
            if re.search(p, text_lower):
                positives.append("execution_signature_block")
                boost += 0.18
                break

        # 5. Check negative non-contract patterns
        penalty = 0.0
        for pattern, weight in NEGATIVE_PATTERNS:
            if re.search(pattern, text_lower):
                negatives.append(f"non_contract_marker_{pattern[:15]}")
                penalty += weight

        # 6. Check borderline preliminary / draft patterns (dampen into 0.50 - 0.75 range)
        for pattern, weight in BORDERLINE_PATTERNS:
            if re.search(pattern, text_lower):
                negatives.append(f"borderline_marker_{pattern[:15]}")
                penalty += weight

        total_adjustment = boost - penalty
        return positives, negatives, total_adjustment

    def classify_text(self, text: str, page_count: int = 1) -> DocumentClassificationResult:
        """
        Scores input text on whether it represents a legal contract.
        Inference execution is highly optimized (~5–50ms).
        """
        start_time = time.perf_counter()

        if not text or not text.strip():
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            return DocumentClassificationResult(
                is_legal_doc_score=0.0,
                action="silently_ignored",
                threshold_bucket="low",
                confidence=0.0,
                recommendation="Empty or unreadable document (<0.50). Silently ignored.",
                inference_time_ms=round(elapsed_ms, 2),
                classifier_method="empty-doc",
                extracted_chars=0,
                page_count=page_count,
            )

        # 1. Semantic prototype score in [0.0, 1.0]
        semantic_score, method = self._compute_semantic_score(text)

        # 2. Structural legal indicators & negative markers
        positives, negatives, adjustment = self._extract_indicators(text)

        # 3. Combined calibrated probability: blend semantic with structural signals
        # Baseline combines 45% semantic + 55% structural indicators
        raw_combined = 0.45 * semantic_score + 0.55 * (0.50 + adjustment)
        score = float(np.clip(raw_combined, 0.0, 1.0))
        score = round(score, 3)

        # 4. Week 7 Deliverable 2: Threshold Logic
        # - score > 0.75: auto-proceeds
        # - 0.50 <= score <= 0.75: queued for user confirmation
        # - score < 0.50: silently ignored
        if score > 0.75:
            action = "auto_proceed"
            threshold_bucket = "high"
            recommendation = "Contract detected with high confidence (>0.75). Auto-proceeding to deep analysis."
        elif score >= 0.50:
            action = "queued_for_confirmation"
            threshold_bucket = "medium"
            recommendation = "Borderline or ambiguous legal document (0.50-0.75). Queued for user confirmation."
        else:
            action = "silently_ignored"
            threshold_bucket = "low"
            recommendation = "Non-legal document (<0.50). Silently ignored."

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        return DocumentClassificationResult(
            is_legal_doc_score=score,
            action=action,
            threshold_bucket=threshold_bucket,
            confidence=score,
            recommendation=recommendation,
            inference_time_ms=round(elapsed_ms, 2),
            classifier_method=method,
            extracted_chars=len(text),
            page_count=page_count,
            key_indicators_found=positives,
            negative_indicators_found=negatives,
        )

    def classify_document(
        self,
        content: bytes | str | Path,
        filename: Optional[str] = None,
    ) -> DocumentClassificationResult:
        """
        Fast end-to-end classifier for a raw document file (PDF bytes, image, or text).
        Extracts sample text and evaluates legal contract probability.
        """
        text, page_count = extract_document_sample_text(content, filename=filename)
        return self.classify_text(text, page_count=page_count)

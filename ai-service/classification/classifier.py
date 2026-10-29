"""
classification/classifier.py
=============================
Clause classifier using fine-tuned Legal-BERT sequence classification model
with scikit-learn TF-IDF fallback.
Classifies contract chunks into 13 clause categories.
"""

from __future__ import annotations

import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

logger = logging.getLogger(__name__)

# Base directory for ai-service (directory containing main.py)
AI_SERVICE_DIR = Path(__file__).resolve().parent.parent


def resolve_model_path() -> Path:
    """
    Resolves the classifier model path from environment variable CLASSIFIER_MODEL_PATH
    (default: ./models/legalease-clause-classifier).
    Relative paths are resolved against the ai-service folder, not the current working directory.
    """
    env_path = os.getenv("CLASSIFIER_MODEL_PATH", "./models/legalease-clause-classifier")
    p = Path(env_path)
    if not p.is_absolute():
        p = AI_SERVICE_DIR / p
    return p.resolve()


# ---------------------------------------------------------------------------
# Archetypal reference sentences for TF-IDF fallback
# ---------------------------------------------------------------------------
REFERENCE_CLAUSES: Dict[str, List[str]] = {
    "termination": [
        "This Agreement may be terminated by either party upon 30 days written notice.",
        "In the event of default or material breach, the non-breaching party may terminate immediately.",
        "Upon termination of this Agreement, all licenses granted hereunder shall cease and determine.",
        "Either party may terminate this agreement for convenience with sixty days prior notice.",
    ],
    "non_compete": [
        "The Employee agrees not to compete with the Company in the specified territory during employment.",
        "During the term and for 12 months thereafter, the Restricted Party shall not engage in any competing business.",
        "The Covenantor shall not solicit, contract with, or perform services for competitors within the restricted area.",
        "This non-compete covenant restricts the seller from operating a similar business within a 50-mile radius.",
    ],
    "liability_limitation": [
        "In no event shall either party be liable for consequential, incidental, special, or indirect damages.",
        "The maximum aggregate liability of the Provider under this agreement shall be limited to the fees paid.",
        "The liability of either party for loss or damage under this contract is capped at the contract value.",
        "Nothing in this agreement limits liability for fraud, gross negligence, or willful misconduct.",
    ],
    "limitation_of_liability": [
        "In no event shall either party be liable for consequential, incidental, special, or indirect damages.",
        "The maximum aggregate liability of the Provider under this agreement shall be limited to the fees paid.",
        "The liability of either party for loss or damage under this contract is capped at the contract value.",
        "Nothing in this agreement limits liability for fraud, gross negligence, or willful misconduct.",
    ],
    "auto_renewal": [
        "This Agreement shall automatically renew for successive one-year terms unless either party gives notice.",
        "The term of this Agreement will renew automatically on an annual basis unless cancelled.",
        "Unless terminated in writing thirty days prior, this contract shall be automatically extended.",
        "Automatic renewal of this agreement shall occur annually upon the expiration of the initial term.",
    ],
    "governing_law": [
        "This Agreement shall be governed by and construed in accordance with the laws of the State of New York.",
        "Any legal action arising under this contract shall be brought in the courts of California.",
        "The parties submit to the exclusive jurisdiction of the state and federal courts located in Chicago.",
        "This contract is governed by and interpreted under Delaware law, excluding its conflict of laws principles.",
    ],
    "confidentiality": [
        "The parties shall maintain the confidentiality of all Proprietary and Confidential Information.",
        "Confidential Information shall not be disclosed to any third party without prior written consent.",
        "This confidentiality obligation survives the termination of this agreement for a period of five years.",
        "Recipient agrees to restrict access to protected information to employees on a need-to-know basis.",
    ],
    "ip_ownership": [
        "All intellectual property rights in the software and deliverables remain the sole property of the Developer.",
        "The Client is granted a non-exclusive, non-transferable license to use the system during the term.",
        "Any inventions or developments created during the performance of services belong exclusively to the Company.",
        "Each party retains ownership of its pre-existing intellectual property, patents, copyrights, and trade secrets.",
    ],
    "intellectual_property": [
        "All intellectual property rights in the software and deliverables remain the sole property of the Developer.",
        "The Client is granted a non-exclusive, non-transferable license to use the system during the term.",
        "Any inventions or developments created during the performance of services belong exclusively to the Company.",
        "Each party retains ownership of its pre-existing intellectual property, patents, copyrights, and trade secrets.",
    ],
    "indemnification": [
        "Each party shall indemnify, defend, and hold harmless the other party from any claims, losses, or liabilities.",
        "The Customer agrees to indemnify the Provider against liabilities, losses, damages, or costs arising from breach.",
        "Indemnification obligations under this section shall survive the expiration or termination of this agreement.",
        "The vendor will defend and hold the buyer harmless from any third-party intellectual property claims.",
    ],
    "indemnity": [
        "Each party shall indemnify, defend, and hold harmless the other party from any claims, losses, or liabilities.",
        "The Customer agrees to indemnify the Provider against liabilities, losses, damages, or costs arising from breach.",
        "Indemnification obligations under this section shall survive the expiration or termination of this agreement.",
        "The vendor will defend and hold the buyer harmless from any third-party intellectual property claims.",
    ],
    "force_majeure": [
        "Neither party shall be liable for failure to perform due to acts of God, war, riot, or natural disasters.",
        "If a force majeure event continues for more than 30 days, either party may terminate this agreement.",
        "Performance of obligations shall be suspended for the duration of the force majeure event.",
        "Events of force majeure include strikes, lockouts, supply chain failures, earthquakes, and government actions.",
    ],
    "arbitration": [
        "The parties shall settle any dispute by binding arbitration in London under ICC rules.",
        "Any controversy or claim arising out of this contract shall be settled by arbitration administered by the AAA.",
        "Disputes shall be finally settled under the Rules of Arbitration of the International Chamber of Commerce.",
        "All claims must be resolved by individual binding arbitration rather than in court.",
    ],
    "payment_terms": [
        "Payment shall be made within 30 days of receipt of a valid and undisputed invoice.",
        "All fees are exclusive of taxes and shall be paid in US Dollars by wire transfer.",
        "Interest on late payments shall accrue at a rate of 1.5% per month or the maximum legal rate.",
        "Client shall pay all invoices in full without any setoff, deduction, or counterclaim.",
    ],
    "data_privacy": [
        "The Processor shall process personal data only in accordance with applicable data protection laws.",
        "Each party agrees to comply with GDPR, CCPA, and applicable data privacy regulations.",
        "Personal data collected under this agreement shall be processed securely and confidentially.",
        "The vendor shall implement reasonable administrative and technical safeguards for protected personal data.",
    ],
    "severability": [
        "If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions remain in full force.",
        "The invalidity of any term shall not affect the validity or enforceability of other provisions of this contract.",
        "The parties shall negotiate in good faith to replace any unenforceable provision with a valid equivalent.",
        "The terms of this contract are severable; invalidity of one clause does not void the entire agreement.",
    ],
    "non_solicitation": [
        "During the term and for one year thereafter, neither party shall solicit the employees of the other.",
        "The Consultant agrees not to hire, solicit, or attempt to hire any staff or contractors of the Client.",
        "No party shall induce or solicit customers, suppliers, or partners of the other party to terminate relationships.",
        "Employee covenants not to solicit any current clients of the company for a period of 12 months after departure.",
    ],
    "assignment": [
        "Neither party may assign or transfer this Agreement without the prior written consent of the other.",
        "This Agreement shall be binding upon and inure to the benefit of the successors and permitted assigns.",
        "Any attempted assignment or delegation in violation of this section shall be null and void.",
        "Consent to assignment shall not be unreasonably withheld, conditioned, or delayed by either party.",
    ],
}




def _clean_for_classification(text: str) -> str:
    """
    Strips leading numbered section heading lines (e.g. '1. SCOPE OF SERVICES\n', '2. PAYMENT TERMS\n')
    from text before passing to the classifier if followed by clause body content.
    The fine-tuned Legal-BERT model was trained on clause body provisions (LEDGAR/CUAD)
    which do not include leading numbered titles.
    """
    cleaned = re.sub(
        r"^\s*(?:\d+\.|\bSECTION\s+\d+|\bARTICLE\s+\d+)[^\n]*\n+",
        "",
        text,
        flags=re.IGNORECASE,
    ).strip()
    return cleaned if cleaned else text.strip()


class ClauseClassifier:
    """
    Singleton classifier that loads the fine-tuned Legal-BERT clause classification model
    or automatically falls back to scikit-learn TF-IDF.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_path: Optional[str] = None):
        if getattr(self, "_initialized", False):
            return

        self.model_path = Path(model_path) if model_path else resolve_model_path()
        self.mode: str = "fallback"
        self.mode_reason: Optional[str] = None

        self.tokenizer = None
        self.model = None
        self.device = None
        self.id2label: Dict[int, str] = {}

        # TF-IDF fallback structures
        self.tfidf_vectorizer = None
        self.tfidf_prototypes: Dict[str, np.ndarray] = {}

        self._initialize_classifier()
        self._initialized = True

    def _initialize_classifier(self) -> None:
        """
        Attempts to initialize fine-tuned Legal-BERT sequence classifier.
        Device: cuda if available, else mps (Apple), else cpu.
        If loading fails or model directory is missing, initializes TF-IDF fallback.
        Logs:
            "Classifier mode: finetuned" OR "Classifier mode: fallback (<reason>)"
        """
        if not self.model_path.exists():
            self.mode = "fallback"
            self.mode_reason = f"directory not found at {self.model_path}"
            self._initialize_tfidf()
            logger.info("Classifier mode: fallback (%s)", self.mode_reason)
            return

        try:
            import torch
            from transformers import AutoModelForSequenceClassification, AutoTokenizer

            # Device selection: cuda if available, else mps (Apple), else cpu
            if torch.cuda.is_available():
                self.device = torch.device("cuda")
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                self.device = torch.device("mps")
            else:
                self.device = torch.device("cpu")
                cpu_threads = os.cpu_count() or 4
                torch.set_num_threads(cpu_threads)
                logger.info("Configured PyTorch CPU threads: %d", cpu_threads)

            self.tokenizer = AutoTokenizer.from_pretrained(str(self.model_path))
            self.model = AutoModelForSequenceClassification.from_pretrained(str(self.model_path))
            self.model.to(self.device)
            self.model.eval()

            # Warm-up prediction at startup to eliminate first-batch latency
            try:
                with torch.no_grad():
                    warm_inputs = self.tokenizer(["warm-up legal provision text."], padding=True, truncation=True, max_length=128, return_tensors="pt").to(self.device)
                    self.model(**warm_inputs)
                logger.info("Classifier warm-up prediction completed successfully.")
            except Exception as warm_err:
                logger.warning("Classifier warm-up warning: %s", warm_err)

            # Load id2label mapping from model config
            raw_id2label = getattr(self.model.config, "id2label", {})
            self.id2label = {int(k): str(v) for k, v in raw_id2label.items()}

            self.mode = "finetuned"
            self.mode_reason = None
            logger.info("Classifier mode: finetuned")
        except Exception as exc:
            self.mode = "fallback"
            self.mode_reason = f"{exc.__class__.__name__}: {exc}"
            self.tokenizer = None
            self.model = None
            self._initialize_tfidf()
            logger.warning("Classifier mode: fallback (%s)", self.mode_reason)

    def _initialize_tfidf(self) -> None:
        """
        Fits a TF-IDF vectorizer on all reference texts, and precomputes
        class prototypes.
        """
        if self.tfidf_vectorizer is not None:
            return

        all_texts = []
        class_slices: Dict[str, Tuple[int, int]] = {}

        current_idx = 0
        for clause_type, texts in REFERENCE_CLAUSES.items():
            all_texts.extend(texts)
            class_slices[clause_type] = (current_idx, current_idx + len(texts))
            current_idx += len(texts)

        self.tfidf_vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            sublinear_tf=True,
        )
        tfidf_matrix = self.tfidf_vectorizer.fit_transform(all_texts).toarray()

        for clause_type, (start, end) in class_slices.items():
            class_vectors = tfidf_matrix[start:end]
            self.tfidf_prototypes[clause_type] = np.mean(class_vectors, axis=0)

    def _softmax(self, x: np.ndarray, temperature: float = 0.05) -> np.ndarray:
        """
        Helper to convert similarity scores to probability-like confidence scores.
        """
        e_x = np.exp((x - np.max(x)) / temperature)
        return e_x / e_x.sum(axis=0)

    def classify_batch(self, texts: List[str], batch_size: int = 16) -> List[Dict[str, Any]]:
        """
        Classifies a batch of texts using fine-tuned model or TF-IDF fallback.
        Batch size: 16, max_length: 256.
        Each clause gets:
          - clause_type
          - confidence (softmax max)
          - top3 [{label, score}]
        If confidence < 0.55 OR label == "other" -> treat as "other".
        """
        if not texts:
            return []

        if self.mode == "finetuned" and self.model is not None and self.tokenizer is not None:
            try:
                import torch

                results: List[Dict[str, Any]] = []

                for i in range(0, len(texts), batch_size):
                    batch_texts = texts[i:i + batch_size]

                    # Normalize empty strings for tokenization
                    cleaned_batch = [t.strip() if t and t.strip() else "" for t in batch_texts]

                    valid_indices = [idx for idx, t in enumerate(cleaned_batch) if t]
                    valid_texts = [_clean_for_classification(cleaned_batch[idx]) for idx in valid_indices]

                    batch_results: List[Optional[Dict[str, Any]]] = [None] * len(batch_texts)

                    # Empty strings get "other" with 0 confidence
                    for idx, t in enumerate(cleaned_batch):
                        if not t:
                            batch_results[idx] = {
                                "clause_type": "other",
                                "confidence": 0.0,
                                "top3": [{"label": "other", "score": 1.0}],
                                "method": "finetuned",
                            }

                    if valid_texts:
                        inputs = self.tokenizer(
                            valid_texts,
                            return_tensors="pt",
                            truncation=True,
                            max_length=256,
                            padding=True,
                        )
                        inputs = {k: v.to(self.device) for k, v in inputs.items()}

                        with torch.no_grad():
                            outputs = self.model(**inputs)
                            logits = outputs.logits
                            probs = torch.softmax(logits, dim=-1)

                            k = min(3, probs.shape[-1])
                            topk_probs, topk_indices = torch.topk(probs, k=k, dim=-1)

                        for sub_i, orig_idx in enumerate(valid_indices):
                            sub_probs = topk_probs[sub_i].cpu().numpy()
                            sub_indices = topk_indices[sub_i].cpu().numpy()

                            top_score = float(sub_probs[0])
                            top_label = self.id2label.get(int(sub_indices[0]), "other")

                            top3 = [
                                {
                                    "label": self.id2label.get(int(idx), "other"),
                                    "score": round(float(p), 4),
                                }
                                for p, idx in zip(sub_probs, sub_indices)
                            ]

                            # Rule 3: If confidence < 0.55 OR label == "other" -> treat as "other"
                            if top_score < 0.55 or top_label == "other":
                                final_clause_type = "other"
                            else:
                                final_clause_type = top_label

                            batch_results[orig_idx] = {
                                "clause_type": final_clause_type,
                                "confidence": round(top_score, 4),
                                "top3": top3,
                                "method": "finetuned",
                            }

                    for res in batch_results:
                        if res is not None:
                            results.append(res)

                return results
            except Exception as exc:
                logger.error("Fine-tuned model batch inference failed: %s. Falling back to TF-IDF.", exc)

        # Fallback path (TF-IDF)
        return [self._classify_single_tfidf(t) for t in texts]

    def _classify_single_tfidf(self, text: str) -> Dict[str, Any]:
        """
        Classifies a single text using TF-IDF cosine similarity against prototypes.
        """
        if not text or not text.strip():
            return {
                "clause_type": "other",
                "confidence": 0.0,
                "top3": [{"label": "other", "score": 1.0}],
                "method": "tfidf-fallback-empty",
            }

        cleaned_text = _clean_for_classification(text)

        if self.tfidf_vectorizer is None:
            self._initialize_tfidf()

        vec = self.tfidf_vectorizer.transform([cleaned_text]).toarray()[0]
        if np.all(vec == 0):
            vec = self.tfidf_vectorizer.transform([text]).toarray()[0]
        if np.all(vec == 0):
            return {
                "clause_type": "other",
                "confidence": 0.0,
                "top3": [{"label": "other", "score": 1.0}],
                "method": "tfidf-fallback-zero",
            }

        similarities: Dict[str, float] = {}
        for clause_type, proto in self.tfidf_prototypes.items():
            denom = np.linalg.norm(vec) * np.linalg.norm(proto)
            sim = float(np.dot(vec, proto) / denom) if denom > 0 else 0.0
            similarities[clause_type] = sim

        class_names = list(similarities.keys())
        sim_array = np.array([similarities[c] for c in class_names])

        probs = self._softmax(sim_array, temperature=0.03)
        sorted_indices = np.argsort(probs)[::-1]

        top_score = float(probs[sorted_indices[0]])
        top_label = class_names[sorted_indices[0]]

        top3 = [
            {
                "label": class_names[idx],
                "score": round(float(probs[idx]), 4),
            }
            for idx in sorted_indices[:3]
        ]

        if top_score < 0.55 or top_label == "other":
            final_clause_type = "other"
        else:
            final_clause_type = top_label

        return {
            "clause_type": final_clause_type,
            "confidence": round(top_score, 4),
            "top3": top3,
            "method": "tfidf-fallback",
        }

    def classify_text(self, text: str) -> Dict[str, Any]:
        """
        Classifies a single text into one of the clause categories.
        Returns:
            {
                "clause_type": str,
                "confidence": float,
                "top3": [{"label": str, "score": float}, ...],
                "method": str
            }
        """
        return self.classify_batch([text], batch_size=16)[0]

"""
classification/classifier.py
=============================
Clause classifier using nlpaueb/legal-bert-base-uncased or scikit-learn TF-IDF fallback.
Classifies contract chunks into 12 standard clause types.
"""

from __future__ import annotations

import logging
import os
from typing import Dict, List, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# Try to import torch and transformers for legal-BERT
HAS_BERT_DEPS = False
try:
    import torch
    from transformers import AutoModel, AutoTokenizer
    HAS_BERT_DEPS = True
except ImportError:
    logger.warning("torch or transformers not installed. Will use TF-IDF fallback for classification.")

# ---------------------------------------------------------------------------
# Archetypal reference sentences for the 12 clause types
# ---------------------------------------------------------------------------
REFERENCE_CLAUSES: Dict[str, List[str]] = {
    "termination": [
        "This Agreement may be terminated by either party upon 30 days written notice.",
        "In the event of default or material breach, the non-breaching party may terminate immediately.",
        "Upon termination of this Agreement, all licenses granted hereunder shall cease and determine.",
        "Either party may terminate this agreement for convenience with sixty days prior notice."
    ],
    "indemnity": [
        "Each party shall indemnify, defend, and hold harmless the other party from any claims, losses, or liabilities.",
        "The Customer agrees to indemnify the Provider against liabilities, losses, damages, or costs arising from breach.",
        "Indemnification obligations under this section shall survive the expiration or termination of this agreement.",
        "The vendor will defend and hold the buyer harmless from any third-party intellectual property claims."
    ],
    "non_compete": [
        "The Employee agrees not to compete with the Company in the specified territory during employment.",
        "During the term and for 12 months thereafter, the Restricted Party shall not engage in any competing business.",
        "The Covenantor shall not solicit, contract with, or perform services for competitors within the restricted area.",
        "This non-compete covenant restricts the seller from operating a similar business within a 50-mile radius."
    ],
    "confidentiality": [
        "The parties shall maintain the confidentiality of all Proprietary and Confidential Information.",
        "Confidential Information shall not be disclosed to any third party without prior written consent.",
        "This confidentiality obligation survives the termination of this agreement for a period of five years.",
        "Recipient agrees to restrict access to protected information to employees on a need-to-know basis."
    ],
    "limitation_of_liability": [
        "In no event shall either party be liable for consequential, incidental, special, or indirect damages.",
        "The maximum aggregate liability of the Provider under this agreement shall be limited to the fees paid.",
        "The liability of either party for loss or damage under this contract is capped at the contract value.",
        "Nothing in this agreement limits liability for fraud, gross negligence, or willful misconduct."
    ],
    "payment_terms": [
        "Payment shall be made within 30 days of receipt of a valid and undisputed invoice.",
        "All fees are exclusive of taxes and shall be paid in US Dollars by wire transfer.",
        "Interest on late payments shall accrue at a rate of 1.5% per month or the maximum legal rate.",
        "Client shall pay all invoices in full without any setoff, deduction, or counterclaim."
    ],
    "governing_law": [
        "This Agreement shall be governed by and construed in accordance with the laws of the State of New York.",
        "Any legal action arising under this contract shall be brought in the courts of California.",
        "The parties submit to the exclusive jurisdiction of the state and federal courts located in Chicago.",
        "This contract is governed by and interpreted under Delaware law, excluding its conflict of laws principles."
    ],
    "intellectual_property": [
        "All intellectual property rights in the software and deliverables remain the sole property of the Developer.",
        "The Client is granted a non-exclusive, non-transferable license to use the system during the term.",
        "Any inventions or developments created during the performance of services belong exclusively to the Company.",
        "Each party retains ownership of its pre-existing intellectual property, patents, copyrights, and trade secrets."
    ],
    "force_majeure": [
        "Neither party shall be liable for failure to perform due to acts of God, war, riot, or natural disasters.",
        "If a force majeure event continues for more than 30 days, either party may terminate this agreement.",
        "Performance of obligations shall be suspended for the duration of the force majeure event.",
        "Events of force majeure include strikes, lockouts, supply chain failures, earthquakes, and government actions."
    ],
    "severability": [
        "If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions remain in full force.",
        "The invalidity of any term shall not affect the validity or enforceability of other provisions of this contract.",
        "The parties shall negotiate in good faith to replace any unenforceable provision with a valid equivalent.",
        "The terms of this contract are severable; invalidity of one clause does not void the entire agreement."
    ],
    "non_solicitation": [
        "During the term and for one year thereafter, neither party shall solicit the employees of the other.",
        "The Consultant agrees not to hire, solicit, or attempt to hire any staff or contractors of the Client.",
        "No party shall induce or solicit customers, suppliers, or partners of the other party to terminate relationships.",
        "Employee covenants not to solicit any current clients of the company for a period of 12 months after departure."
    ],
    "assignment": [
        "Neither party may assign or transfer this Agreement without the prior written consent of the other.",
        "This Agreement shall be binding upon and inure to the benefit of the successors and permitted assigns.",
        "Any attempted assignment or delegation in violation of this section shall be null and void.",
        "Consent to assignment shall not be unreasonably withheld, conditioned, or delayed by either party."
    ]
}


class ClauseClassifier:
    """
    Singleton-style classifier that wraps Legal-BERT or falls back to scikit-learn TF-IDF.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_name: str = "nlpaueb/legal-bert-base-uncased"):
        if getattr(self, "_initialized", False):
            return
        self.model_name = model_name
        self.use_fallback = not HAS_BERT_DEPS

        self.tokenizer = None
        self.model = None

        # BERT prototype vectors
        self.bert_prototypes: Dict[str, np.ndarray] = {}

        # TF-IDF fallback structures
        self.tfidf_vectorizer = None
        self.tfidf_prototypes: Dict[str, np.ndarray] = {}

        self._initialize_classifier()
        self._initialized = True

    def _initialize_classifier(self) -> None:
        """
        Attempts to initialize Legal-BERT.
        If that fails (no internet, memory limit, missing deps), initializes TF-IDF fallback.
        """
        if not self.use_fallback:
            try:
                logger.info("Initializing Legal-BERT classifier using model: %s", self.model_name)
                # Load tokenizer and model
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                self.model = AutoModel.from_pretrained(self.model_name)
                
                # Check if CUDA is available, otherwise use CPU
                self.device = "cuda" if torch.cuda.is_available() else "cpu"
                self.model.to(self.device)
                self.model.eval()

                # Precompute prototypes
                self._precompute_bert_prototypes()
                logger.info("Legal-BERT classifier initialized successfully on device: %s", self.device)
                return
            except Exception as exc:
                logger.warning(
                    "Failed to initialize Legal-BERT (%s). Falling back to TF-IDF. Error: %s",
                    exc.__class__.__name__,
                    exc,
                )
                self.use_fallback = True

        # TF-IDF fallback initialization
        logger.info("Initializing TF-IDF fallback classifier.")
        self._initialize_tfidf()
        logger.info("TF-IDF fallback classifier initialized successfully.")

    def _precompute_bert_prototypes(self) -> None:
        """
        Encodes all reference clauses using Legal-BERT and averages them
        to create a prototype vector for each class.
        """
        for clause_type, texts in REFERENCE_CLAUSES.items():
            embeddings = []
            for text in texts:
                emb = self._get_bert_embedding(text)
                embeddings.append(emb)
            # Average the embeddings to get the centroid/prototype
            self.bert_prototypes[clause_type] = np.mean(embeddings, axis=0)

    def _get_bert_embedding(self, text: str) -> np.ndarray:
        """
        Computes 768-dimensional Legal-BERT embedding for the given text.
        """
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            
        # Perform mean pooling over the token embeddings (dim=1 is the sequence length)
        # Multiply by attention_mask to exclude padding tokens
        attention_mask = inputs["attention_mask"].unsqueeze(-1)
        token_embeddings = outputs.last_hidden_state
        weighted_embeddings = token_embeddings * attention_mask
        summed = weighted_embeddings.sum(dim=1)
        mask_sum = attention_mask.sum(dim=1).clamp(min=1e-9)
        mean_pooled = summed / mask_sum
        
        return mean_pooled.squeeze(0).cpu().numpy()

    def _initialize_tfidf(self) -> None:
        """
        Fits a TF-IDF vectorizer on all reference texts, and precomputes
        class prototypes.
        """
        # Flatten all reference texts to fit vectorizer
        all_texts = []
        class_slices: Dict[str, Tuple[int, int]] = {}
        
        current_idx = 0
        for clause_type, texts in REFERENCE_CLAUSES.items():
            all_texts.extend(texts)
            class_slices[clause_type] = (current_idx, current_idx + len(texts))
            current_idx += len(texts)

        # Fit TF-IDF
        self.tfidf_vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            sublinear_tf=True
        )
        tfidf_matrix = self.tfidf_vectorizer.fit_transform(all_texts).toarray()

        # Compute average TF-IDF vectors for prototypes
        for clause_type, (start, end) in class_slices.items():
            class_vectors = tfidf_matrix[start:end]
            self.tfidf_prototypes[clause_type] = np.mean(class_vectors, axis=0)

    def _softmax(self, x: np.ndarray, temperature: float = 0.05) -> np.ndarray:
        """
        Helper to convert similarity scores to probability-like confidence scores.
        """
        # Subtract max for numerical stability
        e_x = np.exp((x - np.max(x)) / temperature)
        return e_x / e_x.sum(axis=0)

    def classify_text(self, text: str) -> dict:
        """
        Classifies input text into one of the 12 clause categories.
        Returns the category name, confidence score, and the model type.
        """
        if not text or not text.strip():
            return {
                "clause_type": "other",
                "confidence": 0.0,
                "method": "fallback-empty"
            }

        # ----------------------------------------------------
        # Path A: Legal-BERT
        # ----------------------------------------------------
        if not self.use_fallback:
            try:
                emb = self._get_bert_embedding(text)
                
                similarities = {}
                for clause_type, proto in self.bert_prototypes.items():
                    # Cosine similarity
                    sim = float(
                        np.dot(emb, proto) / (np.linalg.norm(emb) * np.linalg.norm(proto))
                    )
                    similarities[clause_type] = sim
                
                # Apply softmax to get probability-like scores
                class_names = list(similarities.keys())
                sim_array = np.array([similarities[c] for c in class_names])
                probs = self._softmax(sim_array, temperature=0.04) # sharp softmax
                
                max_idx = int(np.argmax(probs))
                predicted_class = class_names[max_idx]
                confidence = float(probs[max_idx])

                # Keep a safety check: if the highest cosine similarity itself is extremely low,
                # we flag it, but the softmax will assign it. Let's return the computed confidence.
                return {
                    "clause_type": predicted_class,
                    "confidence": round(confidence, 3),
                    "method": "legal-bert"
                }
            except Exception as exc:
                logger.error("Legal-BERT inference failed. Falling back dynamically. Error: %s", exc)
                # Fallback to TF-IDF for this call
                if self.tfidf_vectorizer is None:
                    self._initialize_tfidf()

        # ----------------------------------------------------
        # Path B: TF-IDF Fallback
        # ----------------------------------------------------
        if self.tfidf_vectorizer is None:
            self._initialize_tfidf()

        vec = self.tfidf_vectorizer.transform([text]).toarray()[0]
        if np.all(vec == 0):
            # No matching words in TF-IDF vocabulary
            return {
                "clause_type": "other",
                "confidence": 0.0,
                "method": "tfidf-fallback-zero"
            }

        similarities = {}
        for clause_type, proto in self.tfidf_prototypes.items():
            denom = np.linalg.norm(vec) * np.linalg.norm(proto)
            sim = float(np.dot(vec, proto) / denom) if denom > 0 else 0.0
            similarities[clause_type] = sim

        class_names = list(similarities.keys())
        sim_array = np.array([similarities[c] for c in class_names])
        
        # Softmax for TF-IDF similarities
        probs = self._softmax(sim_array, temperature=0.03)
        
        max_idx = int(np.argmax(probs))
        predicted_class = class_names[max_idx]
        confidence = float(probs[max_idx])

        # If similarity is zero, set confidence to 0
        if similarities[predicted_class] == 0.0:
            confidence = 0.0
            predicted_class = "other"

        return {
            "clause_type": predicted_class,
            "confidence": round(confidence, 3),
            "method": "tfidf-fallback"
        }

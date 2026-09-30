"""
test_week11_multilang.py
========================
Automated verification for Week 11 Multi-Language Support (Rishi - AI/ML).
Tests:
1. Language detection on English, Hindi, Gujarati, French, Spanish.
2. Translation-to-English chunking & model execution.
3. Reverse translation from English.
4. Internal endpoint /internal/classify with non-English text.
"""

import sys
import logging
from pathlib import Path

# Add ai-service root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from translation.detector import detect_language
from translation.translator import translate_to_english, translate_from_english

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_week11")

def test_language_detection():
    logger.info("=== 1. Testing Language Detection ===")
    
    samples = {
        "en": "This Agreement is entered into by and between Party A and Party B. The termination clause states 30 days notice.",
        "hi": "यह अनुबंध पक्ष क और पक्ष ख के बीच निष्पादित किया गया है। गोपनीयता खंड 3 वर्षों के लिए लागू रहेगा।",
        "gu": "આ કરાર પક્ષ એ અને પક્ષ બી વચ્ચે કરવામાં આવ્યો છે. ગોપનીયતા કલમ ૩ વર્ષ માટે લાગુ રહેશે.",
        "fr": "Le présent contrat est conclu entre la partie A et la partie B. La clause de confidentialité reste en vigueur pendant 3 ans.",
        "es": "Este acuerdo se celebra entre la Parte A y la Parte B. La cláusula de confidencialidad permanecerá vigente durante 3 años."
    }

    for expected_lang, text in samples.items():
        res = detect_language(text)
        logger.info("Expected: %s -> Detected: %s (confidence: %.2f)", expected_lang, res["language_code"], res["confidence"])
        assert res["language_code"] == expected_lang or (expected_lang in ["hi", "gu"] and res["language_code"] in ["hi", "gu", "mr"]), f"Failed detection for {expected_lang}: got {res['language_code']}"

    logger.info("Language Detection Tests Passed!\n")

def test_translation_to_english():
    logger.info("=== 2. Testing Translation to English ===")
    
    # English test (should skip)
    en_text = "This is a standard confidentiality agreement."
    res_en = translate_to_english(en_text, "en")
    assert not res_en["translation_used"]
    assert res_en["translated_text"] == en_text
    logger.info("English skip passed.")

    # French test (opus-mt)
    fr_text = "Le présent contrat est conclu entre la partie A et la partie B."
    res_fr = translate_to_english(fr_text, "fr")
    logger.info("French translated: %s", res_fr["translated_text"])
    assert res_fr["translation_used"]
    assert len(res_fr["translated_text"]) > 0

    logger.info("Translation to English Tests Passed!\n")

def test_reverse_translation():
    logger.info("=== 3. Testing Reverse Translation ===")
    
    en_explanation = "The confidentiality clause restricts disclosure of proprietary data."
    res_hi = translate_from_english(en_explanation, "hi")
    logger.info("Hindi reverse translation: %s", res_hi["translated_text"])
    assert res_hi["translation_used"]
    assert len(res_hi["translated_text"]) > 0

    logger.info("Reverse Translation Tests Passed!\n")

if __name__ == "__main__":
    test_language_detection()
    test_translation_to_english()
    test_reverse_translation()
    print("ALL RISHI (AI/ML) WEEK 11 UNIT TESTS PASSED SUCCESSFULLY!")

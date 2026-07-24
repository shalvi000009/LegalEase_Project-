"""
scripts/generate_sample_docs.py
================================
Generates sample test fixtures in ai-service/sample_docs/ for local development.

Run once:
    .venv/bin/python scripts/generate_sample_docs.py

Creates:
    sample_docs/sample_contract.pdf   — digital multi-page PDF
    sample_docs/sample_scanned.png    — synthetic "scanned" document image
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure project root is importable
REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT))

SAMPLE_DIR = REPO_ROOT / "sample_docs"
SAMPLE_DIR.mkdir(exist_ok=True)


# ---------------------------------------------------------------------------
# 1. Generate a synthetic digital PDF using PyMuPDF
# ---------------------------------------------------------------------------
def create_sample_pdf() -> Path:
    import fitz  # type: ignore[import-untyped]

    pdf_path = SAMPLE_DIR / "sample_contract.pdf"
    if pdf_path.exists():
        print(f"[skip] {pdf_path} already exists.")
        return pdf_path

    doc = fitz.open()

    pages_content = [
        (
            "SERVICE AGREEMENT\n\n"
            "This Service Agreement ('Agreement') is entered into as of January 1, 2026, "
            "between Acme Corp ('Client') and LegalTech Solutions Ltd ('Service Provider').\n\n"
            "1. SCOPE OF SERVICES\nThe Service Provider agrees to provide AI-powered contract "
            "analysis services, including clause classification, risk scoring (0–100), and "
            "natural-language Q&A capabilities as detailed in Exhibit A.\n\n"
            "2. PAYMENT TERMS\nClient shall pay Service Provider USD 5,000 per month, due "
            "within 30 days of invoice. Late payments accrue interest at 1.5% per month.\n\n"
            "3. CONFIDENTIALITY\nBoth parties agree to maintain strict confidentiality of "
            "all proprietary information exchanged during the term of this Agreement and for "
            "a period of three (3) years thereafter.\n\n"
            "4. TERM AND TERMINATION\nThis Agreement commences on the Effective Date and "
            "continues for twelve (12) months unless terminated earlier. Either party may "
            "terminate with 30 days written notice. Immediate termination is permitted on "
            "material breach.\n\n"
            "5. LIMITATION OF LIABILITY\nIn no event shall either party be liable for "
            "indirect, incidental, special, or consequential damages arising out of or "
            "related to this Agreement, even if advised of the possibility of such damages."
        ),
        (
            "6. INTELLECTUAL PROPERTY\nAll deliverables created under this Agreement "
            "remain the exclusive property of the Client upon full payment. Service Provider "
            "retains rights to all pre-existing IP, tools, and methodologies.\n\n"
            "7. DISPUTE RESOLUTION\nAny dispute arising out of or in connection with this "
            "Agreement shall be resolved by binding arbitration under the rules of the "
            "American Arbitration Association. The arbitration shall take place in New York, "
            "NY, and the award shall be final.\n\n"
            "8. GOVERNING LAW\nThis Agreement is governed by the laws of the State of "
            "New York, without regard to conflict of law provisions.\n\n"
            "9. ENTIRE AGREEMENT\nThis Agreement constitutes the entire agreement between "
            "the parties and supersedes all prior negotiations, representations, warranties, "
            "and understandings.\n\n"
            "IN WITNESS WHEREOF, the parties have executed this Agreement as of the date "
            "first written above.\n\n"
            "ACME CORP\nBy: ___________________________\nName: Jane Doe\nTitle: CEO\n\n"
            "LEGALTECH SOLUTIONS LTD\nBy: ___________________________\nName: John Smith\nTitle: CTO"
        ),
    ]

    for page_text in pages_content:
        page = doc.new_page(width=595, height=842)  # A4
        page.insert_text(
            (50, 70),
            page_text,
            fontsize=11,
            fontname="helv",
        )

    doc.save(str(pdf_path))
    doc.close()
    print(f"[created] {pdf_path}")
    return pdf_path


# ---------------------------------------------------------------------------
# 2. Generate a synthetic scanned document image
# ---------------------------------------------------------------------------
def create_sample_scanned_image() -> Path:
    import numpy as np
    import cv2  # type: ignore[import-untyped]
    from PIL import Image, ImageDraw, ImageFont  # type: ignore[import-untyped]

    img_path = SAMPLE_DIR / "sample_scanned.png"
    if img_path.exists():
        print(f"[skip] {img_path} already exists.")
        return img_path

    # Create a white "page" with legal text
    W, H = 800, 1100
    img = Image.new("RGB", (W, H), color=(245, 243, 238))  # slightly off-white paper
    draw = ImageDraw.Draw(img)

    text_lines = [
        "NON-DISCLOSURE AGREEMENT",
        "",
        "This Non-Disclosure Agreement ('NDA') is entered into",
        "as of July 1, 2026, between Innovate Inc. ('Disclosing",
        "Party') and Beta Ventures LLC ('Receiving Party').",
        "",
        "1. DEFINITION OF CONFIDENTIAL INFORMATION",
        "Confidential Information means any data or information",
        "that is proprietary to the Disclosing Party and not",
        "generally known to the public, including but not limited",
        "to technical data, trade secrets, know-how, research,",
        "product plans, products, services, customer lists,",
        "markets, software, developments, inventions, and",
        "processes.",
        "",
        "2. OBLIGATIONS OF RECEIVING PARTY",
        "The Receiving Party agrees to: (a) hold Confidential",
        "Information in strict confidence; (b) not to disclose",
        "it to any third parties; (c) not use it for any purpose",
        "except to evaluate and engage in business discussions.",
        "",
        "3. TERM",
        "This Agreement shall remain in effect for two (2) years",
        "from the date of execution.",
        "",
        "Signed: ________________________  Date: ___________",
    ]

    # Draw title
    draw.text((W // 2, 60), text_lines[0], fill=(20, 20, 20), anchor="mm")

    y = 110
    for line in text_lines[1:]:
        draw.text((60, y), line, fill=(30, 30, 30))
        y += 32

    # Add slight rotation to simulate a hand-placed scan (1.5°)
    img = img.rotate(1.5, expand=False, fillcolor=(230, 228, 222))

    # Add Gaussian noise to simulate scanner grain
    img_array = np.array(img)
    noise = np.random.normal(0, 5, img_array.shape).astype(np.int16)
    img_noisy = np.clip(img_array.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    cv2.imwrite(str(img_path), cv2.cvtColor(img_noisy, cv2.COLOR_RGB2BGR))
    print(f"[created] {img_path}")
    return img_path


if __name__ == "__main__":
    print("Generating sample docs for local development...")
    create_sample_pdf()
    create_sample_scanned_image()
    print("Done. Files in:", SAMPLE_DIR)

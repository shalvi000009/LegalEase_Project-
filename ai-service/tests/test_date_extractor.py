import asyncio
from classification.date_extractor import extract_contract_dates, extract_dates_regex


def test_explicit_dates_and_auto_renew():
    # Sample 1: Explicit effective and expiry dates with auto-renewal and 30-day notice
    text = (
        "This Agreement is made and entered into on January 1, 2026 (the 'Effective Date') "
        "and shall continue until December 31, 2026 (the 'Expiration Date'). Either party may "
        "terminate this Agreement by providing thirty (30) days prior written notice. "
        "This Agreement shall automatically renew for successive terms unless terminated."
    )
    result = asyncio.run(extract_contract_dates(text))
    assert result.effective_date == "2026-01-01"
    assert result.expiry_date == "2026-12-31"
    assert result.notice_period_days == 30
    assert result.auto_renews is True
    assert result.renewal_date == "2026-12-31"


def test_term_duration_calculation():
    # Sample 2: Effective date with duration term ("twelve (12) months") and no auto-renewal
    text = (
        "The effective date of this agreement is 01/15/2026. The initial term shall be "
        "for a period of twelve (12) months from the Effective Date. "
        "This agreement shall not automatically renew."
    )
    result = asyncio.run(extract_contract_dates(text))
    assert result.effective_date == "2026-01-15"
    assert result.expiry_date == "2027-01-15"
    assert result.auto_renews is False


def test_ordinal_commencement_and_years():
    # Sample 3: Ordinal day ("1st day of March 2026") and 2 years term with 60 days notice
    text = (
        "Commencing on the 1st day of March 2026, this contract shall remain in effect for 2 years. "
        "Either party must provide notice of at least 60 calendar days to prevent automatic renewal."
    )
    result = asyncio.run(extract_contract_dates(text))
    assert result.effective_date == "2026-03-01"
    assert result.expiry_date == "2028-03-01"
    assert result.notice_period_days == 60
    assert result.auto_renews is True


def test_no_dates_returns_null():
    # Negative sample: Contract with no dates mentioned never invents dates
    text = (
        "CONFIDENTIALITY AND NON-DISCLOSURE\n"
        "Each party agrees to maintain confidentiality of proprietary assets."
    )
    result = asyncio.run(extract_contract_dates(text))
    assert result.effective_date is None
    assert result.expiry_date is None
    assert result.auto_renews is False

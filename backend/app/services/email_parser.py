"""Rules-based email parser for detecting and linking job-related emails."""

from thefuzz import fuzz

# Tier 1: Known ATS/job platform sender domains (highest confidence)
ATS_DOMAINS = {
    "greenhouse.io",
    "lever.co",
    "ashbyhq.com",
    "myworkdayjobs.com",
    "icims.com",
    "smartrecruiters.com",
    "jobvite.com",
    "workable.com",
    "hire.jazz.co",
    "breezy.hr",
    "recruitee.com",
    "talent.com",
    "jobs-noreply@linkedin.com",
    "linkedin.com",
    "indeed.com",
    "glassdoor.com",
    "ziprecruiter.com",
    "dice.com",
    "hired.com",
    "angellist.com",
    "wellfound.com",
}

# Tier 3: Strong job-related keywords in subject
JOB_KEYWORDS = [
    "your application",
    "application received",
    "application status",
    "interview invitation",
    "interview scheduled",
    "phone screen",
    "technical interview",
    "coding challenge",
    "take-home assignment",
    "offer letter",
    "job offer",
    "we regret",
    "unfortunately",
    "not moving forward",
    "pleased to inform",
    "congratulations",
    "next steps",
    "assessment",
    "hiring process",
    "recruitment",
    "position at",
    "role at",
    "opportunity at",
]


def is_ats_domain(from_address: str) -> bool:
    """Check if the sender domain is a known ATS platform."""
    domain = from_address.lower().split("@")[-1] if "@" in from_address else ""
    return any(ats in domain for ats in ATS_DOMAINS)


def has_job_keywords(subject: str, snippet: str) -> bool:
    """Check if subject or snippet contains strong job-related keywords."""
    text = f"{subject} {snippet}".lower()
    return any(kw in text for kw in JOB_KEYWORDS)


def match_company(
    from_address: str,
    subject: str,
    snippet: str,
    tracked_companies: list[str],
    threshold: int = 75,
) -> str | None:
    """Fuzzy-match email content against tracked company names.

    Returns the best matching company name, or None if no match above threshold.
    """
    text = f"{from_address} {subject} {snippet}".lower()

    best_match: str | None = None
    best_score = 0

    for company in tracked_companies:
        # Try partial ratio (handles substring matches like "Google" in "noreply@google.com")
        score = fuzz.partial_ratio(company.lower(), text)
        if score > best_score and score >= threshold:
            best_score = score
            best_match = company

    return best_match


def classify_email(
    from_address: str,
    subject: str,
    snippet: str,
    tracked_companies: list[str],
) -> dict:
    """Classify an email and attempt to match it to a tracked application.

    Returns:
        {
            "is_job_related": bool,
            "confidence": "high" | "medium" | "low" | None,
            "matched_company": str | None,
            "reason": str,
        }
    """
    is_ats = is_ats_domain(from_address)
    has_keywords = has_job_keywords(subject, snippet)
    matched_company = match_company(from_address, subject, snippet, tracked_companies)

    # Tier 1: ATS domain + company match
    if is_ats and matched_company:
        return {
            "is_job_related": True,
            "confidence": "high",
            "matched_company": matched_company,
            "reason": "ATS domain + company match",
        }

    # Tier 2: Keywords + company match
    if has_keywords and matched_company:
        return {
            "is_job_related": True,
            "confidence": "medium",
            "matched_company": matched_company,
            "reason": "Job keywords + company match",
        }

    # Tier 2b: ATS domain only (no company match)
    if is_ats:
        return {
            "is_job_related": True,
            "confidence": "medium",
            "matched_company": None,
            "reason": "ATS domain detected",
        }

    # Tier 3: Keywords only (low confidence, surface as suggestion)
    if has_keywords:
        return {
            "is_job_related": True,
            "confidence": "low",
            "matched_company": matched_company,
            "reason": "Job keywords detected",
        }

    return {
        "is_job_related": False,
        "confidence": None,
        "matched_company": None,
        "reason": "No job signals detected",
    }

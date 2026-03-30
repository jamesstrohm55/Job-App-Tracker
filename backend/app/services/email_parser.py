"""Rules-based email parser for detecting, classifying, and extracting job-related emails."""

import re

from thefuzz import fuzz

# Known ATS/job platform sender domains — these are PLATFORMS, not the actual company
ATS_DOMAINS = {
    "greenhouse.io", "lever.co", "ashbyhq.com", "myworkdayjobs.com",
    "icims.com", "smartrecruiters.com", "jobvite.com", "workable.com",
    "hire.jazz.co", "breezy.hr", "recruitee.com", "talent.com",
    "linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com",
    "dice.com", "hired.com", "angellist.com", "wellfound.com",
    "calendly.com", "zoom.us", "meet.google.com",
}

# Platforms whose name should NEVER be extracted as the company
PLATFORM_NAMES = {
    "linkedin", "indeed", "glassdoor", "ziprecruiter", "dice", "hired",
    "angellist", "wellfound", "greenhouse", "lever", "ashby", "icims",
    "smartrecruiters", "jobvite", "workable", "breezy", "recruitee",
    "calendly", "zoom",
    "talent", "jazz",
}

# Intent detection patterns
APPLICATION_CONFIRMED_KEYWORDS = [
    "application received", "application has been received",
    "application was submitted", "successfully applied",
    "thank you for applying", "thanks for applying",
    "we received your application", "application confirmed",
    "your application to", "your application for",
    "we have received your resume", "application was sent",
]

INTERVIEW_KEYWORDS = [
    "interview invitation", "interview scheduled", "interview confirmation",
    "phone screen", "phone interview", "technical interview",
    "onsite interview", "virtual interview", "video interview",
    "coding challenge", "take-home", "assessment invitation",
    "schedule your interview", "interview with",
    "invited to interview", "next round",
    "2nd interview", "second interview", "final interview",
    "final round", "meet the team",
    "skills assessment", "technical assessment", "online assessment",
    "next steps", "next step with",
    "friendly reminder", "via calendly",
    "30 min intro", "intro call", "introductory call",
    "zoom web conference", "join this meeting",
]

REJECTION_KEYWORDS = [
    "unfortunately", "we regret", "regret to inform",
    "not moving forward", "will not be moving forward",
    "decided not to proceed", "not to proceed",
    "position has been filled", "gone with another candidate",
    "went with another candidate", "chose another candidate",
    "not selected", "were not selected",
    "after careful consideration",
    "we will not be proceeding", "unable to offer",
    "other candidates who more closely",
    "competitive applicant pool",
    "not a match", "not the right fit",
    "pursue other candidates", "move forward with other",
    "decided to move forward with other",
    "no longer under consideration",
    "position is no longer available",
    "will not be extending", "won't be extending",
    "application will not be moving",
    "decided to go in a different direction",
    "not able to move forward",
    "thank you for your interest but",
    # Soft rejections
    "while your skills", "while your background",
    "while your qualifications", "while your experience",
    "while we were impressed", "while your resume",
    "does not align", "do not align",
    "not a fit", "not the best fit",
    "will keep your resume on file",
    "keep your resume on file",
    "encourage you to apply again",
    "encourage you to reapply",
    "wish you the best", "wish you all the best",
    "best of luck", "good luck in your",
    "at this time we are unable",
    "at this time, we are unable",
    "will not be advancing",
    "have chosen not to",
    "decided to pursue",
    "have decided to go with",
    "no longer being considered",
    "not be continuing",
]

OFFER_KEYWORDS = [
    "offer letter", "job offer", "pleased to offer",
    "extend an offer", "congratulations", "welcome aboard",
    "compensation package", "start date",
    "we are excited to offer", "formal offer",
    "we'd like to offer", "we would like to offer",
]

# General catch-all
JOB_KEYWORDS = (
    APPLICATION_CONFIRMED_KEYWORDS + INTERVIEW_KEYWORDS +
    REJECTION_KEYWORDS + OFFER_KEYWORDS + [
        "application status", "hiring process",
        "recruitment", "position at", "role at", "opportunity at",
    ]
)


def is_ats_domain(from_address: str) -> bool:
    domain = from_address.lower().split("@")[-1] if "@" in from_address else ""
    return any(ats in domain for ats in ATS_DOMAINS)


def _is_platform_name(name: str) -> bool:
    """Check if a name is a known job platform, not a real company."""
    return name.lower().strip() in PLATFORM_NAMES


def has_job_keywords(subject: str, snippet: str) -> bool:
    text = f"{subject} {snippet}".lower()
    return any(kw in text for kw in JOB_KEYWORDS)


def detect_intent(subject: str, snippet: str) -> str:
    """Detect the intent/action type of a job email."""
    text = f"{subject} {snippet}".lower()

    # Check most specific first — rejection before offer to avoid
    # "unfortunately we cannot offer" being classified as offer
    if any(kw in text for kw in REJECTION_KEYWORDS):
        return "rejection"
    if any(kw in text for kw in OFFER_KEYWORDS):
        return "offer"
    if any(kw in text for kw in INTERVIEW_KEYWORDS):
        return "interview"
    if any(kw in text for kw in APPLICATION_CONFIRMED_KEYWORDS):
        return "application_confirmed"
    return "general"


def extract_company_from_email(from_address: str, subject: str, snippet: str) -> str | None:
    """Extract the ACTUAL company name, not the platform name.

    For ATS/platform emails (LinkedIn, Greenhouse, etc), we must parse
    the subject/snippet to find the real company. For direct company emails,
    we can use the sender info.
    """
    is_ats = is_ats_domain(from_address)

    # Strategy 1: Parse subject for explicit company mentions
    # Order matters — most specific patterns first
    # Company name character class — allows letters, digits, spaces, &, ., ', -
    C = r"[A-Za-z0-9][A-Za-z0-9\s&.'\-]*?"

    subject_patterns = [
        # HIGHEST PRIORITY: "application to [Position] at [Company]" — extract company AFTER "at"
        rf"application to .+?\s+at\s+({C})(?:\s*[-–—.,!\[\]]|\s*$)",
        # "application for [Position] at [Company]"
        rf"application for .+?\s+at\s+({C})(?:\s*[-–—.,!\[\]]|\s*$)",
        # "application was sent to [Company]"
        rf"application\s+(?:was\s+)?sent to ({C})(?:\s*[-–—.,!]|\s*$)",
        # "application was viewed by [Company]"
        rf"application was viewed by ({C})(?:\s*[-–—.,!]|\s*$)",
        # "your interest in [Company]"
        rf"interest in ({C})(?:\.|,|\s*$)",
        # "Thank you for applying to [Company]" or "for your application to [Company]"
        rf"(?:applying|application) (?:to|at) ({C})(?:\.|,|\s*[-–—]|\s*$)",
        # "[Company] Careers: ..." (e.g., "Uber Careers: Thank you...")
        rf"^({C})\s*(?:Careers|Jobs|Hiring):\s",
        # "[Company] is reviewing your application"
        rf"^({C}) (?:is reviewing|has reviewed|viewed|has viewed)",
        # "Next Step with [Company]" or "Next Steps at [Company]"
        rf"(?:next\s+steps?|update)\s+(?:with|at|from)\s+({C})(?:\s*[-–—]|\s*$)",
        # "Interview with [Company]" or "Interview at [Company]"
        rf"interview\s+(?:with|at)\s+({C})(?:\s*[-–—]|\s*$)",
        # "[Company] - Software Engineer" (company first, before position)
        rf"^({C})\s*[-–—]\s*(?:Software|Senior|Junior|Lead|Staff|Principal|Full|Front|Back|Data|Product|Design|ML|AI|QA|DevOps|SRE|Cloud|Mobile|Web|iOS|Android)",
        # "[Position] at [Company]" — generic catch for "Engineer at Google"
        rf"(?:Engineer|Developer|Designer|Manager|Analyst|Scientist|Architect|Director|Intern|Associate)\s+(?:at|@)\s+({C})(?:\s*[-–—]|\s*$)",
    ]

    for pattern in subject_patterns:
        match = re.search(pattern, subject, re.IGNORECASE)
        if match:
            company = match.group(1).strip().rstrip(".,;:")
            if not _is_platform_name(company) and 1 < len(company) < 60:
                # Reject if it looks like a position title, not a company
                position_words = {"engineer", "developer", "designer", "manager", "analyst",
                                  "scientist", "lead", "architect", "director", "intern",
                                  "associate", "desenvolvedor", "engenheiro", "programador",
                                  "senior", "junior", "pleno", "full stack", "backend",
                                  "frontend", "software", "web", "ai", "ml", "data",
                                  "python", "java", "node", "react", "django"}
                words_lower = company.lower().split()
                # If more than half the words are position-related, skip
                position_word_count = sum(1 for w in words_lower if w in position_words)
                if position_word_count <= len(words_lower) / 2:
                    return company

    # Strategy 2: Parse snippet for company mentions
    snippet_patterns = [
        rf"applied to ({C})(?:\.|,|\s+for\s)",
        rf"application (?:to|at|for|with) ({C})(?:\.|,|\s+for\s|\s+was\s)",
        rf"interest in ({C})(?:\.|,|\s+We|\s+While)",
        rf"from ({C})(?:\.|,)\s+(?:Thank|We|Hi|Dear|Hello)",
        rf"at ({C}),?\s+(?:we|and|the team)",
    ]
    for pattern in snippet_patterns:
        match = re.search(pattern, snippet)
        if match:
            company = match.group(1).strip().rstrip(".,;:")
            if not _is_platform_name(company) and 1 < len(company) < 60:
                return company

    # Strategy 3: For NON-ATS emails, use sender info
    if not is_ats:
        # Try sender display name: "Google Recruiting <noreply@google.com>"
        name_match = re.match(r"^([^<]+)<", from_address)
        if name_match:
            name = name_match.group(1).strip()
            generic = {
                "noreply", "no-reply", "donotreply", "notifications", "info",
                "support", "jobs", "careers", "talent", "recruiting", "hr",
                "team", "hiring", "people", "admin",
            }
            if name.lower() not in generic and not _is_platform_name(name) and len(name) > 1:
                for suffix in ["Recruiting", "Careers", "Jobs", "Talent", "HR", "Team", "Hiring", "People"]:
                    name = re.sub(rf"\s*{suffix}\s*$", "", name, flags=re.IGNORECASE)
                name = name.strip()
                if name and not _is_platform_name(name) and not _looks_like_person_name(name):
                    return name

        # Try domain name
        if "@" in from_address:
            domain = from_address.lower().split("@")[-1].rstrip(">")
            company_part = domain.split(".")[0]
            skip = {"gmail", "yahoo", "outlook", "hotmail", "mail", "email", "icloud", "proton", "aol"}
            if company_part not in skip and not _is_platform_name(company_part):
                return company_part.capitalize()

    return None


def _looks_like_person_name(name: str) -> bool:
    """Heuristic: 'Andres Saldarriaga' is a person, 'Avenue Code' is a company."""
    words = name.split()
    if len(words) != 2:
        return False
    # Both words capitalized, no digits, no common company words
    company_indicators = {
        "inc", "llc", "corp", "co", "ltd", "group", "tech", "labs", "io",
        "solutions", "systems", "services", "consulting", "digital", "code",
        "software", "studio", "media", "global", "staffing", "it",
    }
    for w in words:
        if w.lower() in company_indicators:
            return False
    # If both words are short-ish and look like first/last name, probably a person
    if all(w[0].isupper() and w[1:].islower() and len(w) < 15 for w in words):
        return True
    return False


def extract_position_from_subject(subject: str) -> str | None:
    """Try to extract a job position/title from the subject line."""
    patterns = [
        # "Company - Software Engineer" or "Software Engineer - Company"
        r"[-–—]\s*([A-Z][A-Za-z\s/()]+(?:Engineer|Developer|Designer|Manager|Analyst|Scientist|Lead|Architect|Director|Intern|Associate)(?:\s*[IVX]{0,3})?)",
        # "Your application for Software Engineer"
        r"application for\s+(?:the\s+)?(.+?)(?:\s+at\s|\s+with\s|\s*[-–—]|\s*$)",
        # "Interview for Software Engineer"
        r"interview.*?for\s+(?:the\s+)?(.+?)(?:\s+(?:at|with)\s|\s*[-–—]|\s*$)",
        # "Role: Software Engineer"
        r"(?:role|position):\s*(.+?)(?:\s*[-–—]|\s*$)",
        # "FS Engineer" or "Full Stack Engineer" etc standalone
        r"[-–—]\s*((?:FS|Full[- ]Stack|Front[- ]End|Back[- ]End|Staff|Senior|Junior|Lead|Principal)\s+(?:Engineer|Developer|Architect))",
    ]
    for pattern in patterns:
        match = re.search(pattern, subject, re.IGNORECASE)
        if match:
            position = match.group(1).strip().rstrip(".,;:")
            if 3 < len(position) < 80:
                return position
    return None


def match_company(
    from_address: str,
    subject: str,
    snippet: str,
    tracked_companies: list[str],
    threshold: int = 85,
) -> str | None:
    """Match email content against tracked companies.

    Uses word-boundary matching first (exact company name appears in text),
    then falls back to fuzzy matching with a high threshold.
    """
    text = f"{from_address} {subject} {snippet}".lower()
    best_match: str | None = None
    best_score = 0

    for company in tracked_companies:
        company_lower = company.lower()

        # Tier 1: Exact substring match (case-insensitive)
        if company_lower in text:
            # Prefer longer exact matches
            if len(company) > len(best_match or ""):
                best_match = company
                best_score = 100
            continue

        # Tier 2: Fuzzy match — but only use token_set_ratio for multi-word
        # company names, and require high threshold to avoid false positives
        if best_score < 100:
            if len(company_lower.split()) > 1:
                score = fuzz.token_set_ratio(company_lower, text)
            else:
                # For single-word companies, require very high match
                # Check each word in the text individually
                score = max(
                    (fuzz.ratio(company_lower, word) for word in text.split()),
                    default=0,
                )
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
    """Classify an email with intent detection and company/position extraction."""
    is_ats = is_ats_domain(from_address)
    has_keywords = has_job_keywords(subject, snippet)
    matched_company = match_company(from_address, subject, snippet, tracked_companies)
    extracted_company = extract_company_from_email(from_address, subject, snippet)
    extracted_position = extract_position_from_subject(subject)
    intent = detect_intent(subject, snippet) if (is_ats or has_keywords) else None

    base = {
        "matched_company": matched_company,
        "extracted_company": extracted_company,
        "extracted_position": extracted_position,
        "intent": intent,
    }

    if is_ats and matched_company:
        return {**base, "is_job_related": True, "confidence": "high",
                "reason": "ATS domain + company match"}

    if has_keywords and matched_company:
        return {**base, "is_job_related": True, "confidence": "medium",
                "reason": "Job keywords + company match"}

    if is_ats:
        return {**base, "is_job_related": True, "confidence": "medium",
                "reason": "ATS domain detected"}

    if has_keywords:
        return {**base, "is_job_related": True, "confidence": "low",
                "reason": "Job keywords detected"}

    return {**base, "is_job_related": False, "confidence": None,
            "intent": None, "reason": "No job signals detected"}

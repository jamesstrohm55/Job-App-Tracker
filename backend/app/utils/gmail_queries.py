"""Gmail API search query builders."""

from datetime import datetime


def build_job_email_query(after_date: datetime | None = None) -> str:
    """Build a Gmail search query to find job-related emails."""
    # ATS domains to search for
    ats_queries = [
        "from:greenhouse.io",
        "from:lever.co",
        "from:ashbyhq.com",
        "from:myworkdayjobs.com",
        "from:icims.com",
        "from:smartrecruiters.com",
        "from:jobvite.com",
        "from:workable.com",
        "from:linkedin.com",
        "from:indeed.com",
        "from:glassdoor.com",
        "from:ziprecruiter.com",
        "from:wellfound.com",
        "from:hired.com",
    ]

    # Keyword queries — broader to catch recruiter emails
    keyword_queries = [
        "subject:(application OR interview OR offer OR assessment)",
        "subject:(hiring process OR next steps OR phone screen)",
        "subject:(coding challenge OR take-home OR technical assessment)",
        "subject:(skills assessment OR online assessment)",
        "subject:(invitation OR scheduled OR calendar)",
        "subject:(candidacy OR candidate OR position OR role)",
        "subject:(recruiter OR recruiting OR recruitment)",
        "subject:(resume OR CV)",
    ]

    # Combine with OR
    all_queries = ats_queries + keyword_queries
    query = " OR ".join(f"({q})" for q in all_queries)

    # Add date filter if provided
    if after_date:
        date_str = after_date.strftime("%Y/%m/%d")
        query = f"({query}) after:{date_str}"

    return query

"""Rules-based interview detail extractor — parses email body for meeting info."""

import re
from datetime import datetime


def extract_interview_details(subject: str, body: str, from_address: str) -> dict:
    """Extract interview details from email subject and body.

    Returns:
        {
            "type": str | None,
            "date": str | None,
            "time": str | None,
            "timezone": str | None,
            "participants": list[str],
            "meeting_link": str | None,
        }
    """
    text = f"{subject}\n{body}"

    return {
        "type": _detect_interview_type(subject, body),
        "date": _extract_date(subject),
        "time": _extract_time(subject),
        "timezone": _extract_timezone(subject, body),
        "participants": _extract_participants(body, from_address),
        "meeting_link": _extract_meeting_link(body),
    }


def _detect_interview_type(subject: str, body: str) -> str | None:
    text = f"{subject} {body}".lower()

    if any(kw in text for kw in ["phone screen", "phone interview"]):
        return "phone_screen"
    if any(kw in text for kw in ["technical interview", "technical assessment", "coding challenge",
                                   "coding interview", "live coding", "technical round"]):
        return "technical"
    if any(kw in text for kw in ["behavioral interview", "behavioral round", "culture fit",
                                   "culture interview"]):
        return "behavioral"
    if any(kw in text for kw in ["onsite", "on-site", "in-person", "office visit"]):
        return "onsite"
    if any(kw in text for kw in ["skills assessment", "online assessment", "assessment invitation",
                                   "take-home", "take home", "homework"]):
        return "assessment"
    if any(kw in text for kw in ["2nd interview", "second interview", "final interview",
                                   "final round", "3rd interview", "third interview"]):
        return "technical"  # Follow-up interviews are usually technical
    return "other"


def _extract_meeting_link(body: str) -> str | None:
    """Extract video meeting links from email body."""
    patterns = [
        # Zoom
        r"(https?://[\w.-]*zoom\.us/j/\S+)",
        # Google Meet
        r"(https?://meet\.google\.com/\S+)",
        # Microsoft Teams
        r"(https?://teams\.microsoft\.com/\S+)",
        # Webex
        r"(https?://[\w.-]*webex\.com/\S+)",
        # Generic meeting link patterns
        r"(https?://[\w.-]*whereby\.com/\S+)",
        r"(https?://[\w.-]*calendly\.com/\S+)",
        # SovaAssessment or similar assessment platforms
        r"(https?://[\w.-]*sovaassessment\.com/\S+)",
        r"(https?://[\w.-]*hirevue\.com/\S+)",
        r"(https?://[\w.-]*hackerrank\.com/\S+)",
        r"(https?://[\w.-]*codility\.com/\S+)",
        r"(https?://[\w.-]*codesignal\.com/\S+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, body, re.IGNORECASE)
        if match:
            link = match.group(1).rstrip(".,;>)\"'")
            return link

    # Generic: look for any URL near words like "join", "meeting", "link", "click here"
    join_pattern = r"(?:join|meeting|click here|start|begin|access|open)\s*(?:the\s+)?(?:meeting|interview|call|session|assessment)?\s*(?:here|link|url)?[:\s]*\n?\s*(https?://\S+)"
    match = re.search(join_pattern, body, re.IGNORECASE)
    if match:
        return match.group(1).rstrip(".,;>)\"'")

    return None


def _extract_participants(body: str, from_address: str) -> list[str]:
    """Extract participant names and emails from the email body."""
    participants = []

    # Extract the sender's display name
    name_match = re.match(r"^([^<]+)<", from_address)
    if name_match:
        name = name_match.group(1).strip()
        generic = {"noreply", "no-reply", "notifications", "calendar", "invite"}
        if name.lower() not in generic and len(name) > 1:
            email_match = re.search(r"<([^>]+)>", from_address)
            email = email_match.group(1) if email_match else ""
            participants.append(f"{name} <{email}>")

    # Look for "with [Name]" or "Organizer: [Name]" patterns
    patterns = [
        r"(?:with|organizer|host|interviewer|recruiter)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        r"(?:invited by|scheduled by|organized by)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
    ]
    for pattern in patterns:
        matches = re.findall(pattern, body, re.IGNORECASE)
        for name in matches:
            name = name.strip()
            if name and name not in [p.split("<")[0].strip() for p in participants]:
                participants.append(name)

    # Look for email addresses in the body that look like people (not noreply)
    email_pattern = r"([a-zA-Z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"
    emails_found = re.findall(email_pattern, body)
    skip_patterns = {"noreply", "no-reply", "notifications", "calendar", "donotreply",
                     "jobs", "careers", "support", "info", "admin", "linkedin", "greenhouse"}
    for email in emails_found[:5]:  # Cap at 5
        if not any(skip in email.lower() for skip in skip_patterns):
            if email not in str(participants):
                participants.append(email)

    return participants[:5]  # Max 5 participants


def _extract_date(subject: str) -> str | None:
    """Extract date from subject like '@ Fri Mar 27, 2026'."""
    # Pattern: "Mon Mar 27, 2026" or "March 27, 2026" or "2026-03-27"
    patterns = [
        r"(\w{3,9}\s+\d{1,2},?\s+\d{4})",  # "Mar 27, 2026" or "March 27, 2026"
        r"(\d{4}-\d{2}-\d{2})",              # "2026-03-27"
        r"(\d{1,2}/\d{1,2}/\d{4})",          # "03/27/2026"
    ]
    for pattern in patterns:
        match = re.search(pattern, subject)
        if match:
            return match.group(1).strip()
    return None


def _extract_time(subject: str) -> str | None:
    """Extract time from subject like '12:00 - 12:30'."""
    patterns = [
        r"(\d{1,2}:\d{2})\s*[-–]\s*\d{1,2}:\d{2}",  # "12:00 - 12:30"
        r"(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))",          # "2:00 PM"
        r"@\s*\w+\s+\w+\s+\d+.*?(\d{1,2}:\d{2})",     # "@ Fri Mar 27 12:00"
    ]
    for pattern in patterns:
        match = re.search(pattern, subject)
        if match:
            return match.group(1).strip()
    return None


def _extract_timezone(subject: str, body: str) -> str | None:
    """Extract timezone from subject or body."""
    text = f"{subject} {body}"
    patterns = [
        r"\(?(GMT[+-]\d{1,2})\)?",           # "GMT-3" or "(GMT-3)"
        r"\(?(UTC[+-]\d{1,2})\)?",           # "UTC-3"
        r"\(?(EST|PST|CST|MST|EDT|PDT|CDT|MDT|BRT|IST|CET|CEST|BST|JST|AEST)\)?",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None

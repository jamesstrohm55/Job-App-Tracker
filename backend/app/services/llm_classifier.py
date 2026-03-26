"""LLM-powered email classifier using Nemotron via OpenRouter."""

import json

import httpx

from app.config import settings

SYSTEM_PROMPT = """You are an email classifier for a job application tracker. Analyze the email and extract structured information.

You MUST respond with valid JSON only, no markdown, no explanation. Use this exact schema:

{
  "is_job_related": true/false,
  "intent": "application_confirmed" | "interview" | "rejection" | "offer" | "general" | null,
  "company": "Company Name" | null,
  "position": "Job Title" | null,
  "confidence": "high" | "medium" | "low",
  "interview_details": {
    "date": "2026-03-27" | null,
    "time": "12:00" | null,
    "timezone": "GMT-3" | null,
    "type": "phone_screen" | "technical" | "behavioral" | "onsite" | "assessment" | "other" | null,
    "participants": ["Name <email>"] | [],
    "meeting_link": "https://..." | null,
    "notes": "any extra details" | null
  } | null
}

Rules:
- "intent" should reflect the PRIMARY purpose of the email:
  - "application_confirmed": The email confirms a job application was received/sent
  - "interview": The email is about scheduling, confirming, or inviting to an interview/assessment/coding challenge/skills assessment
  - "rejection": The email indicates the application was rejected or the candidate was not selected. Look for phrases like "unfortunately", "not moving forward", "regret to inform", "other candidates", "position filled", "while your skills/experience", "wish you the best in your search"
  - "offer": The email extends a job offer
  - "general": Job-related but doesn't fit the above (e.g., job alerts, newsletter, viewed profile)
  - null: Not job-related at all
- "company" should be the ACTUAL COMPANY being applied to, NOT job platforms like LinkedIn, Indeed, Greenhouse, Lever, etc.
- "position" should be the job title if mentioned
- "interview_details" should ONLY be populated when intent is "interview". Extract as much detail as possible from the email.
  - "type": classify the interview type based on context
  - "participants": extract names and emails of interviewers/organizers mentioned
  - "meeting_link": extract any Zoom, Google Meet, Teams, or other video call links
  - "date"/"time"/"timezone": extract the scheduled date and time if mentioned
- Newsletters, marketing emails, social media notifications, news articles are NOT job-related
- Job recommendation emails ("X is hiring", "Jobs similar to") are NOT job-related (intent null)"""


async def classify_email_with_llm(
    from_address: str,
    subject: str,
    snippet: str,
) -> dict | None:
    """Classify an email using Nemotron via OpenRouter.

    Returns the parsed classification dict, or None if the LLM call fails.
    """
    if not settings.openrouter_api_key:
        return None

    user_message = f"""From: {from_address}
Subject: {subject}
Preview: {snippet[:500]}"""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.openrouter_model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 400,
                },
            )
            response.raise_for_status()

            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()

            # Parse JSON — handle cases where LLM wraps in ```json
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

            result = json.loads(content)

            if not isinstance(result.get("is_job_related"), bool):
                return None

            return {
                "is_job_related": result["is_job_related"],
                "intent": result.get("intent"),
                "extracted_company": result.get("company"),
                "extracted_position": result.get("position"),
                "confidence": result.get("confidence", "medium"),
                "interview_details": result.get("interview_details"),
                "reason": "LLM classification",
            }

    except Exception as e:
        print(f"[LLM] Classification failed: {e}")
        return None

"""Unit tests for the email parser — pure logic, no DB required."""

from app.services.email_parser import (
    classify_email, detect_intent, extract_company_from_email,
    extract_position_from_subject, has_job_keywords, is_ats_domain, match_company,
)


class TestIsAtsDomain:
    def test_greenhouse(self):
        assert is_ats_domain("noreply@greenhouse.io") is True

    def test_lever(self):
        assert is_ats_domain("jobs@lever.co") is True

    def test_linkedin(self):
        assert is_ats_domain("jobs-noreply@linkedin.com") is True

    def test_regular_email(self):
        assert is_ats_domain("john@gmail.com") is False

    def test_company_email(self):
        assert is_ats_domain("recruiter@google.com") is False


class TestHasJobKeywords:
    def test_application_received(self):
        assert has_job_keywords("Your application has been received", "") is True

    def test_interview_invitation(self):
        assert has_job_keywords("Interview invitation", "") is True

    def test_rejection(self):
        assert has_job_keywords("Update", "unfortunately we will not be moving forward") is True

    def test_regret_to_inform(self):
        assert has_job_keywords("Application update", "we regret to inform you") is True

    def test_unrelated(self):
        assert has_job_keywords("Your Amazon order has shipped", "Arriving Tuesday") is False


class TestDetectIntent:
    def test_application_confirmed(self):
        assert detect_intent("Your application was sent to Google", "") == "application_confirmed"

    def test_interview(self):
        assert detect_intent("Interview scheduled", "We'd like to schedule a phone screen") == "interview"

    def test_rejection_unfortunately(self):
        assert detect_intent("Application update", "unfortunately we have decided not to proceed") == "rejection"

    def test_rejection_not_moving_forward(self):
        assert detect_intent("Update on your application", "we will not be moving forward") == "rejection"

    def test_rejection_regret(self):
        assert detect_intent("Application Status", "we regret to inform you") == "rejection"

    def test_rejection_other_candidates(self):
        assert detect_intent("Update", "decided to move forward with other candidates") == "rejection"

    def test_offer(self):
        assert detect_intent("Congratulations!", "we are pleased to offer you") == "offer"

    def test_next_steps_is_interview(self):
        assert detect_intent("Next steps for your application", "") == "interview"

    def test_general(self):
        assert detect_intent("Application status update", "We are reviewing your profile") == "general"


class TestExtractCompany:
    def test_linkedin_application_sent(self):
        """LinkedIn emails should extract the actual company, NOT 'LinkedIn'."""
        result = extract_company_from_email(
            "jobs-noreply@linkedin.com",
            "Your application was sent to Google",
            ""
        )
        assert result == "Google"

    def test_linkedin_reviewing(self):
        result = extract_company_from_email(
            "jobs-noreply@linkedin.com",
            "Google is reviewing your application",
            ""
        )
        assert result == "Google"

    def test_greenhouse_with_company_in_subject(self):
        result = extract_company_from_email(
            "noreply@greenhouse.io",
            "Your application to Stripe - Software Engineer",
            ""
        )
        assert result == "Stripe"

    def test_direct_company_email(self):
        result = extract_company_from_email(
            "recruiting@metacto.com",
            "Interview invitation",
            ""
        )
        assert result == "Metacto"

    def test_company_in_snippet(self):
        result = extract_company_from_email(
            "noreply@lever.co",
            "Application update",
            "Thank you for your application to Acme Corp. We are reviewing"
        )
        # Should find from snippet
        assert result is not None

    def test_does_not_return_linkedin(self):
        """Should NEVER return 'LinkedIn' as a company name."""
        result = extract_company_from_email(
            "jobs-noreply@linkedin.com",
            "You have a new message",
            ""
        )
        assert result != "LinkedIn"
        assert result != "Linkedin"

    def test_does_not_return_greenhouse(self):
        result = extract_company_from_email(
            "noreply@greenhouse.io",
            "Application received",
            ""
        )
        assert result != "Greenhouse"


class TestExtractPosition:
    def test_dash_separated(self):
        result = extract_position_from_subject("Google - Software Engineer")
        assert result is not None
        assert "Engineer" in result

    def test_application_for(self):
        result = extract_position_from_subject("Your application for Full Stack Developer at Google")
        assert result is not None
        assert "Developer" in result

    def test_fs_engineer(self):
        result = extract_position_from_subject("2nd Interview - James - FS Engineer")
        assert result is not None


class TestMatchCompany:
    def test_exact_match(self):
        result = match_company(
            "noreply@google.com", "Your application", "", ["Google", "Meta"]
        )
        assert result == "Google"

    def test_no_match(self):
        result = match_company(
            "noreply@greenhouse.io", "Application update", "Thank you",
            ["Google", "Meta"],
        )
        assert result is None


class TestClassifyEmail:
    def test_ats_with_company_match_is_high(self):
        result = classify_email(
            "noreply@greenhouse.io",
            "Your application to Google - Software Engineer",
            "",
            ["Google", "Meta"],
        )
        assert result["is_job_related"] is True
        assert result["confidence"] == "high"
        assert result["matched_company"] == "Google"

    def test_rejection_intent_detected(self):
        result = classify_email(
            "hr@google.com",
            "Application update",
            "After careful consideration, we have decided to move forward with other candidates",
            ["Google"],
        )
        assert result["intent"] == "rejection"

    def test_linkedin_extracts_real_company(self):
        result = classify_email(
            "jobs-noreply@linkedin.com",
            "Your application was sent to Stripe",
            "",
            [],
        )
        assert result["extracted_company"] == "Stripe"
        assert result["extracted_company"] != "LinkedIn"

    def test_unrelated_email(self):
        result = classify_email(
            "noreply@amazon.com",
            "Your order has shipped",
            "Track your package",
            ["Google"],
        )
        assert result["is_job_related"] is False

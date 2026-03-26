"""Unit tests for the email parser — pure logic, no DB required."""

from app.services.email_parser import classify_email, has_job_keywords, is_ats_domain, match_company


class TestIsAtsDomain:
    def test_greenhouse(self):
        assert is_ats_domain("noreply@greenhouse.io") is True

    def test_lever(self):
        assert is_ats_domain("jobs@lever.co") is True

    def test_linkedin(self):
        assert is_ats_domain("jobs-noreply@linkedin.com") is True

    def test_workday(self):
        assert is_ats_domain("notification@myworkdayjobs.com") is True

    def test_regular_email(self):
        assert is_ats_domain("john@gmail.com") is False

    def test_company_email(self):
        assert is_ats_domain("recruiter@google.com") is False

    def test_empty(self):
        assert is_ats_domain("") is False


class TestHasJobKeywords:
    def test_application_received(self):
        assert has_job_keywords("Your application has been received", "") is True

    def test_interview_invitation(self):
        assert has_job_keywords("Interview invitation", "") is True

    def test_offer_letter(self):
        assert has_job_keywords("Your offer letter from Acme Corp", "") is True

    def test_rejection(self):
        assert has_job_keywords("Update on your application", "unfortunately we will not be moving forward") is True

    def test_next_steps(self):
        assert has_job_keywords("Next steps for your candidacy", "") is True

    def test_unrelated(self):
        assert has_job_keywords("Your Amazon order has shipped", "Arriving Tuesday") is False

    def test_newsletter(self):
        assert has_job_keywords("Weekly tech digest", "Top stories this week") is False


class TestMatchCompany:
    def test_exact_match_in_from(self):
        result = match_company(
            "noreply@google.com", "Your application", "", ["Google", "Meta"]
        )
        assert result == "Google"

    def test_fuzzy_match_in_subject(self):
        result = match_company(
            "noreply@greenhouse.io", "Your application to Google - Software Engineer", "",
            ["Google", "Meta", "Amazon"],
        )
        assert result == "Google"

    def test_fuzzy_match_in_snippet(self):
        result = match_company(
            "jobs@lever.co", "Application update", "Thank you for applying to Meta",
            ["Google", "Meta"],
        )
        assert result == "Meta"

    def test_no_match(self):
        result = match_company(
            "noreply@greenhouse.io", "Application update", "Thank you",
            ["Google", "Meta"],
        )
        assert result is None

    def test_empty_companies(self):
        result = match_company("noreply@google.com", "Test", "", [])
        assert result is None

    def test_case_insensitive(self):
        result = match_company(
            "NOREPLY@GOOGLE.COM", "APPLICATION", "", ["google"]
        )
        assert result == "google"


class TestClassifyEmail:
    def test_ats_domain_with_company_match_is_high_confidence(self):
        result = classify_email(
            "noreply@greenhouse.io",
            "Your application to Google - Software Engineer",
            "",
            ["Google", "Meta"],
        )
        assert result["is_job_related"] is True
        assert result["confidence"] == "high"
        assert result["matched_company"] == "Google"

    def test_keywords_with_company_match_is_medium(self):
        result = classify_email(
            "recruiter@google.com",
            "Interview invitation - Software Engineer",
            "",
            ["Google"],
        )
        assert result["is_job_related"] is True
        assert result["confidence"] == "medium"
        assert result["matched_company"] == "Google"

    def test_ats_domain_no_match_is_medium(self):
        result = classify_email(
            "noreply@lever.co",
            "Application received",
            "Thank you for your interest in Acme Corp",
            ["Google", "Meta"],
        )
        assert result["is_job_related"] is True
        assert result["confidence"] == "medium"

    def test_keywords_only_is_low(self):
        result = classify_email(
            "hr@unknowncompany.com",
            "Your application status update",
            "",
            ["Google"],
        )
        assert result["is_job_related"] is True
        assert result["confidence"] == "low"

    def test_unrelated_email(self):
        result = classify_email(
            "noreply@amazon.com",
            "Your order has shipped",
            "Track your package",
            ["Google", "Meta"],
        )
        assert result["is_job_related"] is False
        assert result["confidence"] is None
        assert result["matched_company"] is None

    def test_empty_tracked_companies(self):
        result = classify_email(
            "noreply@greenhouse.io",
            "Application update",
            "",
            [],
        )
        assert result["is_job_related"] is True
        assert result["confidence"] == "medium"  # ATS domain only

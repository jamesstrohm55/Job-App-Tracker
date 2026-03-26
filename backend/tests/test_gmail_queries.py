"""Unit tests for Gmail query builder."""

from datetime import datetime, timezone

from app.utils.gmail_queries import build_job_email_query


def test_query_without_date():
    query = build_job_email_query()
    assert "from:greenhouse.io" in query
    assert "from:lever.co" in query
    assert "subject:" in query
    assert "after:" not in query


def test_query_with_date():
    dt = datetime(2026, 3, 1, tzinfo=timezone.utc)
    query = build_job_email_query(after_date=dt)
    assert "after:2026/03/01" in query
    assert "from:greenhouse.io" in query

"""Unit tests for JWT utilities."""

from app.utils.jwt import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_refresh_token,
)
from jose import JWTError
import pytest


class TestAccessToken:
    def test_create_and_decode(self):
        token = create_access_token("user-123", "user@example.com")
        payload = decode_access_token(token)
        assert payload["sub"] == "user-123"
        assert payload["email"] == "user@example.com"
        assert payload["type"] == "access"

    def test_invalid_token_raises(self):
        with pytest.raises(JWTError):
            decode_access_token("invalid-token")

    def test_tampered_token_raises(self):
        token = create_access_token("user-123", "user@example.com")
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(JWTError):
            decode_access_token(tampered)


class TestRefreshToken:
    def test_create_returns_pair(self):
        raw, hashed = create_refresh_token()
        assert raw != hashed
        assert len(raw) == 36  # UUID format
        assert len(hashed) == 64  # SHA-256 hex

    def test_hash_is_deterministic(self):
        raw, hashed = create_refresh_token()
        assert hash_refresh_token(raw) == hashed

    def test_different_tokens_have_different_hashes(self):
        _, hash1 = create_refresh_token()
        _, hash2 = create_refresh_token()
        assert hash1 != hash2

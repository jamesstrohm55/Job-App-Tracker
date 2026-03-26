"""Unit tests for encryption service."""

from cryptography.fernet import Fernet


TEST_KEY = Fernet.generate_key().decode()


def test_fernet_roundtrip():
    """Test encrypt/decrypt directly using Fernet (bypasses settings)."""
    f = Fernet(TEST_KEY.encode())
    original = "my-secret-refresh-token"
    encrypted = f.encrypt(original.encode())

    assert encrypted != original.encode()
    assert isinstance(encrypted, bytes)

    decrypted = f.decrypt(encrypted).decode()
    assert decrypted == original


def test_fernet_different_ciphertexts():
    """Fernet uses random IV, so same plaintext produces different ciphertexts."""
    f = Fernet(TEST_KEY.encode())
    token = "same-token"
    enc1 = f.encrypt(token.encode())
    enc2 = f.encrypt(token.encode())
    assert enc1 != enc2

    # But both decrypt to the same value
    assert f.decrypt(enc1).decode() == token
    assert f.decrypt(enc2).decode() == token


def test_generate_key():
    from app.services.encryption import generate_key

    key = generate_key()
    assert len(key) == 44  # Base64-encoded 32 bytes
    Fernet(key.encode())

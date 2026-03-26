from cryptography.fernet import Fernet

from app.config import settings


def _get_fernet() -> Fernet:
    key = settings.gmail_encryption_key
    if not key:
        raise RuntimeError("GMAIL_ENCRYPTION_KEY is not configured")
    return Fernet(key.encode())


def encrypt_token(plaintext: str) -> bytes:
    return _get_fernet().encrypt(plaintext.encode())


def decrypt_token(ciphertext: bytes) -> str:
    return _get_fernet().decrypt(ciphertext).decode()


def generate_key() -> str:
    """Generate a new Fernet key. Run this once to create your GMAIL_ENCRYPTION_KEY."""
    return Fernet.generate_key().decode()

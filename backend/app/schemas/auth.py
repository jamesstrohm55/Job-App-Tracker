from pydantic import BaseModel


class GoogleAuthRequest(BaseModel):
    code: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    picture_url: str | None = None


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    type: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class TwoFASetupResponse(BaseModel):
    secret: str
    qr_code_uri: str
    message: str = "Scan QR code with Google Authenticator or Authy"


class TwoFAEnableRequest(BaseModel):
    totp_code: str


class TwoFADisableRequest(BaseModel):
    totp_code: str
    password: str

from pydantic import BaseModel
from typing import Optional
from app.variable import *

class User(BaseModel):
    user_id: str

 

class UpdateUserForm(BaseModel):
    name: str


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class OAuthExchangeRequest(BaseModel):
    auth_code: str

class OAuthExchangeResponse(TokenResponse):
    usertype: str

class GoogleConsentRequest(BaseModel):
    consent_code: str
    agreed_to_terms: bool
    agreed_to_privacy: bool


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    email: str
    club_name: str
    club_code: str
    agreed_to_terms: bool
    agreed_to_privacy: bool

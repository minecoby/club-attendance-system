from pydantic import BaseModel
from app.variable import *

class User(BaseModel):
    user_id: str

 

class UpdateUserForm(BaseModel):
    name: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    usertype: str

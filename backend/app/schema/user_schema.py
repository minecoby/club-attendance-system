from pydantic import BaseModel
from app.variable import *

class User(BaseModel):
    user_id: str

class SigninForm(User):
    password: str
    name: str
    club_code: str
class LoginForm(User):
    password: str
    
class LeaderForm(User):
    is_leader: bool = False 

class UpdateUserForm(BaseModel):
    name: str

class ChangePasswordForm(BaseModel):
    old_password: str
    new_password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    usertype: str

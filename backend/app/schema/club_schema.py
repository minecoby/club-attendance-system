from pydantic import BaseModel
from app.variable import *


class JoinForm(BaseModel):
    club_code: str
from pydantic import BaseModel
from app.variable import *


class ClubForm(BaseModel):
    club_code: str
from pydantic import BaseModel
from typing import List



class DateListRequest(BaseModel):
    dates: List[str]

class KickForm(BaseModel):
    user_id: str
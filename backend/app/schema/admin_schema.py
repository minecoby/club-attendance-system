from pydantic import BaseModel
from typing import List



class DateListRequest(BaseModel):
    dates: List[str]
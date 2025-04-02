from pydantic import BaseModel



class DateRequest(BaseModel):
    date: str

class KickForm(BaseModel):
    user_id: str
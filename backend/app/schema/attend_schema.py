from pydantic import BaseModel

class AttendanceCheckRequest(BaseModel):
    club_code: str
    code: str
    
class ClubForm(BaseModel):
    club_code: str
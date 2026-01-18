from pydantic import BaseModel
from typing import List, Optional


class AttendanceCheckRequest(BaseModel):
    club_code: str
    code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class QRAttendanceCheckRequest(BaseModel):
    qr_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
class ClubForm(BaseModel):
    club_code: str


class AttendanceUpdateItem(BaseModel):
    user_id: str
    status: bool

class AttendanceBulkUpdateRequest(BaseModel):
    attendance_date_id: int
    attendances: List[AttendanceUpdateItem]
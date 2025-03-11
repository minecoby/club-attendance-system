from fastapi import APIRouter, Depends,WebSocket
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.variable import *
from app.schema.admin_schema import *
from app.services.admin_service import *
from app.services.service import *
from datetime import datetime
from typing import Dict
from app.models import AttendanceDate
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

router = APIRouter(
    prefix="/admin",
)

class ClubManager:
    def __init__(self):
        self.clubs: Dict[str, WebSocket] = {}








@router.post("/add_date")
async def add_date(data: DateListRequest, token: str, db: AsyncSession = Depends(get_db)):
    user = await get_current_user(token, db)

    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 추가가능합니다.")

    club_code = await get_leader_club_code(user.user_id, db)

    new_dates = []
    for date_str in data.dates:
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()  
        except ValueError:
            raise HTTPException(status_code=400, detail=f"올바르지 않은 형식: {date_str}")

        new_date = AttendanceDate(club_code=club_code, date=date_obj, set_by=user.user_id)
        db.add(new_date)
        new_dates.append(new_date)

    await db.commit()  
    return {"message": f"데이터가 정상적으로 추가되었습니다.", "dates": data.dates}

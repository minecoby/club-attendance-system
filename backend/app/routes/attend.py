from fastapi import APIRouter, Depends, Security, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.variable import *
from app.services.service import *
from app.services.club_service import *
from app.services.attend_service import *
from app.routes.admin import attendance_ws 
from app.schema.attend_schema import *
from app.schema.club_schema import *
import asyncio
from fastapi_limiter.depends import RateLimiter

security = HTTPBearer()

router = APIRouter(
    prefix="/attend",
)

@router.post("/check", dependencies=[Depends(RateLimiter(times=100, seconds=10))])
async def check_attendance(
    data: AttendanceCheckRequest, credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    user = await get_current_user(token, db)
    club_code = await check_joining(user.user_id, data.club_code, db)
    current = attendance_ws.attendance_codes.get(data.club_code)

    if not current:
        raise HTTPException(status_code=404, detail="출석 코드가 활성화되어 있지 않습니다.")

    if current["code"] != data.code:
        raise HTTPException(status_code=400, detail="출석 코드가 일치하지 않습니다.")
    
    date = current["date"]
    date_id = await get_date_id(date, data.club_code, db)
    
    await asyncio.gather(
        attend_date(user.user_id, date_id, db)
    )

    return {"message": "출석이 확인되었습니다."}

@router.get("/load_myattend/{club_code}")
async def load_attend(
    club_code: str,
    credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    user = await get_current_user(token, db)
    return await load_myattend(club_code,user.user_id,db)


@router.put("/attendance/bulk_update")
async def bulk_update_attendance_api(
    req: AttendanceBulkUpdateRequest,
    db=Depends(get_db)
):
    return await bulk_update_attendance(req.attendance_date_id, req.attendances, db)

# 날짜와 club_code로 attendance_date_id 반환
@router.get("/get_date_id")
async def get_attendance_date_id(date: str, club_code: str, db: AsyncSession = Depends(get_db)):
    attendance_date_id = await get_date_id(date, club_code, db)
    return {"attendance_date_id": attendance_date_id}
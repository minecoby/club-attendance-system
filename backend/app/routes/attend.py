from fastapi import APIRouter,Depends,Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.variable import *
from app.services.service import *
from app.services.club_service import *
from app.services.attend_service import *
from app.routes.admin import attendance_ws 
from app.schema.attend_schema import *
security = HTTPBearer()

router = APIRouter(
    prefix="/attend",
)

@router.post("/attendance/check")
async def check_attendance(
    data: AttendanceCheckRequest,credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    user = await get_current_user(token, db)
    club_code = await check_joining(user.user_id,data.club_code,db)
    current = attendance_ws.attendance_codes.get(data.club_code)
    

    if not current:
        raise HTTPException(status_code=404, detail="출석 코드가 활성화되어 있지 않습니다.")

    if current["code"] != data.code:
        raise HTTPException(status_code=400, detail="출석 코드가 일치하지 않습니다.")
    date = current["date"]
    date_obj = datetime.strptime(date, "%Y-%m-%d").date()
    date_id = await get_date_id(date_obj,data.club_code,db)
    await attend_date(user.user_id,date_id,db)

    return {"message": "출석이 확인되었습니다."}
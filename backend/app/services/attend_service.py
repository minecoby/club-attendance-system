from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from sqlalchemy import select
from app.models import Attendance,AttendanceDate
from datetime import datetime
from zoneinfo import ZoneInfo

#출석날짜 연동
async def get_date_id(date: str,club_code: str,  db: AsyncSession) -> int:
    result = await db.execute(
        select(AttendanceDate).where(AttendanceDate.date == date,AttendanceDate.club_code == club_code)
    )
    attendance_date = result.scalar_one_or_none()
    if not attendance_date:
        raise HTTPException(status_code=404, detail="해당 날짜의 출석 일정이 존재하지 않습니다.")
    return attendance_date.id

#유저 출석기능
async def attend_date(user_id: str, date_id, db: AsyncSession):
    result = await db.execute(
        select(Attendance).where(
            Attendance.user_id == user_id,
            Attendance.attendance_date_id == date_id
        )
    )
    existing_attendance = result.scalar_one_or_none()

    if existing_attendance:
        raise HTTPException(status_code=409, detail="이미 출석이 등록되었습니다.")

    new_attendance = Attendance(
        user_id=user_id,
        attendance_date_id=date_id,
        status=True,
    )
    db.add(new_attendance)
    await db.commit()
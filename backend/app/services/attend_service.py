from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from sqlalchemy import select,delete
from app.models import Attendance,AttendanceDate
from datetime import datetime, date
from zoneinfo import ZoneInfo

# 출석날짜 연동
async def get_date_id(date, club_code: str, db: AsyncSession) -> int:
    # date가 문자열인 경우 date 객체로 변환
    if isinstance(date, str):
        try:
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="날짜 형식이 잘못되었습니다. (예: 2025-05-15)")
    # date가 이미 date 객체인 경우 그대로 사용
    else:
        date_obj = date

    result = await db.execute(
        select(AttendanceDate).where(
            AttendanceDate.date == date_obj,
            AttendanceDate.club_code == club_code
        )
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

async def load_myattend(club_code, user_id: str, db: AsyncSession):
    result = await db.execute(
        select(AttendanceDate)
        .where(AttendanceDate.club_code == club_code)
    )
    dates = result.scalars().all()
    
    attendances = []
    for attendance_date in dates:
        attendance_result = await db.execute(
            select(Attendance)
            .where(Attendance.attendance_date_id == attendance_date.id, Attendance.user_id == user_id)
        )
        attendance = attendance_result.scalar_one_or_none()
        if attendance:
            attendances.append({
                "date": attendance_date.date,
                "status": attendance.status})
        else:
            attendances.append({
                "date": attendance_date.date,
                "status": None
            })
    
    return attendances

async def bulk_update_attendance(attendance_date_id: int, attendances: list, db):
    await db.execute(
        delete(Attendance).where(Attendance.attendance_date_id == attendance_date_id)
    )
    for item in attendances:
        new_attendance = Attendance(
            user_id=item.user_id,
            attendance_date_id=attendance_date_id,
            status=item.status  
        )
        db.add(new_attendance)
    await db.commit()
    return {"message": "출석 정보가 업데이트되었습니다."}
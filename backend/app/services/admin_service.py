from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from sqlalchemy import select, join
from app.models import StuClub,Attendance,AttendanceDate,User
from datetime import datetime



async def get_leader_club_code(user_id: str, db: AsyncSession) -> str:
    result = await db.execute(select(StuClub.club_code).where(StuClub.user_id == user_id))
    club_code = result.scalar_one_or_none()

    if club_code is None:
        raise HTTPException(status_code=404, detail="어느 클럽에도 속해있지않음")
    
    return club_code

async def load_attendance(user, date, db: AsyncSession):
    result = await db.execute(
        select(StuClub.club_code).where(StuClub.user_id == user.user_id)
    )
    club_code = result.scalar()
    if not club_code:
        raise HTTPException(status_code=404, detail="동아리가 존재하지않습니다 관리자에게 문의해주세요")

    stmt = (
        select(
            User.user_id,
            User.name,
            Attendance.status,
            Attendance.timestamp
        )
        .select_from(
            join(StuClub, User, StuClub.user_id == User.user_id)
            .join(AttendanceDate, AttendanceDate.club_code == StuClub.club_code)
            .outerjoin(Attendance, 
                (Attendance.user_id == User.user_id) & 
                (Attendance.attendance_date_id == AttendanceDate.id)
            )
        )
        .where(
            StuClub.club_code == club_code,
            AttendanceDate.date == datetime.strptime(date, "%Y-%m-%d").date()
        )
        .order_by(User.name)
    )

    result = await db.execute(stmt)
    records = result.all()

    return [
        {
            "user_id": r.user_id,
            "name": r.name,
            "status": r.status,
            "timestamp": r.timestamp
        }
        for r in records
    ]
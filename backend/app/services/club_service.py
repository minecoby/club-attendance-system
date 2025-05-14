from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from sqlalchemy.orm import joinedload

from app.models import Club, StuClub, Attendance, AttendanceDate
from app.variable import *

#존재하는 동아리인지 체크
async def check_club(code: str, db: AsyncSession):
    data = await db.execute(select(Club).where(Club.club_code == code))

    if data.scalars().first() is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 동아리코드")
    return

#동아리 가입
async def joining_club(user_id: str, code: str, db: AsyncSession):
    try:
        # 중복 가입 방지 (동일 코드)
        await join_duplicate(user_id, code, db)
        new_member = StuClub(user_id= user_id, club_code= code)
        db.add(new_member)
        await db.commit()
        await db.refresh(new_member)
        return new_member
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail="데이터베이스 오류")
    
#유저 동아리 가입여부 확인
async def check_joining(id:str,code:str, db: AsyncSession):
    data = await db.execute(select(StuClub).where(StuClub.club_code == code, StuClub.user_id == id))
    if data.scalars().first() is None:
        raise HTTPException(status_code=404, detail="동아리가입되지않음")
    return data
async def join_duplicate(id:str,code:str, db: AsyncSession):
    data = await db.execute(select(StuClub).where(StuClub.club_code == code, StuClub.user_id == id))
    if data.scalars().one_or_none() is not None:
        raise HTTPException(status_code=409, detail="이미 가입한 동아리입니다.")
    return

#유저 동아리 탈퇴
async def club_quit(id:str, code: str , db: AsyncSession):
    data = await check_joining(id,code,db)
    try:
        # 1. 해당 동아리의 모든 출석 날짜 id 조회
        date_ids_result = await db.execute(
            select(AttendanceDate.id).where(AttendanceDate.club_code == code)
        )
        date_ids = [row[0] for row in date_ids_result.all()]
        if date_ids:
            # 2. 해당 유저의 출석 기록 삭제
            await db.execute(
                Attendance.__table__.delete().where(
                    Attendance.user_id == id,
                    Attendance.attendance_date_id.in_(date_ids)
                )
            )
        # 3. 동아리 가입 정보 삭제
        data = data.scalars().first()
        db.delete(data)
        await db.commit()
        return 
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="데이터베이스 오류")
    
#가입한 동아리 목록 조회
async def get_club_info(id:str, db: AsyncSession):
    result = await db.execute(
        select(StuClub, Club.club_name)
        .join(Club, StuClub.club_code == Club.club_code)
        .where(StuClub.user_id == id)
    )
    clubs = result.all()
    if not clubs:
        return []
    return [
        {"club_code": sc.StuClub.club_code, "club_name": sc.club_name}
        for sc in clubs
    ]

async def get_club_admin(id:str, db: AsyncSession):
    data = await db.execute(select(StuClub).where(StuClub.user_id == id))
    data = data.scalars().first()
    if data is None:
        return None
    return data.club_code
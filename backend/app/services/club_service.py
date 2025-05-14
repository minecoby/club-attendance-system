from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException

from app.models import Club, StuClub
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
        # 이미 가입된 모든 동아리에서 탈퇴
        existing = await db.execute(select(StuClub).where(StuClub.user_id == user_id))
        for stuclub in existing.scalars().all():
            await db.delete(stuclub)
        await db.commit()
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
        data = data.scalars().first()
        db.delete(data)
        db.commit()
        return 
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail="데이터베이스 오류")
    
#가입한 동아리 목록 조회
async def get_club_info(id:str, db: AsyncSession):
    data = await db.execute(select(StuClub).where(StuClub.user_id == id))
    data = data.scalars().all()
    if data is None:
        return None
    return data

async def get_club_admin(id:str, db: AsyncSession):
    data = await db.execute(select(StuClub).where(StuClub.user_id == id))
    data = data.scalars().first()
    if data is None:
        return None
    return data.club_code
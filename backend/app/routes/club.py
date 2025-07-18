from fastapi import APIRouter, Depends, Security
from fastapi.security import  HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.variable import *
from app.schema.club_schema import *
from app.services.club_service import *
from app.services.service import *
from app.models import User, StuClub
from sqlalchemy.future import select
from fastapi import HTTPException

security = HTTPBearer()


router = APIRouter(
    prefix="/clubs",
)




#동아리 가입
@router.post("/join_club")
async def join_club(data: ClubForm, credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    #존재하는 동아리인지 체크 
    token = credentials.credentials
    await check_club(data.club_code,db)
    
    #유저정보 불러오기 
    user = await get_current_user(token, db)

    #동아리가입 
    await joining_club(user.user_id, data.club_code,db)
    return "정상적으로 가입이 완료되었습니다."

#동아리 탈퇴 
@router.post("/quit_club")
async def quit_club(data: ClubForm, credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    #유저정보 불러오기
    user = await get_current_user(token, db)
    
    #동아리 탈퇴 
    await club_quit(user.user_id, data.club_code,db)

@router.get("/get_club_info")
async def get_club(credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    user = await get_current_user(token, db)
    return await get_club_info(user.user_id, db)

@router.get("/get_members")
async def get_members(credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    user = await get_current_user(token, db)
    # 리더만 허용
    if not user.is_leader:
        raise HTTPException(status_code=403, detail="리더만 접근 가능합니다.")
    # 리더의 club_code 찾기
    result = await db.execute(select(StuClub).where(StuClub.user_id == user.user_id))
    stuclub = result.scalars().first()
    if not stuclub:
        raise HTTPException(status_code=404, detail="동아리 정보 없음")
    club_code = stuclub.club_code
    # 해당 club_code의 모든 멤버 조회
    result = await db.execute(
        select(User.user_id, User.name)
        .join(StuClub, User.user_id == StuClub.user_id)
        .where(StuClub.club_code == club_code)
    )
    members = [{"user_id": r.user_id, "name": r.name} for r in result.all()]
    return members



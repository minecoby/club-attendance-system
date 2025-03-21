from fastapi import APIRouter, Depends, Security
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import  HTTPBearer, HTTPAuthorizationCredentials
from app.db import get_db
from app.variable import *
from app.schema.user_schema import *
from app.services.user_service import *
from app.services.service import *

from app.services.club_service import get_club_info

security = HTTPBearer()

router = APIRouter(
    prefix="/users",
)
# 사용자 등록
@router.post("/signin")
async def create_user(data: SigninForm, db: AsyncSession = Depends(get_db)):
    #유저 중복 확인
    await check_duplicate_user(data,db)

    #유저 추가
    return await create_user_db(data, db)


@router.post("/login")
async def login(data: LoginForm, db: AsyncSession = Depends(get_db)):
    await get_user(data, db)
    access_token = create_access_token(data={"sub": data.user_id})
    refresh_token = create_refresh_token(data={"sub": data.user_id})
    return {"로그인여부" : "성공" ,"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.get("/get_mydata")
async def get_mydata(credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):

    token = credentials.credentials
    #유저정보 불러오기
    user = await get_current_user(token, db)

    #가입한 동아리 목록 불러오기
    club_data = await get_club_info(user.user_id,db)
    user_data = await get_user_info(user.user_id,db)

    return {"user_data": user_data, "club_data": club_data}
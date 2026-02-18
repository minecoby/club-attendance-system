from fastapi import APIRouter, Depends, Security, Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
from app.db import get_db
from app.variable import *
from app.schema.club_schema import *
from app.services.club_service import *
from app.services.service import *
from app.models import User, StuClub
from app.logger import get_club_logger

club_logger = get_club_logger()
security = HTTPBearer(auto_error=False)

router = APIRouter(
    prefix="/clubs",
)


@router.post("/join_club")
async def join_club(
    data: ClubForm,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db)
):
    token = get_access_token_from_request(request, credentials)
    await check_club(data.club_code, db)

    user = await get_current_user(token, db)
    await joining_club(user.user_id, data.club_code, db)
    return "정상적으로 가입이 완료되었습니다."


@router.post("/quit_club")
async def quit_club(
    data: ClubForm,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db)
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    await club_quit(user.user_id, data.club_code, db)


@router.get("/get_club_info")
async def get_club(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db)
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    return await get_club_info(user.user_id, db)


@router.get("/get_members")
async def get_members(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db)
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)

    if not user.is_leader:
        raise HTTPException(status_code=403, detail="리더만 접근 가능합니다.")

    result = await db.execute(select(StuClub).where(StuClub.user_id == user.user_id))
    stuclub = result.scalars().first()
    if not stuclub:
        raise HTTPException(status_code=404, detail="동아리 정보 없음")

    club_code = stuclub.club_code
    result = await db.execute(
        select(User.user_id, User.name)
        .join(StuClub, User.user_id == StuClub.user_id)
        .where(StuClub.club_code == club_code)
        .where(User.is_leader == False)
    )
    members = [{"user_id": r.user_id, "name": r.name} for r in result.all()]
    return members

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.variable import *
from app.schema.club_schema import *
from app.services.club_service import *
from app.services.service import *

router = APIRouter(
    prefix="/clubs",
)





@router.post("/join_club")
async def join_club(data: JoinForm, token: str, db: AsyncSession = Depends(get_db)):
    #존재하는 동아리인지 체크 
    await check_club(data.club_code,db)
    
    #유저정보 불러오기 
    user = await get_current_user(token, db)

    #동아리가입 
    await joining_club(user.user_id, data.club_code,db)
    return "정상적으로 가입이 완료되었습니다."
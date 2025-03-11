from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models import StuClub




async def get_leader_club_code(user_id: str, db: AsyncSession) -> str:
    result = await db.execute(select(StuClub.club_code).where(StuClub.user_id == user_id))
    club_code = result.scalar_one_or_none()

    if club_code is None:
        raise HTTPException(status_code=404, detail="어느 클럽에도 속해있지않음")
    
    return club_code

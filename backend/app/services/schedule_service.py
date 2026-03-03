from fastapi import HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import ClubSchedule
from app.services.club_service import check_joining


async def create_schedule(
    club_code: str,
    title: str,
    description: str | None,
    scheduled_at,
    created_by: str,
    db: AsyncSession,
):
    schedule = ClubSchedule(
        club_code=club_code,
        title=title.strip(),
        description=description.strip() if description else None,
        scheduled_at=scheduled_at,
        created_by=created_by,
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule


async def list_schedules_by_club(club_code: str, db: AsyncSession):
    result = await db.execute(
        select(ClubSchedule)
        .where(ClubSchedule.club_code == club_code)
        .order_by(ClubSchedule.scheduled_at.asc(), ClubSchedule.id.asc())
    )
    return result.scalars().all()


async def delete_schedule_for_club(schedule_id: int, club_code: str, db: AsyncSession):
    result = await db.execute(
        select(ClubSchedule).where(
            ClubSchedule.id == schedule_id,
            ClubSchedule.club_code == club_code,
        )
    )
    schedule = result.scalars().first()
    if not schedule:
        raise HTTPException(status_code=404, detail="일정을 찾을 수 없습니다.")

    await db.execute(delete(ClubSchedule).where(ClubSchedule.id == schedule_id))
    await db.commit()
    return {"message": "일정이 삭제되었습니다."}


async def update_schedule_for_club(
    schedule_id: int,
    club_code: str,
    title: str,
    description: str | None,
    scheduled_at,
    db: AsyncSession,
):
    result = await db.execute(
        select(ClubSchedule).where(
            ClubSchedule.id == schedule_id,
            ClubSchedule.club_code == club_code,
        )
    )
    schedule = result.scalars().first()
    if not schedule:
        raise HTTPException(status_code=404, detail="일정을 찾을 수 없습니다.")

    schedule.title = title.strip()
    schedule.description = description.strip() if description else None
    schedule.scheduled_at = scheduled_at
    await db.commit()
    await db.refresh(schedule)
    return schedule


async def list_member_schedules(club_code: str, user_id: str, db: AsyncSession):
    await check_joining(user_id, club_code, db)
    return await list_schedules_by_club(club_code, db)

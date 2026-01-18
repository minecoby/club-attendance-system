from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from app.models import Club
from app.utils.geo import is_within_radius


async def get_club_location_settings(club_code: str, db: AsyncSession) -> dict:
    #동아리의 위치 설정을 조회
    result = await db.execute(select(Club).where(Club.club_code == club_code))
    club = result.scalars().first()

    if club is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 동아리입니다.")

    return {
        "location_enabled": club.location_enabled,
        "latitude": club.latitude,
        "longitude": club.longitude,
        "radius_km": club.radius_km
    }


async def validate_location(
    club_code: str,
    user_latitude: float | None,
    user_longitude: float | None,
    db: AsyncSession
) -> None:
    #사용자 위치를 검증
    result = await db.execute(select(Club).where(Club.club_code == club_code))
    club = result.scalars().first()

    if club is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 동아리입니다.")

    if not club.location_enabled:
        return

    if user_latitude is None or user_longitude is None:
        raise HTTPException(
            status_code=400,
            detail="위치 권한을 허용해 주세요."
        )

    if club.latitude is None or club.longitude is None:
        return

    if not is_within_radius(
        user_latitude,
        user_longitude,
        club.latitude,
        club.longitude,
        club.radius_km
    ):
        raise HTTPException(
            status_code=400,
            detail="출석 허용 범위를 벗어났습니다."
        )


async def update_club_location(
    club_code: str,
    location_enabled: bool,
    latitude: float | None,
    longitude: float | None,
    radius_km: float | None,
    db: AsyncSession
) -> dict:
    #동아리의 위치 설정 업데이트
    result = await db.execute(select(Club).where(Club.club_code == club_code))
    club = result.scalars().first()

    if club is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 동아리입니다.")

    club.location_enabled = location_enabled
    club.latitude = latitude
    club.longitude = longitude
    if radius_km is not None:
        club.radius_km = radius_km

    await db.commit()
    await db.refresh(club)

    return {
        "location_enabled": club.location_enabled,
        "latitude": club.latitude,
        "longitude": club.longitude,
        "radius_km": club.radius_km
    }

from datetime import datetime
from io import BytesIO
from urllib.parse import quote

import pandas as pd
from fastapi import HTTPException
from sqlalchemy import delete, join, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Attendance, AttendanceDate, AttendanceSeason, AttendanceSeasonMember, StuClub, User
from app.services.club_service import check_joining


async def get_leader_club_code(user_id: str, db: AsyncSession) -> str:
    result = await db.execute(select(StuClub.club_code).where(StuClub.user_id == user_id))
    club_code = result.scalars().one_or_none()

    if club_code is None:
        raise HTTPException(status_code=404, detail="가입된 동아리가 없습니다.")

    return club_code


async def get_active_attendance_season(club_code: str, db: AsyncSession, created_by: str | None = None):
    result = await db.execute(
        select(AttendanceSeason)
        .where(AttendanceSeason.club_code == club_code, AttendanceSeason.is_active == True)
        .order_by(AttendanceSeason.id.desc())
    )
    season = result.scalars().first()
    if season:
        return season

    season = AttendanceSeason(
        club_code=club_code,
        name="현재 시즌",
        is_active=True,
        created_by=created_by,
    )
    db.add(season)
    await db.flush()
    return season


async def get_attendance_season_or_active(club_code: str, db: AsyncSession, season_id: int | None = None):
    if season_id is None:
        return await get_active_attendance_season(club_code, db)

    result = await db.execute(
        select(AttendanceSeason).where(
            AttendanceSeason.club_code == club_code,
            AttendanceSeason.id == season_id,
        )
    )
    season = result.scalars().first()
    if not season:
        raise HTTPException(status_code=404, detail="해당 출석 시즌이 존재하지 않습니다.")
    return season


async def list_attendance_seasons(club_code: str, db: AsyncSession):
    result = await db.execute(
        select(AttendanceSeason)
        .where(AttendanceSeason.club_code == club_code)
        .order_by(
            AttendanceSeason.is_active.desc(),
            AttendanceSeason.created_at.desc(),
            AttendanceSeason.id.desc(),
        )
    )
    seasons = result.scalars().all()
    return [
        {
            "id": season.id,
            "name": season.name,
            "is_active": season.is_active,
            "created_at": season.created_at,
            "archived_at": season.archived_at,
        }
        for season in seasons
    ]


async def _get_current_member_rows(club_code: str, db: AsyncSession):
    result = await db.execute(
        select(User.user_id, User.name)
        .join(StuClub, StuClub.user_id == User.user_id)
        .where(StuClub.club_code == club_code)
        .where(User.is_leader == False)
        .order_by(User.name)
    )
    return result.all()


async def _snapshot_season_members(season: AttendanceSeason, club_code: str, db: AsyncSession):
    members = await _get_current_member_rows(club_code, db)
    await db.execute(delete(AttendanceSeasonMember).where(AttendanceSeasonMember.season_id == season.id))

    for member in members:
        db.add(
            AttendanceSeasonMember(
                season_id=season.id,
                club_code=club_code,
                user_id=member.user_id,
                name=member.name,
                archived_at=datetime.utcnow(),
            )
        )

    await db.flush()
    return members


async def start_new_attendance_season(club_code: str, name: str | None, user, db: AsyncSession):
    try:
        active_season = await get_active_attendance_season(club_code, db, user.user_id)
        members = await _snapshot_season_members(active_season, club_code, db)
        member_ids = [member.user_id for member in members]
        archived_at = datetime.utcnow()
        archive_name = name.strip() if name and name.strip() else archived_at.strftime("%Y-%m-%d 출석부")

        await db.execute(
            update(AttendanceSeason)
            .where(AttendanceSeason.id == active_season.id)
            .values(name=archive_name, is_active=False, archived_at=archived_at)
        )

        if member_ids:
            await db.execute(
                delete(StuClub).where(
                    StuClub.club_code == club_code,
                    StuClub.user_id.in_(member_ids),
                )
            )

        new_season = AttendanceSeason(
            club_code=club_code,
            name="현재 시즌",
            is_active=True,
            created_by=user.user_id,
        )
        db.add(new_season)
        await db.commit()
        await db.refresh(new_season)
        return {
            "message": "이전 출석부를 아카이브하고 새 출석부를 시작했습니다.",
            "removed_member_count": len(member_ids),
            "archived_season": {
                "id": active_season.id,
                "name": archive_name,
                "is_active": False,
                "archived_at": archived_at,
            },
            "season": {
                "id": new_season.id,
                "name": new_season.name,
                "is_active": new_season.is_active,
                "created_at": new_season.created_at,
                "archived_at": new_season.archived_at,
            },
        }
    except SQLAlchemyError:
        await db.rollback()
        raise HTTPException(status_code=500, detail="새 출석부 시작 중 데이터베이스 오류가 발생했습니다.")


async def load_attendance(user, date, db: AsyncSession, season_id: int | None = None):
    club_code = await get_leader_club_code(user.user_id, db)
    season = await get_attendance_season_or_active(club_code, db, season_id)
    target_date = datetime.strptime(date, "%Y-%m-%d").date()

    if season.is_active:
        stmt = (
            select(
                User.user_id,
                User.name,
                Attendance.status,
                Attendance.timestamp,
            )
            .select_from(
                join(StuClub, User, StuClub.user_id == User.user_id)
                .join(AttendanceDate, AttendanceDate.club_code == StuClub.club_code)
                .outerjoin(
                    Attendance,
                    (Attendance.user_id == User.user_id)
                    & (Attendance.attendance_date_id == AttendanceDate.id),
                )
            )
            .where(
                StuClub.club_code == club_code,
                AttendanceDate.season_id == season.id,
                AttendanceDate.date == target_date,
                User.is_leader == False,
            )
            .order_by(User.name)
        )
    else:
        stmt = (
            select(
                AttendanceSeasonMember.user_id,
                AttendanceSeasonMember.name,
                Attendance.status,
                Attendance.timestamp,
            )
            .select_from(AttendanceSeasonMember)
            .join(
                AttendanceDate,
                (AttendanceDate.club_code == AttendanceSeasonMember.club_code)
                & (AttendanceDate.season_id == AttendanceSeasonMember.season_id),
            )
            .outerjoin(
                Attendance,
                (Attendance.user_id == AttendanceSeasonMember.user_id)
                & (Attendance.attendance_date_id == AttendanceDate.id),
            )
            .where(
                AttendanceSeasonMember.club_code == club_code,
                AttendanceSeasonMember.season_id == season.id,
                AttendanceDate.date == target_date,
            )
            .order_by(AttendanceSeasonMember.name)
        )

    result = await db.execute(stmt)
    records = result.all()
    return [
        {
            "user_id": r.user_id,
            "name": r.name,
            "status": r.status if r.status is not None else False,
            "timestamp": r.timestamp,
        }
        for r in records
    ]


async def kick_user_from_club(id: str, code: str, db: AsyncSession):
    data = await check_joining(id, code, db)
    try:
        await db.delete(data)
        await db.commit()
    except SQLAlchemyError:
        await db.rollback()
        raise HTTPException(status_code=500, detail="데이터베이스 오류")


async def delete_date_from_club(code: str, date: str, db: AsyncSession):
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)")

    try:
        season = await get_active_attendance_season(code, db)
        result = await db.execute(
            select(AttendanceDate).where(
                AttendanceDate.club_code == code,
                AttendanceDate.season_id == season.id,
                AttendanceDate.date == target_date,
            )
        )
        attendance_date = result.scalars().first()

        if not attendance_date:
            raise HTTPException(status_code=404, detail="해당 날짜가 존재하지 않습니다.")

        await db.execute(delete(Attendance).where(Attendance.attendance_date_id == attendance_date.id))
        await db.execute(delete(AttendanceDate).where(AttendanceDate.id == attendance_date.id))
        await db.commit()
        return {"message": f"{date} 날짜의 출석 기록이 삭제되었습니다."}

    except SQLAlchemyError:
        await db.rollback()
        raise HTTPException(status_code=500, detail="출석 삭제 중 데이터베이스 오류가 발생했습니다.")


async def delete_all_attendance_from_club(code: str, db: AsyncSession):
    try:
        season = await get_active_attendance_season(code, db)
        result = await db.execute(
            select(AttendanceDate).where(
                AttendanceDate.club_code == code,
                AttendanceDate.season_id == season.id,
            )
        )
        attendance_dates = result.scalars().all()

        if not attendance_dates:
            raise HTTPException(status_code=404, detail="삭제할 출석 기록이 없습니다.")

        attendance_date_ids = [ad.id for ad in attendance_dates]
        await db.execute(delete(Attendance).where(Attendance.attendance_date_id.in_(attendance_date_ids)))
        await db.execute(
            delete(AttendanceDate).where(
                AttendanceDate.club_code == code,
                AttendanceDate.season_id == season.id,
            )
        )
        await db.commit()
        return {"message": f"현재 시즌 출석 기록이 삭제되었습니다. ({len(attendance_dates)}개 날짜)"}

    except SQLAlchemyError:
        await db.rollback()
        raise HTTPException(status_code=500, detail="전체 출석 삭제 중 데이터베이스 오류가 발생했습니다.")


async def check_date(code, date, db: AsyncSession):
    season = await get_active_attendance_season(code, db)
    data = await db.execute(
        select(AttendanceDate).where(
            AttendanceDate.club_code == code,
            AttendanceDate.season_id == season.id,
            AttendanceDate.date == datetime.strptime(date, "%Y-%m-%d").date(),
        )
    )
    return data.scalars().first() is not None


async def date_add(data, club_code, user, db: AsyncSession):
    try:
        date_obj = datetime.strptime(data.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail=f"올바르지 않은 날짜 형식입니다: {data.date}")

    if await check_date(club_code, data.date, db):
        raise HTTPException(status_code=409, detail="이미 등록된 날짜입니다.")

    season = await get_active_attendance_season(club_code, db, user.user_id)
    new_date = AttendanceDate(
        club_code=club_code,
        season_id=season.id,
        date=date_obj,
        set_by=user.user_id,
    )
    db.add(new_date)
    await db.commit()


async def _get_roster_for_season(season: AttendanceSeason, club_code: str, db: AsyncSession):
    if season.is_active:
        return await _get_current_member_rows(club_code, db)

    result = await db.execute(
        select(AttendanceSeasonMember.user_id, AttendanceSeasonMember.name)
        .where(
            AttendanceSeasonMember.club_code == club_code,
            AttendanceSeasonMember.season_id == season.id,
        )
        .order_by(AttendanceSeasonMember.name)
    )
    return result.all()


async def load_full_attendance(club_code: str, db: AsyncSession, season_id: int | None = None):
    season = await get_attendance_season_or_active(club_code, db, season_id)
    date_result = await db.execute(
        select(AttendanceDate.id, AttendanceDate.date)
        .where(
            AttendanceDate.club_code == club_code,
            AttendanceDate.season_id == season.id,
        )
        .order_by(AttendanceDate.date)
    )
    dates = date_result.all()
    users = await _get_roster_for_season(season, club_code, db)

    attendance_result = await db.execute(
        select(Attendance.user_id, Attendance.attendance_date_id, Attendance.status)
        .join(AttendanceDate, Attendance.attendance_date_id == AttendanceDate.id)
        .where(
            AttendanceDate.club_code == club_code,
            AttendanceDate.season_id == season.id,
        )
    )
    att_map = {(r.user_id, r.attendance_date_id): r.status for r in attendance_result}

    result = []
    for user_id, name in users:
        row = {"user_id": user_id, "name": name}
        for date_id, date in dates:
            status = att_map.get((user_id, date_id))
            row[str(date)] = True if status else False
        result.append(row)

    return result, [str(d[1]) for d in dates]


async def export_excel(data, date_columns, club_code):
    df = pd.DataFrame(data[0:])
    if "user_id" not in df.columns:
        df["user_id"] = []
    if "name" not in df.columns:
        df["name"] = []

    df = df.rename(columns={
        "user_id": "아이디",
        "name": "이름",
    })

    for col in date_columns:
        df[col] = df[col].apply(lambda x: "O" if x else "X")

    if date_columns:
        df["비고"] = df[date_columns].apply(lambda row: f"{(row == 'O').sum()} / {len(date_columns)}", axis=1)
    else:
        df["비고"] = "0 / 0"
    df = df[["아이디", "이름"] + date_columns + ["비고"]]

    filename = f"출석부_{club_code}.xlsx"
    encoded_filename = quote(filename)
    output = BytesIO()
    df.to_excel(output, index=False)
    output.seek(0)
    return output, encoded_filename

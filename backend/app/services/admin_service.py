from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import StreamingResponse
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, join
from app.models import StuClub,Attendance,AttendanceDate,User
from datetime import datetime
from app.services.club_service import check_joining
from app.db import get_db
from urllib.parse import quote
from io import BytesIO
import pandas as pd

#관리자 클럽코드 호출
async def get_leader_club_code(user_id: str, db: AsyncSession) -> str:
    result = await db.execute(select(StuClub.club_code).where(StuClub.user_id == user_id))
    club_code = result.scalars().one_or_none()

    if club_code is None:
        raise HTTPException(status_code=404, detail="어느 클럽에도 속해있지않음")
    
    return club_code

#특정날짜의 출석부 호출
async def load_attendance(user, date, db: AsyncSession):
    result = await db.execute(
        select(StuClub.club_code).where(StuClub.user_id == user.user_id)
    )
    club_code = result.scalar()
    if not club_code:
        raise HTTPException(status_code=404, detail="동아리가 존재하지않습니다 관리자에게 문의해주세요")

    stmt = (
        select(
            User.user_id,
            User.name,
            Attendance.status,
            Attendance.timestamp
        )
        .select_from(
            join(StuClub, User, StuClub.user_id == User.user_id)
            .join(AttendanceDate, AttendanceDate.club_code == StuClub.club_code)
            .outerjoin(Attendance, 
                (Attendance.user_id == User.user_id) & 
                (Attendance.attendance_date_id == AttendanceDate.id)
            )
        )
        .where(
            StuClub.club_code == club_code,
            AttendanceDate.date == datetime.strptime(date, "%Y-%m-%d").date()
        )
        .order_by(User.name)
    )

    result = await db.execute(stmt)
    records = result.all()
    return [
        {
            "user_id": r.user_id,
            "name": r.name,
            "status": r.status if r.status is not None else False,
            "timestamp": r.timestamp
        }
        for r in records
    ]

#유저강퇴
async def kick_user_from_club(id: str,code:str ,db: AsyncSession):
    data = await check_joining(id,code,db)
    try:
        data = data.scalars().first()
        db.delete(data)
        db.commit()
        return 
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail="데이터베이스 오류")
    
#등록된 날짜인지 확인
async def check_date(code, date):
    async for db in get_db():
        data = await db.execute(select(AttendanceDate).where(AttendanceDate.club_code == code,AttendanceDate.date == datetime.strptime(date, "%Y-%m-%d").date()))
        if data.scalars().first():
            return True
        else:
            return False
        
# 출석부 전체로드
async def load_full_attendance(club_code: str, db: AsyncSession):
    date_result = await db.execute(
        select(AttendanceDate.id, AttendanceDate.date)
        .where(AttendanceDate.club_code == club_code)
        .order_by(AttendanceDate.date)
    )
    dates = date_result.all()  

    user_result = await db.execute(
        select(User.user_id, User.name)
        .join(StuClub, StuClub.user_id == User.user_id)
        .where(StuClub.club_code == club_code)
        .order_by(User.name)
    )
    users = user_result.all()  

    attendance_result = await db.execute(
        select(Attendance.user_id, Attendance.attendance_date_id, Attendance.status)
        .join(AttendanceDate, Attendance.attendance_date_id == AttendanceDate.id)
        .where(AttendanceDate.club_code == club_code)
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

#엑셀로 파일변환  
async def export_excel(data,date_columns,club_code):
    df = pd.DataFrame(data[1:])
    df = df.rename(columns={
        "user_id": "아이디",
        "name": "이름"
    })

    for col in date_columns:
        df[col] = df[col].apply(lambda x: "O" if x else "X")

    df["비고"] = df[date_columns].apply(lambda row: f"{(row == 'O').sum()} / {len(date_columns)}", axis=1)


    df = df[["아이디", "이름"] + date_columns + ["비고"]]

    filename = f"출석부_{club_code}.xlsx"
    encoded_filename = quote(filename)
    output = BytesIO()
    df.to_excel(output, index=False)
    output.seek(0)
    return output,encoded_filename

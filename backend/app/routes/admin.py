import asyncio
import random
from collections import deque
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Security, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.logger import get_admin_logger
from app.schema.admin_schema import DateRequest, KickForm, LocationSettingRequest, SeasonCreateRequest
from app.schema.schedule_schema import ScheduleCreateRequest, ScheduleResponse, ScheduleUpdateRequest
from app.services.admin_service import (
    check_date,
    date_add,
    delete_all_attendance_from_club,
    delete_date_from_club,
    export_excel,
    get_active_attendance_season,
    get_leader_club_code,
    kick_user_from_club,
    list_attendance_seasons,
    load_attendance,
    load_full_attendance,
    start_new_attendance_season,
)
from app.services.club_service import get_club_admin
from app.services.location_service import get_club_location_settings, update_club_location
from app.services.schedule_service import (
    create_schedule,
    delete_schedule_for_club,
    list_schedules_by_club,
    update_schedule_for_club,
)
from app.services.service import get_access_token_from_request, get_current_user

admin_logger = get_admin_logger()
security = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/admin")


class AttendanceWebSocketManager:
    def __init__(self):
        self.attendance_codes = {}

    def generate_random_code(self, club_code: str) -> str:
        return f"{random.randint(100, 999)}"

    async def handle_connection(self, websocket: WebSocket, date: str):
        await websocket.accept()
        club_code = None
        code_task = None
        stop_called = False

        try:
            token = websocket.cookies.get("access_token")
            if not token:
                token_msg = await websocket.receive_text()
                if not token_msg.startswith("Bearer "):
                    await websocket.send_text("유효하지 않은 토큰. 형식은 'Bearer <token>'입니다.")
                    await websocket.close()
                    return
                token = token_msg.split("Bearer ")[1]

            async for db in get_db():
                user_info = await get_current_user(token, db)
                if not user_info or not user_info.is_leader:
                    await websocket.send_text("허가된 사용자가 아닙니다.")
                    await websocket.close()
                    return

                club_code = await get_club_admin(user_info.user_id, db)
                if not await check_date(club_code, date, db):
                    await websocket.send_text("존재하지않는 출석 날짜입니다.")
                    await websocket.close()
                    return

            self.attendance_codes[club_code] = {
                "valid_codes": deque(maxlen=5),
                "accepted": False,
                "date": date,
            }

            async def generate_loop():
                while True:
                    if self.attendance_codes[club_code]["accepted"]:
                        if not self.attendance_codes[club_code]["valid_codes"]:
                            await asyncio.sleep(1)
                            continue
                        await websocket.send_text(self.attendance_codes[club_code]["valid_codes"][-1])
                        print("코드출석으로 변경", self.attendance_codes[club_code]["valid_codes"][-1])
                        break

                    new_code = self.generate_random_code(club_code)
                    full_code = f"{club_code}:{new_code}"
                    self.attendance_codes[club_code]["valid_codes"].append(full_code)
                    self.attendance_codes[club_code]["date"] = date
                    await websocket.send_text(full_code)
                    await asyncio.sleep(13)

            code_task = asyncio.create_task(generate_loop())

            while True:
                message = await websocket.receive_text()
                if message == "code_attendance_accepted":
                    self.attendance_codes[club_code]["accepted"] = True
                    if self.attendance_codes[club_code]["valid_codes"]:
                        print("코드출석으로 변경", self.attendance_codes[club_code]["valid_codes"][-1])
                        await websocket.send_text(self.attendance_codes[club_code]["valid_codes"][-1])
                elif message == "stop_attendance":
                    await websocket.send_text("출석종료")
                    stop_called = True
                    break
                else:
                    await websocket.send_text(f"받은 메시지: {message}")

        except WebSocketDisconnect:
            print(f"[연결 종료] {club_code}")
        except Exception as e:
            print(f"[에러] {e}")
        finally:
            if code_task:
                code_task.cancel()
            if club_code in self.attendance_codes:
                del self.attendance_codes[club_code]
                print(f"[정리] 출석코드 삭제됨: {club_code}")
            await websocket.close()
            if stop_called:
                await websocket.close()


attendance_ws = AttendanceWebSocketManager()


@router.websocket("/attendance/{date}/ws")
async def websocket_attendance(websocket: WebSocket, date: str):
    await attendance_ws.handle_connection(websocket, date)


@router.post("/add_date")
async def add_date(
    data: DateRequest,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 추가가능합니다.")

    club_code = await get_leader_club_code(user.user_id, db)
    await date_add(data, club_code, user, db)
    return {"message": "데이터가 정상적으로 추가되었습니다.", "dates": data.date}


@router.post("/refresh_date")
async def refresh(
    data: DateRequest,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 삭제 및 추가 가능합니다.")

    club_code = await get_leader_club_code(user.user_id, db)
    await delete_date_from_club(club_code, data.date, db)
    await date_add(data, club_code, user, db)


@router.delete("/delete_date/{date}")
async def delete_date(
    date: str,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 삭제 및 추가 가능합니다.")

    club_code = await get_leader_club_code(user.user_id, db)
    await delete_date_from_club(club_code, date, db)
    return {"message": f"{date} 날짜의 출석 기록이 삭제되었습니다."}


@router.delete("/delete_all_attendance")
async def delete_all_attendance(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 삭제가능합니다.")

    club_code = await get_leader_club_code(user.user_id, db)
    return await delete_all_attendance_from_club(club_code, db)


@router.get("/attendance_seasons")
async def attendance_seasons(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 조회가능합니다.")

    club_code = await get_leader_club_code(user.user_id, db)
    await get_active_attendance_season(club_code, db, user.user_id)
    await db.commit()
    return await list_attendance_seasons(club_code, db)


@router.post("/attendance_seasons/start")
async def start_attendance_season(
    data: SeasonCreateRequest,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 추가가능합니다.")

    club_code = await get_leader_club_code(user.user_id, db)
    return await start_new_attendance_season(club_code, data.name, user, db)


@router.get("/show_attendance/{date}")
async def show_attendance(
    date,
    request: Request,
    season_id: Optional[int] = Query(default=None),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    if user.is_leader != True:
        raise HTTPException(status_code=400, detail="허가되지 않은 사용자입니다.")

    if date == "None":
        club_code = await get_leader_club_code(user.user_id, db)
        data, date_columns = await load_full_attendance(club_code, db, season_id)
        return [data, date_columns]

    return await load_attendance(user, date, db, season_id)


@router.delete("/kick_user")
async def kick_user(
    data: KickForm,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    if user.is_leader != True:
        raise HTTPException(status_code=400, detail="허가되지 않은 사용자입니다.")
    club_code = await get_leader_club_code(user.user_id, db)
    await kick_user_from_club(data.user_id, club_code, db)


@router.get("/export_attendance")
async def export_attendance_excel(
    request: Request,
    season_id: Optional[int] = Query(default=None),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    if user.is_leader != True:
        raise HTTPException(status_code=400, detail="허가되지 않은 사용자입니다.")
    club_code = await get_leader_club_code(user.user_id, db)
    data, date_columns = await load_full_attendance(club_code, db, season_id)
    output, encoded_filename = await export_excel(data, date_columns, club_code)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"},
    )


@router.get("/location_settings")
async def get_location_settings(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Security(security), db: AsyncSession = Depends(get_db)):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 조회가능합니다.")
    club_code = await get_leader_club_code(user.user_id, db)
    return await get_club_location_settings(club_code, db)


@router.put("/location_settings")
async def update_location_settings(data: LocationSettingRequest, request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Security(security), db: AsyncSession = Depends(get_db)):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 조회가능합니다.")
    club_code = await get_leader_club_code(user.user_id, db)
    return await update_club_location(
        club_code,
        data.location_enabled,
        data.latitude,
        data.longitude,
        data.radius_km,
        db,
    )


@router.post("/schedules", response_model=ScheduleResponse)
async def add_schedule(
    data: ScheduleCreateRequest,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 추가가능합니다.")

    club_code = await get_leader_club_code(user.user_id, db)
    return await create_schedule(
        club_code=club_code,
        title=data.title,
        description=data.description,
        scheduled_at=data.scheduled_at,
        created_by=user.user_id,
        db=db,
    )


@router.get("/schedules", response_model=list[ScheduleResponse])
async def get_schedules(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 조회가능합니다.")

    club_code = await get_leader_club_code(user.user_id, db)
    return await list_schedules_by_club(club_code, db)


@router.delete("/schedules/{schedule_id}")
async def remove_schedule(
    schedule_id: int,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 삭제가능합니다.")

    club_code = await get_leader_club_code(user.user_id, db)
    return await delete_schedule_for_club(schedule_id, club_code, db)


@router.put("/schedules/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    data: ScheduleUpdateRequest,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db),
):
    token = get_access_token_from_request(request, credentials)
    user = await get_current_user(token, db)
    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 수정가능합니다.")

    club_code = await get_leader_club_code(user.user_id, db)
    return await update_schedule_for_club(
        schedule_id=schedule_id,
        club_code=club_code,
        title=data.title,
        description=data.description,
        scheduled_at=data.scheduled_at,
        db=db,
    )

from fastapi import APIRouter, Depends,WebSocket, Security, Path, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.variable import *
from app.schema.admin_schema import *
from app.services.admin_service import *
from app.services.club_service import get_club_admin
from app.services.service import *
from app.logger import get_admin_logger
from datetime import datetime
from app.models import AttendanceDate
import asyncio
import random
from collections import deque

admin_logger = get_admin_logger()



security = HTTPBearer()

router = APIRouter(
    prefix="/admin",
)

class AttendanceWebSocketManager:
    def __init__(self):
        self.attendance_codes = {}

    def generate_random_code(self, club_code: str) -> str:
        random_number = random.randint(100, 999)
        return f"{random_number}"

    async def handle_connection(self, websocket: WebSocket, date: str):
        await websocket.accept()
        club_code = None
        code_task = None
        stop_called = False

        try:
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
                if not await check_date(club_code,date):
                    await websocket.send_text("존재하지않는 출석 날짜입니다.")
                    await websocket.close()
                    return
            self.attendance_codes[club_code] = {
                "valid_codes": deque(maxlen=5),
                "accepted": False,
                "date": date
            }

            async def generate_loop():
                while True:
                    if self.attendance_codes[club_code]["accepted"]:
                        if not self.attendance_codes[club_code]["valid_codes"]:
                            await asyncio.sleep(1)
                            continue
                        await websocket.send_text(self.attendance_codes[club_code]["valid_codes"][-1])
                        print("코드출석으로 변경",self.attendance_codes[club_code]["valid_codes"][-1] )
                        break

                    new_code = self.generate_random_code(club_code)
                    full_code = f'{club_code}:{new_code}'

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
                        print("코드출석으로 변경",self.attendance_codes[club_code]["valid_codes"][-1] )
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
async def add_date(data: DateRequest, credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    user = await get_current_user(token, db)

    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 추가가능합니다.")

    club_code = await get_leader_club_code(user.user_id, db)
    await date_add(data, club_code, user)
    return {"message": f"데이터가 정상적으로 추가되었습니다.", "dates": data.date}



@router.post("/refresh_date")
async def refresh(data: DateRequest,credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    user = await get_current_user(token, db)

    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 삭제 및 추가 가능합니다.")

    club_code = await get_leader_club_code(user.user_id, db)
    await delete_date_from_club(club_code,data.date,db)
    await date_add(data, club_code, user)


@router.delete("delete_date/{date}")
async def delete_date(date: str,credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    user = await get_current_user(token, db)

    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 삭제가능합니다.")

    club_code = await get_leader_club_code(user.user_id, db)
    await delete_date_from_club(club_code,date,db)



@router.get("/show_attendance/{date}")
async def show_attendance(date, credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    user = await get_current_user(token, db)
    if user.is_leader != True:
        raise HTTPException(status_code=400, detail="허가되지 않은 사용자입니다.")
    if date == "None": #날짜를 지정하지않음(전체 출석부 로드) 
        club_code = await get_leader_club_code(user.user_id,db)
        data, date_columns = await load_full_attendance(club_code, db)
        return [data, date_columns]  # 날짜 리스트도 함께 반환
    else:
        data = await load_attendance(user, date, db)
        return data



@router.delete("/kick_user")
async def kick_user(data: KickForm, credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    user = await get_current_user(token, db)
    if user.is_leader != True:
        raise HTTPException(status_code=400, detail="허가되지 않은 사용자입니다.")
    club_code = await get_leader_club_code(user.user_id, db)
    await kick_user_from_club(data.user_id,club_code, db)

#엑셀파일로 변환
@router.get("/export_attendance")
async def export_attendance_excel(credentials: HTTPAuthorizationCredentials = Security(security),db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    user = await get_current_user(token, db)
    if user.is_leader != True:
        raise HTTPException(status_code=400, detail="허가되지 않은 사용자입니다.")
    club_code = await get_leader_club_code(user.user_id,db)
    data, date_columns = await load_full_attendance(club_code, db)
    output,encoded_filename = await export_excel(data,date_columns,club_code)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
        }
    )
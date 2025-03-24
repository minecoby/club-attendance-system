from fastapi import APIRouter, Depends,WebSocket, Security, Path, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.variable import *
from app.schema.admin_schema import *
from app.services.admin_service import *
from app.services.club_service import get_club_admin
from app.services.service import *
from datetime import datetime
from app.models import AttendanceDate

import asyncio
import random
security = HTTPBearer()

router = APIRouter(
    prefix="/admin",
)

class AttendanceWebSocketManager:
    def __init__(self):
        self.attendance_codes = {}

    def generate_random_code(self) -> str:
        return f"{random.randint(100, 999)}"

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


            self.attendance_codes[club_code] = {
                "code": None,
                "accepted": False,
                "date": date
            }

            async def generate_loop():
                while True:
                    if self.attendance_codes[club_code]["accepted"]:
                        await websocket.send_text(self.attendance_codes[club_code]["code"])
                        break

                    code = self.generate_random_code()
                    self.attendance_codes[club_code]["code"] = code
                    self.attendance_codes[club_code]["date"] = date
                    await websocket.send_text(self.attendance_codes[club_code]["code"])
                    await asyncio.sleep(5)

            code_task = asyncio.create_task(generate_loop())

            while True:
                message = await websocket.receive_text()
                if message == "code_attendance_accepted":
                    self.attendance_codes[club_code]["accepted"] = True
                    await websocket.send_text(self.attendance_codes[club_code]["code"])
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
async def add_date(data: DateListRequest, credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    user = await get_current_user(token, db)

    if not user.is_leader:
        raise HTTPException(status_code=403, detail="오로지 관리자권한이 있는사람만 추가가능합니다.")

    club_code = await get_leader_club_code(user.user_id, db)

    new_dates = []
    for date_str in data.dates:
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()  
        except ValueError:
            raise HTTPException(status_code=400, detail=f"올바르지 않은 형식: {date_str}")

        new_date = AttendanceDate(club_code=club_code, date=date_obj, set_by=user.user_id)
        db.add(new_date)
        new_dates.append(new_date)

    await db.commit()  
    return {"message": f"데이터가 정상적으로 추가되었습니다.", "dates": data.dates}



@router.get("/show_attendance/{date}")
async def show_attendance(date: str, credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    user = await get_current_user(token, db)
    if user.is_leader != True:
        raise HTTPException(status_code=400, detail="허가되지 않은 사용자입니다.")
    await load_attendance(user, date, db)

    
    
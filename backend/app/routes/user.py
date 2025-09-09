from fastapi import APIRouter, Depends, Security
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import  HTTPBearer, HTTPAuthorizationCredentials
from app.db import get_db
from app.variable import *
from app.schema.user_schema import *
from app.services.user_service import *
from app.services.service import *

from app.services.club_service import get_club_info

from fastapi import HTTPException
import urllib.parse
import requests

security = HTTPBearer()

router = APIRouter(
    prefix="/users",
)

@router.get("/google/login")
async def google_login():
    scope = "openid email profile"
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "scope": scope,
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent"
    }
    
    auth_url = "https://accounts.google.com/o/oauth2/auth?" + urllib.parse.urlencode(params)
    
    return {"auth_url": auth_url}

@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    try:
        token_data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": GOOGLE_REDIRECT_URI,
        }
        
        token_response = requests.post(
            "https://oauth2.googleapis.com/token",
            data=token_data
        )
        token_response.raise_for_status()
        tokens = token_response.json()
        access_token = tokens.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="토큰을 받을 수 없습니다.")
        
        user_info_response = requests.get(
            f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={access_token}"
        )
        user_info_response.raise_for_status()
        user_info = user_info_response.json()
        
        google_id = user_info.get("id")
        email = user_info.get("email")
        name = user_info.get("name")
        
        if not google_id or not email:
            raise HTTPException(status_code=400, detail="사용자 정보를 가져올 수 없습니다.")
        
        from sqlalchemy.future import select
        from app.models import User
        
        result = await db.execute(select(User).where(User.user_id == google_id))
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(
                user_id=google_id,
                gmail=email,
                name=name,
                is_leader=False
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        
        jwt_access_token = create_access_token(data={"sub": user.user_id})
        jwt_refresh_token = create_refresh_token(data={"sub": user.user_id})
        
        await save_refresh_token(user.user_id, jwt_refresh_token, db)
        
        usertype = "leader" if user.is_leader else "user"
        
        from fastapi.responses import RedirectResponse
        
        redirect_url = f"{FRONTEND_URL}/auth/callback?access_token={jwt_access_token}&refresh_token={jwt_refresh_token}&usertype={usertype}"
        
        return RedirectResponse(url=redirect_url)
        
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"구글 API 요청 실패: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"로그인 처리 중 오류: {str(e)}")

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    try:
        tokens = await rotate_refresh_token(data.refresh_token, db)
        return TokenResponse(**tokens)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail="토큰 갱신 실패")

@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    try:
        token = credentials.credentials
        user = await get_current_user(token, db)
        from sqlalchemy import delete
        await db.execute(
            delete(RefreshToken).where(RefreshToken.user_id == user.user_id)
        )
        await db.commit()
        
        return {"message": "성공적으로 로그아웃되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail="로그아웃 실패")

@router.get("/get_mydata")
async def get_mydata(credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):

    token = credentials.credentials
    #유저정보 불러오기
    user = await get_current_user(token, db)

    #가입한 동아리 목록 불러오기
    club_data = await get_club_info(user.user_id,db)
    user_data = await get_user_info(user.user_id,db)

    return {"user_data": user_data, "club_data": club_data}

@router.put("/update")
async def update_user(
    data: UpdateUserForm,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: AsyncSession = Depends(get_db)
):
    token = credentials.credentials
    user = await get_current_user(token, db)
    updated_user = await update_user_info(user.user_id, data.name, db)
    return {"message": "사용자 정보가 수정되었습니다.", "user": {"user_id": updated_user.user_id, "name": updated_user.name}}

# 토큰 유효성 검사
@router.get("/validate_token")
async def validate_token(credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    try:
        # 유저 정보 불러오기
        user = await get_current_user(token, db)
        return {"message": "토큰이 유효합니다.", "user_id": user.user_id}
    except HTTPException as e:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    
# 회원탈퇴
@router.delete("/delete_account")
async def delete_account(credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    try:
        token = credentials.credentials
        user = await get_current_user(token, db)
        
        from sqlalchemy import delete
        from app.models import RefreshToken, StuClub, Attendance
        
        await db.execute(
            delete(RefreshToken).where(RefreshToken.user_id == user.user_id)
        )
        
        await db.execute(
            delete(Attendance).where(Attendance.user_id == user.user_id)
        )
        
        await db.execute(
            delete(StuClub).where(StuClub.user_id == user.user_id)
        )
        
        await db.execute(
            delete(User).where(User.user_id == user.user_id)
        )
        
        await db.commit()
        
        return {"message": "회원탈퇴가 완료되었습니다."}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="회원탈퇴 처리 중 오류가 발생했습니다.")
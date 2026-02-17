from fastapi import APIRouter, Depends, Security, Request
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db import get_db
from app.variable import *
from app.schema.user_schema import *
from app.services.user_service import *
from app.services.service import *
from app.logger import get_user_logger

from app.services.club_service import get_club_info

from fastapi import HTTPException
import urllib.parse
import requests
import base64
import json
import os
import secrets
from datetime import datetime, timedelta
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

user_logger = get_user_logger()

security = HTTPBearer()

router = APIRouter(
    prefix="/users",
)

OAUTH_EXCHANGE_TTL_SECONDS = int(os.getenv("OAUTH_EXCHANGE_TTL_SECONDS", "120"))
CONSENT_VERSION = os.getenv("CONSENT_VERSION", "2026-02-14")
oauth_exchange_store = {}


def _create_oauth_exchange_code(access_token: str, refresh_token: str, usertype: str) -> str:
    now = datetime.utcnow()
    expired_codes = [
        key for key, value in oauth_exchange_store.items()
        if value["expires_at"] <= now
    ]
    for expired_code in expired_codes:
        oauth_exchange_store.pop(expired_code, None)

    auth_code = secrets.token_urlsafe(32)
    oauth_exchange_store[auth_code] = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "usertype": usertype,
        "expires_at": now + timedelta(seconds=OAUTH_EXCHANGE_TTL_SECONDS),
    }
    return auth_code


@router.get("/google/login")
async def google_login(redirect_uri: str = None):
    scope = "openid email profile"

    state_data = {"redirect_uri": redirect_uri} if redirect_uri else {}
    state = base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "scope": scope,
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
        "state": state
    }

    auth_url = "https://accounts.google.com/o/oauth2/auth?" + urllib.parse.urlencode(params)

    return {"auth_url": auth_url}


@router.get("/google/callback")
async def google_callback(code: str, state: str = None, db: AsyncSession = Depends(get_db)):
    try:
        # state에서 redirect_uri 추출
        custom_redirect_uri = None
        if state:
            try:
                state_data = json.loads(base64.urlsafe_b64decode(state).decode())
                custom_redirect_uri = state_data.get("redirect_uri")
            except:
                pass

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
        google_refresh_token = tokens.get("refresh_token")
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
                is_leader=False,
                google_refresh_token=google_refresh_token  # refresh_token 저장 (revoke용)
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            # 기존 사용자의 Google refresh 토큰 업데이트 (새로 발급된 경우만)
            if google_refresh_token:
                user.google_refresh_token = google_refresh_token
                await db.commit()

        jwt_access_token = create_access_token(data={"sub": user.user_id})
        jwt_refresh_token = create_refresh_token(data={"sub": user.user_id})

        await save_refresh_token(user.user_id, jwt_refresh_token, db)

        usertype = "leader" if user.is_leader else "user"

        from fastapi.responses import RedirectResponse

        # 앱에서 요청한 경우 앱으로, 아니면 웹으로 리다이렉트
        auth_code = _create_oauth_exchange_code(
            access_token=jwt_access_token,
            refresh_token=jwt_refresh_token,
            usertype=usertype
        )
        redirect_base = custom_redirect_uri or f"{FRONTEND_URL}/auth/callback"
        separator = "&" if "?" in redirect_base else "?"
        redirect_url = f"{redirect_base}{separator}{urllib.parse.urlencode({'auth_code': auth_code})}"

        return RedirectResponse(url=redirect_url)

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"구글 API 요청 실패: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"로그인 처리 중 오류: {str(e)}")


@router.post("/oauth/exchange", response_model=OAuthExchangeResponse)
async def oauth_exchange(data: OAuthExchangeRequest):
    payload = oauth_exchange_store.pop(data.auth_code, None)
    if not payload:
        raise HTTPException(status_code=400, detail="유효하지 않은 인증 코드입니다.")

    if payload["expires_at"] <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="만료된 인증 코드입니다.")

    return OAuthExchangeResponse(
        access_token=payload["access_token"],
        refresh_token=payload["refresh_token"],
        token_type="bearer",
        usertype=payload["usertype"],
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """아이디/비밀번호 로그인 (관리자/리더 전용)"""
    from sqlalchemy.future import select
    from app.models import User

    # 사용자 조회 (user_id로 검색)
    result = await db.execute(select(User).where(User.user_id == data.username))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    # 비밀번호 확인
    if not user.password_hash or not pwd_context.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    # 리더 권한 확인
    if not user.is_leader:
        raise HTTPException(status_code=403, detail="관리자 권한이 없습니다.")

    # 토큰 생성
    jwt_access_token = create_access_token(data={"sub": user.user_id})
    jwt_refresh_token = create_refresh_token(data={"sub": user.user_id})

    await save_refresh_token(user.user_id, jwt_refresh_token, db)

    return TokenResponse(
        access_token=jwt_access_token,
        refresh_token=jwt_refresh_token,
        token_type="bearer"
    )


@router.post("/register", response_model=TokenResponse)
async def register(
    data: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """관리자 회원가입 (동아리 생성 포함)"""
    from sqlalchemy.future import select
    from app.models import User, Club, StuClub, ConsentAgreement

    if not data.agreed_to_terms or not data.agreed_to_privacy:
        raise HTTPException(status_code=400, detail="이용약관 및 개인정보처리방침 동의가 필요합니다.")

    # 아이디 중복 확인
    result = await db.execute(select(User).where(User.user_id == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다.")

    # 동아리 코드 중복 확인
    result = await db.execute(select(Club).where(Club.club_code == data.club_code))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 사용 중인 동아리 코드입니다.")

    try:
        # 사용자 생성
        password_hash = pwd_context.hash(data.password)
        user = User(
            user_id=data.username,
            gmail=data.email,
            password_hash=password_hash,
            name=data.name,
            is_leader=True
        )
        db.add(user)

        # 동아리 생성
        club = Club(
            club_name=data.club_name,
            club_code=data.club_code
        )
        db.add(club)
        await db.flush()

        # 사용자-동아리 연결
        stu_club = StuClub(
            user_id=data.username,
            club_code=data.club_code
        )
        db.add(stu_club)

        consent = ConsentAgreement(
            user_id=data.username,
            agreed_to_terms=data.agreed_to_terms,
            agreed_to_privacy=data.agreed_to_privacy,
            consent_version=CONSENT_VERSION,
            agreed_ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        db.add(consent)

        await db.commit()

        # 토큰 생성 및 반환 (자동 로그인)
        jwt_access_token = create_access_token(data={"sub": user.user_id})
        jwt_refresh_token = create_refresh_token(data={"sub": user.user_id})

        await save_refresh_token(user.user_id, jwt_refresh_token, db)

        return TokenResponse(
            access_token=jwt_access_token,
            refresh_token=jwt_refresh_token,
            token_type="bearer"
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"회원가입 처리 중 오류가 발생했습니다: {str(e)}")


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
    # 유저정보 불러오기
    user = await get_current_user(token, db)

    # 가입한 동아리 목록 불러오기
    club_data = await get_club_info(user.user_id, db)
    user_data = await get_user_info(user.user_id, db)

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


@router.get("/validate_token")
async def validate_token(credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    try:
        user = await get_current_user(token, db)
        return {"message": "토큰이 유효합니다.", "user_id": user.user_id}
    except HTTPException as e:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")


@router.delete("/delete_account")
async def delete_account(credentials: HTTPAuthorizationCredentials = Security(security), db: AsyncSession = Depends(get_db)):
    try:
        token = credentials.credentials
        user = await get_current_user(token, db)

        # Google OAuth 토큰 revoke (실패 시 회원탈퇴 중단)
        if user.google_refresh_token:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://oauth2.googleapis.com/revoke",
                    params={"token": user.google_refresh_token},
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=500,
                        detail="Google 계정 연결 해제에 실패했습니다. 다시 시도해주세요."
                    )

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

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="회원탈퇴 처리 중 오류가 발생했습니다.")

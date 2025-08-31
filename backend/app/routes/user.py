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

security = HTTPBearer()

router = APIRouter(
    prefix="/users",
)
# 사용자 등록
@router.post("/signin")
async def create_user(data: SigninForm, db: AsyncSession = Depends(get_db)):
    #유저 중복 확인
    await check_duplicate_user(data,db)

    #유저 추가
    return await create_user_db(data, db)

# 회원가입
@router.post("/signup")
async def signup_user(data: SigninForm, db: AsyncSession = Depends(get_db)):
    #유저 중복 확인
    await check_duplicate_user(data,db)

    #유저 추가
    return await create_user_db(data, db)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginForm, db: AsyncSession = Depends(get_db)):
    user = await get_user(data, db)
    access_token = create_access_token(data={"sub": data.user_id})
    refresh_token = create_refresh_token(data={"sub": data.user_id})
    
    await save_refresh_token(data.user_id, refresh_token, db)
    
    usertype = "leader" if user.is_leader else "user"
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        usertype=usertype
    )

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
async def logout(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    try:
        await revoke_refresh_token(data.refresh_token, db)
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

@router.put("/change_password")
async def change_password(
    data: ChangePasswordForm,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: AsyncSession = Depends(get_db)
):
    token = credentials.credentials
    user = await get_current_user(token, db)
    await change_user_password(user.user_id, data.old_password, data.new_password, db)
    return {"message": "비밀번호가 변경되었습니다."}

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
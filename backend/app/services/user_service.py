import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from app.models import User, RefreshToken, Club, StuClub
import jwt
from passlib.context import CryptContext
from app.variable import *
from datetime import datetime, timedelta
from jose import JWTError


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")






#토큰생성
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

#리프레시 토큰 생성
def create_refresh_token(data: dict, expires_delta: timedelta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# 리프레시 토큰을 DB에 저장
async def save_refresh_token(user_id: str, refresh_token: str, db: AsyncSession):
    try:
        expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        # 기존 토큰 조회
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.user_id == user_id)
        )
        existing_token = result.scalar_one_or_none()
        
        if existing_token:
            # 기존 토큰 업데이트
            existing_token.token = refresh_token
            existing_token.expires_at = expires_at
            existing_token.created_at = datetime.utcnow()
            await db.commit()
            await db.refresh(existing_token)
            return existing_token
        else:
            # 새로운 리프레시 토큰 생성
            new_refresh_token = RefreshToken(
                user_id=user_id,
                token=refresh_token,
                expires_at=expires_at
            )
            db.add(new_refresh_token)
            await db.commit()
            await db.refresh(new_refresh_token)
            return new_refresh_token
            
    except SQLAlchemyError as e:
        await db.rollback()
        print(f"리프레시 토큰 저장 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"리프레시 토큰 저장 실패: {str(e)}")

# 리프레시 토큰 검증
async def verify_refresh_token(token: str, db: AsyncSession):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰")

        result = await db.execute(
            select(RefreshToken).where(
                RefreshToken.token == token,
                RefreshToken.user_id == user_id,
                RefreshToken.expires_at > datetime.utcnow()
            )
        )
        db_token = result.scalar_one_or_none()
        
        if db_token is None:
            raise HTTPException(status_code=401, detail="유효하지 않거나 만료된 리프레시 토큰")

        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰")

# 리프레시 토큰 삭제
async def delete_refresh_token(token: str, db: AsyncSession):
    try:
        from sqlalchemy import delete

        await db.execute(
            delete(RefreshToken)
            .where(RefreshToken.token == token)
        )
        await db.commit()
    except SQLAlchemyError as e:
        await db.rollback()
        print(f"토큰 삭제 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"토큰 삭제 실패: {str(e)}")

# 리프레시 토큰 로테이션 
async def rotate_refresh_token(old_refresh_token: str, db: AsyncSession):
    try:

        user_id = await verify_refresh_token(old_refresh_token, db)
        
        await delete_refresh_token(old_refresh_token, db)
        
        new_access_token = create_access_token(data={"sub": user_id})
        new_refresh_token = create_refresh_token(data={"sub": user_id})

        await save_refresh_token(user_id, new_refresh_token, db)

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
        
    except Exception as e:
        await db.rollback()
        raise e


async def get_user_info(id:str, db: AsyncSession):
    data = await db.execute(select(User).where(User.user_id == id))
    data = data.scalars().first()
    if data is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    return {"name": data.name, "gmail": data.gmail, "user_id": data.user_id, "is_leader": data.is_leader}

async def update_user_info(user_id: str, name: str, db: AsyncSession):
    result = await db.execute(select(User).where(User.user_id == user_id))
    db_user = result.scalar_one_or_none()
    if db_user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    db_user.name = name
    await db.commit()
    await db.refresh(db_user)
    return db_user


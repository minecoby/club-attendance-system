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




# 비밀번호 해시화
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

async def check_duplicate_user(data,db: AsyncSession):
    #중복 아이디 검사
    existing_user = await db.execute(select(User).where(User.user_id == data.user_id))
    if existing_user.scalars().first():
        raise HTTPException(status_code=409, detail="중복되는 user_id")

#로그인파트
async def get_user(data, db: AsyncSession):
    result = await db.execute(select(User).where(User.user_id == data.user_id))
    db_user = result.scalar_one_or_none()  

    if db_user is None or not verify_password(data.password, db_user.password):
        raise HTTPException(status_code=400, detail="로그인 정보 불일치.")
    return db_user


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

        from sqlalchemy import update
        await db.execute(
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False
            )
            .values(is_revoked=True)
        )

        # 새로운 리프레시 토큰 저장
        expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
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
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.utcnow()
            )
        )
        db_token = result.scalar_one_or_none()
        
        if db_token is None:
            raise HTTPException(status_code=401, detail="유효하지 않거나 만료된 리프레시 토큰")
        
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰")

# 리프레시 토큰 무효화
async def revoke_refresh_token(token: str, db: AsyncSession):
    try:
        from sqlalchemy import update

        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.token == token)
            .values(is_revoked=True)
        )
        await db.commit()
    except SQLAlchemyError as e:
        await db.rollback()
        print(f"토큰 무효화 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"토큰 무효화 실패: {str(e)}")

# 리프레시 토큰 로테이션 
async def rotate_refresh_token(old_refresh_token: str, db: AsyncSession):
    try:

        user_id = await verify_refresh_token(old_refresh_token, db)
        
        await revoke_refresh_token(old_refresh_token, db)
        
        new_access_token = create_access_token(data={"sub": user_id})
        new_refresh_token = create_refresh_token(data={"sub": user_id})
        
        await save_refresh_token(user_id, new_refresh_token, db)
        
        result = await db.execute(select(User).where(User.user_id == user_id))
        user = result.scalar_one_or_none()
        usertype = "leader" if user.is_leader else "user"
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "usertype": usertype
        }
        
    except Exception as e:
        await db.rollback()
        raise e

# 사용자 생성 
async def create_user_db(data, db: AsyncSession):
    try:
        # 동아리 코드 유효성 검증
        club_result = await db.execute(select(Club).where(Club.club_code == data.club_code))
        club = club_result.scalar_one_or_none()
        
        if not club:
            raise HTTPException(status_code=404, detail="유효하지 않은 동아리 가입 코드입니다.")
        
        # 비밀번호 해시화
        hashed_password = hash_password(data.password)

        # 사용자 생성
        new_user = User(user_id=data.user_id, password=hashed_password, name=data.name)
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        # 동아리 자동 가입
        stu_club = StuClub(user_id=new_user.user_id, club_code=data.club_code)
        db.add(stu_club)
        await db.commit()
        
        return new_user

    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="데이터베이스 오류")

async def get_user_info(id:str, db: AsyncSession):
    data = await db.execute(select(User).where(User.user_id == id))
    data = data.scalars().first()
    if data is None:
        raise HTTPException(status_code=404, detail="동아리가입되지않음")
    return {"name": data.name, "id" : data.user_id, "is_leader" : data.is_leader}

async def update_user_info(user_id: str, name: str, db: AsyncSession):
    result = await db.execute(select(User).where(User.user_id == user_id))
    db_user = result.scalar_one_or_none()
    if db_user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    db_user.name = name
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def change_user_password(user_id: str, old_password: str, new_password: str, db: AsyncSession):
    result = await db.execute(select(User).where(User.user_id == user_id))
    db_user = result.scalar_one_or_none()
    if db_user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if not verify_password(old_password, db_user.password):
        raise HTTPException(status_code=400, detail="기존 비밀번호가 일치하지 않습니다.")
    db_user.password = hash_password(new_password)
    await db.commit()
    await db.refresh(db_user)
    return db_user
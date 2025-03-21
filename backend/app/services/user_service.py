import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from app.models import User
import jwt
from passlib.context import CryptContext
from app.variable import *
from datetime import datetime, timedelta


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")




# 비밀번호 해시화
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

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
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

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

# 사용자 생성 (DB 저장)
async def create_user_db(data, db: AsyncSession):
    try:
        # 비밀번호 해시화
        hashed_password = hash_password(data.password)

        new_user = User(user_id=data.user_id, password=hashed_password, name=data.name)
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail="데이터베이스 오류")

async def get_user_info(id:str, db: AsyncSession):
    data = await db.execute(select(User).where(User.user_id == id))
    data = data.scalars().first()
    if data is None:
        raise HTTPException(status_code=404, detail="동아리가입되지않음")
    return {"name": data.name, "id" : data.user_id, "is_leader" : data.is_leader}
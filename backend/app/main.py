from fastapi import FastAPI
from app.routes import user
from app.routes import admin
from app.routes import club
from app.routes import attend
from fastapi.middleware.cors import CORSMiddleware

import os
from fastapi_limiter import FastAPILimiter
from redis.asyncio import Redis
from app.models import Base
from app.db import engine

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://minecoby.com", 
        "https://api.minecoby.com", 
        "https://hanssup.minecoby.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis = Redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis)

app.include_router(user.router,tags=["user"])
app.include_router(admin.router,tags=["admin"])
app.include_router(club.router,tags=["club"])
app.include_router(attend.router,tags=["attend"])
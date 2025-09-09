from fastapi import FastAPI, Request, Response
from app.routes import user
from app.routes import admin
from app.routes import club
from app.routes import attend
from fastapi.middleware.cors import CORSMiddleware
from app.logger import setup_loggers, get_api_logger
import time
import json

import os
from fastapi_limiter import FastAPILimiter
from redis.asyncio import Redis
from app.models import Base
from app.db import engine

app = FastAPI()

setup_loggers()
api_logger = get_api_logger()

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    client_ip = request.client.host if request.client else "unknown"
    method = request.method
    url = str(request.url)
    
    body = ""
    if method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.body()
            if body:
                body = body.decode('utf-8')[:500]  
        except:
            body = "Error reading body"
    
    response = await call_next(request)
    
    process_time = round(time.time() - start_time, 3)
    
    log_message = f"{client_ip} - {method} {url} - Status: {response.status_code} - Time: {process_time}s"
    if body:
        log_message += f" - Body: {body}"
    
    if response.status_code >= 500:
        api_logger.error(log_message)
    elif response.status_code >= 400:
        api_logger.warning(log_message)
    else:
        api_logger.info(log_message)
    
    return response

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
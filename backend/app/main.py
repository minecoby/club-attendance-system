from fastapi import FastAPI, Request, Response
from app.routes import user
from app.routes import admin
from app.routes import club
from app.routes import attend
from fastapi.middleware.cors import CORSMiddleware
from app.logger import setup_loggers, get_api_logger, get_user_logger, get_attendance_logger, get_admin_logger, get_club_logger
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
user_logger = get_user_logger()
attendance_logger = get_attendance_logger()
admin_logger = get_admin_logger()
club_logger = get_club_logger()

def get_logger_by_path(path: str):
    if path.startswith("/users"):
        return user_logger
    elif path.startswith("/admin"):
        return admin_logger
    elif path.startswith("/club"):
        return club_logger
    elif path.startswith("/attend"):
        return attendance_logger
    else:
        return api_logger

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    client_ip = request.client.host if request.client else "unknown"
    method = request.method
    url = str(request.url)
    path = request.url.path
    
    logger = get_logger_by_path(path)
    
    body = ""
    if method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.body()
            if body:
                body = body.decode('utf-8')[:500]  
        except Exception as e:
            body = f"Error reading body: {str(e)}"
    
    response = None
    response_body = ""
    error_detail = ""
    
    try:
        response = await call_next(request)
        
        if response.status_code >= 400:
            try:
                response_body_bytes = b""
                async for chunk in response.body_iterator:
                    response_body_bytes += chunk
                
                if response_body_bytes:
                    response_body = response_body_bytes.decode('utf-8')[:1000]
                    
                from fastapi import Response as FastAPIResponse
                response = FastAPIResponse(
                    content=response_body_bytes,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type
                )
                
            except Exception as e:
                response_body = f"Error reading response body: {str(e)}"
    
    except Exception as e:
        error_detail = f" - Exception: {type(e).__name__}: {str(e)}"
        from fastapi.responses import JSONResponse
        response = JSONResponse(
            content={"detail": "Internal server error"},
            status_code=500
        )
    
    process_time = round(time.time() - start_time, 3)
    
    log_message = f"{client_ip} - {method} {url} - Status: {response.status_code} - Time: {process_time}s"
    
    if body:
        log_message += f" - Request Body: {body}"
        
    if response_body:
        log_message += f" - Response Body: {response_body}"
        
    if error_detail:
        log_message += error_detail
    
    if response.status_code >= 500:
        logger.error(log_message)
    elif response.status_code >= 400:
        logger.warning(log_message)
    else:
        logger.info(log_message)
    
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
from fastapi import FastAPI
from app.routes import user
from app.routes import admin
from app.routes import club
app = FastAPI()

app.include_router(user.router,tags=["user"])
app.include_router(admin.router,tags=["admin"])
app.include_router(club.router,tags=["club"])
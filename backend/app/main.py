from fastapi import FastAPI
from app.routes import user
from app.routes import admin
app = FastAPI()

app.include_router(user.router,tags=["user"])
app.include_router(admin.router,tags=["admin"])
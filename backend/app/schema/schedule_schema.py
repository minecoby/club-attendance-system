from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ScheduleCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: Optional[str] = None
    scheduled_at: datetime


class ScheduleUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: Optional[str] = None
    scheduled_at: datetime


class ScheduleResponse(BaseModel):
    id: int
    club_code: str
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    created_by: str
    created_at: datetime

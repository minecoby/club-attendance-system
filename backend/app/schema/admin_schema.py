from pydantic import BaseModel
from typing import Optional


class DateRequest(BaseModel):
    date: str


class KickForm(BaseModel):
    user_id: str


class LocationSettingRequest(BaseModel):
    location_enabled: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: Optional[float] = 0.1
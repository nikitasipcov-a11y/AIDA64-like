from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


class DeviceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    device_type: str = "pc"
    group_name: Optional[str] = None
    notes: Optional[str] = None


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type: Optional[str] = None
    group_name: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class DeviceResponse(BaseModel):
    id: int
    name: str
    hostname: Optional[str]
    device_type: str
    os_name: Optional[str]
    os_version: Optional[str]
    is_online: bool
    last_seen: Optional[datetime]
    hardware_info: Optional[dict]
    group_name: Optional[str]
    notes: Optional[str]
    is_active: bool
    created_at: datetime
    api_key: Optional[str] = None  # only returned on creation

    class Config:
        from_attributes = True


class DeviceRegisterAgent(BaseModel):
    """Payload that agent sends on first connect / registration"""
    name: str
    hostname: str
    device_type: str = "pc"
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    hardware_info: Optional[dict] = None

from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class MetricReport(BaseModel):
    """What the agent sends every N seconds"""
    cpu_percent: Optional[float] = None
    cpu_temp: Optional[float] = None
    cpu_freq: Optional[float] = None
    mem_percent: Optional[float] = None
    mem_used_gb: Optional[float] = None
    mem_total_gb: Optional[float] = None
    disk_percent: Optional[float] = None
    disk_used_gb: Optional[float] = None
    disk_total_gb: Optional[float] = None
    net_sent_mb: Optional[float] = None
    net_recv_mb: Optional[float] = None
    gpu_percent: Optional[float] = None
    gpu_temp: Optional[float] = None
    gpu_mem_percent: Optional[float] = None
    extra: Optional[dict] = None
    hardware_info: Optional[dict] = None  # update hardware if changed
    hostname: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None


class MetricResponse(BaseModel):
    id: int
    device_id: int
    timestamp: datetime
    cpu_percent: Optional[float]
    cpu_temp: Optional[float]
    cpu_freq: Optional[float]
    mem_percent: Optional[float]
    mem_used_gb: Optional[float]
    mem_total_gb: Optional[float]
    disk_percent: Optional[float]
    disk_used_gb: Optional[float]
    disk_total_gb: Optional[float]
    net_sent_mb: Optional[float]
    net_recv_mb: Optional[float]
    gpu_percent: Optional[float]
    gpu_temp: Optional[float]
    gpu_mem_percent: Optional[float]
    extra: Optional[dict]

    class Config:
        from_attributes = True


class LatestMetricsResponse(BaseModel):
    device_id: int
    device_name: str
    is_online: bool
    last_seen: Optional[datetime]
    metrics: Optional[MetricResponse]
    hardware_info: Optional[dict]

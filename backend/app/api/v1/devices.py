from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import generate_agent_api_key
from app.models.user import User
from app.models.device import Device, DeviceMetric
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse
from app.schemas.metric import MetricReport, MetricResponse, LatestMetricsResponse
from app.api.deps import get_current_user, get_device_by_api_key

router = APIRouter(prefix="/devices", tags=["devices"])


@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_device(
    data: DeviceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    api_key = generate_agent_api_key()
    device = Device(
        owner_id=current_user.id,
        name=data.name,
        device_type=data.device_type,
        group_name=data.group_name,
        notes=data.notes,
        api_key=api_key,
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)
    
    # Return with api_key (only time it is shown)
    resp = DeviceResponse.model_validate(device)
    resp.api_key = api_key
    return resp


@router.get("", response_model=List[DeviceResponse])
async def list_devices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Device).where(Device.owner_id == current_user.id).order_by(Device.name)
    )
    devices = result.scalars().all()
    return devices


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Device).where(Device.id == device_id, Device.owner_id == current_user.id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.patch("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: int,
    data: DeviceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Device).where(Device.id == device_id, Device.owner_id == current_user.id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(device, field, value)
    
    await db.commit()
    await db.refresh(device)
    return device


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Device).where(Device.id == device_id, Device.owner_id == current_user.id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    await db.delete(device)
    await db.commit()


@router.get("/{device_id}/metrics/latest", response_model=LatestMetricsResponse)
async def get_latest_metrics(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Device).where(Device.id == device_id, Device.owner_id == current_user.id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    metrics_result = await db.execute(
        select(DeviceMetric)
        .where(DeviceMetric.device_id == device_id)
        .order_by(desc(DeviceMetric.timestamp))
        .limit(1)
    )
    metric = metrics_result.scalar_one_or_none()
    
    return LatestMetricsResponse(
        device_id=device.id,
        device_name=device.name,
        is_online=device.is_online,
        last_seen=device.last_seen,
        metrics=MetricResponse.model_validate(metric) if metric else None,
        hardware_info=device.hardware_info,
    )


@router.get("/{device_id}/metrics", response_model=List[MetricResponse])
async def get_metrics_history(
    device_id: int,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Device).where(Device.id == device_id, Device.owner_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Device not found")
    
    metrics_result = await db.execute(
        select(DeviceMetric)
        .where(DeviceMetric.device_id == device_id)
        .order_by(desc(DeviceMetric.timestamp))
        .limit(min(limit, 500))
    )
    return metrics_result.scalars().all()


# ========== Agent endpoints ==========

@router.post("/agent/report", status_code=status.HTTP_204_NO_CONTENT)
async def agent_report_metrics(
    data: MetricReport,
    device: Device = Depends(get_device_by_api_key),
    db: AsyncSession = Depends(get_db)
):
    """Agent sends metrics here every N seconds"""
    now = datetime.now(timezone.utc)
    
    metric = DeviceMetric(
        device_id=device.id,
        timestamp=now,
        cpu_percent=data.cpu_percent,
        cpu_temp=data.cpu_temp,
        cpu_freq=data.cpu_freq,
        mem_percent=data.mem_percent,
        mem_used_gb=data.mem_used_gb,
        mem_total_gb=data.mem_total_gb,
        disk_percent=data.disk_percent,
        disk_used_gb=data.disk_used_gb,
        disk_total_gb=data.disk_total_gb,
        net_sent_mb=data.net_sent_mb,
        net_recv_mb=data.net_recv_mb,
        gpu_percent=data.gpu_percent,
        gpu_temp=data.gpu_temp,
        gpu_mem_percent=data.gpu_mem_percent,
        extra=data.extra,
    )
    db.add(metric)
    
    # Update device status
    device.is_online = True
    device.last_seen = now
    if data.hardware_info:
        device.hardware_info = data.hardware_info
    if data.hostname:
        device.hostname = data.hostname
    if data.os_name:
        device.os_name = data.os_name
    if data.os_version:
        device.os_version = data.os_version
    
    await db.commit()

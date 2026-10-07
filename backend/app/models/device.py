from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Text, Float, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hostname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    device_type: Mapped[str] = mapped_column(String(50), default="pc")  # pc, server, laptop, iot, network
    os_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    os_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    # Agent authentication
    api_key: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Hardware info (cached from last report)
    hardware_info: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    
    # Location / group
    group_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    owner = relationship("User", back_populates="devices")
    metrics = relationship("DeviceMetric", back_populates="device", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="device", cascade="all, delete-orphan")


class DeviceMetric(Base):
    __tablename__ = "device_metrics"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), nullable=False, index=True)
    
    # Timestamp
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    
    # CPU
    cpu_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    cpu_temp: Mapped[float | None] = mapped_column(Float, nullable=True)
    cpu_freq: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # Memory
    mem_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    mem_used_gb: Mapped[float | None] = mapped_column(Float, nullable=True)
    mem_total_gb: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # Disk
    disk_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    disk_used_gb: Mapped[float | None] = mapped_column(Float, nullable=True)
    disk_total_gb: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # Network (bytes since boot or delta)
    net_sent_mb: Mapped[float | None] = mapped_column(Float, nullable=True)
    net_recv_mb: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # GPU (optional)
    gpu_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    gpu_temp: Mapped[float | None] = mapped_column(Float, nullable=True)
    gpu_mem_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # Extra raw data
    extra: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    device = relationship("Device", back_populates="metrics")

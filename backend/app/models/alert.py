from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Text, Float, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("devices.id"), nullable=True)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    metric: Mapped[str] = mapped_column(String(50), nullable=False)  # cpu_percent, cpu_temp, mem_percent, etc.
    operator: Mapped[str] = mapped_column(String(10), default=">")  # >, <, >=, <=
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_triggered: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notify_telegram: Mapped[bool] = mapped_column(Boolean, default=False)
    notify_email: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="alerts")
    device = relationship("Device", back_populates="alerts")

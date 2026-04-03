from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base
from backend.models.base import TimestampMixin
from backend.models.enums import RobotStatus


class Robot(TimestampMixin, Base):
    __tablename__ = "robots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    robot_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    battery_level: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    status: Mapped[RobotStatus] = mapped_column(Enum(RobotStatus), default=RobotStatus.IDLE, nullable=False)
    x: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    y: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    heading: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    max_speed: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    load_capacity: Mapped[float] = mapped_column(Float, default=25.0, nullable=False)
    battery_capacity: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    software_version: Mapped[str] = mapped_column(String(50), default="1.0.0", nullable=False)
    error_message: Mapped[str | None] = mapped_column(String(255), nullable=True)
    simulation_state: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_station_id: Mapped[int | None] = mapped_column(ForeignKey("charging_stations.id", use_alter=True), nullable=True)

    tasks = relationship("Task", back_populates="assigned_robot", foreign_keys="Task.assigned_robot_id")
    alerts = relationship("Alert", back_populates="robot")
    logs = relationship("SystemLog", back_populates="robot")
    route_history = relationship("RouteHistory", back_populates="robot")
    charging_sessions = relationship("ChargingSession", back_populates="robot")
    current_station = relationship("ChargingStation", foreign_keys=[current_station_id], post_update=True)

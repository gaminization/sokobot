from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base
from backend.models.base import TimestampMixin


class ChargingSession(TimestampMixin, Base):
    __tablename__ = "charging_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    station_id: Mapped[int] = mapped_column(ForeignKey("charging_stations.id"), nullable=False)
    robot_id: Mapped[int] = mapped_column(ForeignKey("robots.id"), nullable=False)
    battery_start: Mapped[float] = mapped_column(Float, nullable=False)
    battery_end: Mapped[float | None] = mapped_column(Float, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    station = relationship("ChargingStation", back_populates="sessions")
    robot = relationship("Robot", back_populates="charging_sessions")


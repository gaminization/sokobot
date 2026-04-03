from sqlalchemy import Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base
from backend.models.base import TimestampMixin
from backend.models.enums import ChargingStationStatus


class ChargingStation(TimestampMixin, Base):
    __tablename__ = "charging_stations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    station_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[ChargingStationStatus] = mapped_column(
        Enum(ChargingStationStatus),
        default=ChargingStationStatus.FREE,
        nullable=False,
    )
    x: Mapped[float] = mapped_column(Float, nullable=False)
    y: Mapped[float] = mapped_column(Float, nullable=False)
    current_robot_id: Mapped[int | None] = mapped_column(ForeignKey("robots.id", use_alter=True), nullable=True)

    current_robot = relationship("Robot", foreign_keys=[current_robot_id], post_update=True)
    sessions = relationship("ChargingSession", back_populates="station")

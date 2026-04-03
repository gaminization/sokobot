from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base
from backend.models.base import TimestampMixin


class Waypoint(TimestampMixin, Base):
    __tablename__ = "waypoints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    type: Mapped[str] = mapped_column(String(50), default="STORAGE", nullable=False)
    x: Mapped[float] = mapped_column(Float, nullable=False)
    y: Mapped[float] = mapped_column(Float, nullable=False)

    source_tasks = relationship("Task", back_populates="source_waypoint", foreign_keys="Task.source_waypoint_id")
    destination_tasks = relationship(
        "Task",
        back_populates="destination_waypoint",
        foreign_keys="Task.destination_waypoint_id",
    )


from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base
from backend.models.base import TimestampMixin


class RouteHistory(TimestampMixin, Base):
    __tablename__ = "route_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    robot_id: Mapped[int] = mapped_column(ForeignKey("robots.id"), nullable=False, index=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), nullable=True, index=True)
    sequence_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    x: Mapped[float] = mapped_column(nullable=False)
    y: Mapped[float] = mapped_column(nullable=False)

    robot = relationship("Robot", back_populates="route_history")
    task = relationship("Task", back_populates="route_history")


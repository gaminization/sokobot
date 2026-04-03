from sqlalchemy import Enum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base
from backend.models.base import TimestampMixin
from backend.models.enums import LogSeverity


class SystemLog(TimestampMixin, Base):
    __tablename__ = "system_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    severity: Mapped[LogSeverity] = mapped_column(Enum(LogSeverity), default=LogSeverity.INFO, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    robot_id: Mapped[int | None] = mapped_column(ForeignKey("robots.id"), nullable=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)

    user = relationship("User", back_populates="logs")
    robot = relationship("Robot", back_populates="logs")
    task = relationship("Task", back_populates="logs")


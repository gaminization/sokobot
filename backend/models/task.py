from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base
from backend.models.base import TimestampMixin
from backend.models.enums import TaskPriority, TaskStatus, TaskType


class Task(TimestampMixin, Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    type: Mapped[TaskType] = mapped_column(Enum(TaskType), default=TaskType.TRANSPORT, nullable=False)
    priority: Mapped[TaskPriority] = mapped_column(Enum(TaskPriority), default=TaskPriority.MEDIUM, nullable=False)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    source_label: Mapped[str] = mapped_column(String(120), nullable=False)
    destination_label: Mapped[str] = mapped_column(String(120), nullable=False)
    source_x: Mapped[float] = mapped_column(Float, nullable=False)
    source_y: Mapped[float] = mapped_column(Float, nullable=False)
    destination_x: Mapped[float] = mapped_column(Float, nullable=False)
    destination_y: Mapped[float] = mapped_column(Float, nullable=False)
    route_plan: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    simulation_state: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    route_progress_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    source_waypoint_id: Mapped[int | None] = mapped_column(ForeignKey("waypoints.id"), nullable=True)
    destination_waypoint_id: Mapped[int | None] = mapped_column(ForeignKey("waypoints.id"), nullable=True)
    assigned_robot_id: Mapped[int | None] = mapped_column(ForeignKey("robots.id"), nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    estimated_distance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    estimated_duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    assignment_mode: Mapped[str] = mapped_column(String(20), default="AUTO", nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    assigned_robot = relationship("Robot", back_populates="tasks", foreign_keys=[assigned_robot_id])
    created_by = relationship("User", back_populates="created_tasks", foreign_keys=[created_by_user_id])
    source_waypoint = relationship("Waypoint", back_populates="source_tasks", foreign_keys=[source_waypoint_id])
    destination_waypoint = relationship(
        "Waypoint",
        back_populates="destination_tasks",
        foreign_keys=[destination_waypoint_id],
    )
    alerts = relationship("Alert", back_populates="task")
    logs = relationship("SystemLog", back_populates="task")
    route_history = relationship("RouteHistory", back_populates="task")

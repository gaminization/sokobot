from datetime import datetime
from typing import Any

from pydantic import Field

from backend.models.enums import TaskPriority, TaskStatus, TaskType
from backend.schemas.common import Timestamped, WRMSModel


class TaskBase(WRMSModel):
    type: TaskType = TaskType.TRANSPORT
    priority: TaskPriority = TaskPriority.MEDIUM
    source_label: str = Field(min_length=1, max_length=120)
    destination_label: str = Field(min_length=1, max_length=120)
    source_x: float
    source_y: float
    destination_x: float
    destination_y: float
    description: str | None = Field(default=None, max_length=500)
    source_waypoint_id: int | None = None
    destination_waypoint_id: int | None = None


class TaskCreate(TaskBase):
    assigned_robot_id: int | None = None


class TaskUpdate(WRMSModel):
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    assigned_robot_id: int | None = None
    description: str | None = Field(default=None, max_length=500)
    failure_reason: str | None = Field(default=None, max_length=255)


class TaskRead(TaskBase, Timestamped):
    id: int
    task_id: str
    status: TaskStatus
    route_plan: list[dict[str, Any]] | None = None
    route_progress_index: int
    assigned_robot_id: int | None = None
    created_by_user_id: int | None = None
    estimated_distance: float
    estimated_duration_seconds: int
    assignment_mode: str
    started_at: datetime | None = None
    ended_at: datetime | None = None
    failure_reason: str | None = None


from datetime import datetime

from pydantic import Field

from backend.models.enums import RobotStatus
from backend.schemas.common import Timestamped, WRMSModel


class RobotBase(WRMSModel):
    robot_id: str = Field(min_length=1, max_length=50)
    model: str = Field(min_length=1, max_length=120)
    battery_level: float = Field(default=100.0, ge=0, le=100)
    status: RobotStatus = RobotStatus.IDLE
    x: float = 0.0
    y: float = 0.0
    heading: float = 0.0
    max_speed: float = Field(default=1.0, gt=0)
    load_capacity: float = Field(default=25.0, gt=0)
    battery_capacity: float = Field(default=100.0, gt=0)
    software_version: str = Field(default="1.0.0", min_length=1, max_length=50)


class RobotCreate(RobotBase):
    pass


class RobotUpdate(WRMSModel):
    model: str | None = Field(default=None, min_length=1, max_length=120)
    battery_level: float | None = Field(default=None, ge=0, le=100)
    status: RobotStatus | None = None
    x: float | None = None
    y: float | None = None
    heading: float | None = None
    max_speed: float | None = Field(default=None, gt=0)
    load_capacity: float | None = Field(default=None, gt=0)
    battery_capacity: float | None = Field(default=None, gt=0)
    software_version: str | None = Field(default=None, min_length=1, max_length=50)


class RobotRead(RobotBase, Timestamped):
    id: int
    error_message: str | None = None
    current_station_id: int | None = None
    last_seen_at: datetime | None = None
    active_task_id: str | None = None
    active_task_status: str | None = None


class ManualControlCommand(WRMSModel):
    direction: str = Field(pattern="^(FORWARD|BACKWARD|LEFT|RIGHT|ROTATE_LEFT|ROTATE_RIGHT|STOP)$")
    step_size: float | None = Field(default=None, gt=0)


from datetime import datetime

from pydantic import Field

from backend.models.enums import ChargingStationStatus
from backend.schemas.common import Timestamped, WRMSModel


class ChargingStationBase(WRMSModel):
    station_id: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=120)
    status: ChargingStationStatus = ChargingStationStatus.FREE
    x: float
    y: float


class ChargingStationCreate(ChargingStationBase):
    pass


class ChargingStationUpdate(WRMSModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    status: ChargingStationStatus | None = None
    x: float | None = None
    y: float | None = None


class ChargingStationRead(ChargingStationBase, Timestamped):
    id: int
    current_robot_id: int | None = None


class ChargingSessionRead(WRMSModel):
    id: int
    station_id: int
    robot_id: int
    battery_start: float
    battery_end: float | None = None
    started_at: datetime
    ended_at: datetime | None = None

from pydantic import Field

from backend.schemas.common import Timestamped, WRMSModel


class WaypointBase(WRMSModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=120)
    type: str = Field(default="STORAGE", min_length=1, max_length=50)
    x: float
    y: float


class WaypointCreate(WaypointBase):
    pass


class WaypointUpdate(WRMSModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    type: str | None = Field(default=None, min_length=1, max_length=50)
    x: float | None = None
    y: float | None = None


class WaypointRead(WaypointBase, Timestamped):
    id: int


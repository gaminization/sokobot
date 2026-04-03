from typing import Any

from backend.models.enums import LogSeverity
from backend.schemas.common import Timestamped, WRMSModel


class LogEntryRead(Timestamped):
    id: int
    event_type: str
    severity: LogSeverity
    message: str
    details: dict[str, Any] | None = None
    user_id: int | None = None
    robot_id: int | None = None
    task_id: int | None = None


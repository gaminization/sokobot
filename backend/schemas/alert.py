from datetime import datetime
from typing import Any

from backend.models.enums import AlertCategory, AlertSeverity
from backend.schemas.common import Timestamped, WRMSModel


class AlertRead(Timestamped):
    id: int
    alert_id: str
    severity: AlertSeverity
    category: AlertCategory
    title: str
    message: str
    context: dict[str, Any] | None = None
    robot_id: int | None = None
    task_id: int | None = None
    acknowledged_by_user_id: int | None = None
    acknowledged_at: datetime | None = None
    is_read: bool

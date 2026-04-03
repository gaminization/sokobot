from sqlalchemy.orm import Session

from backend.models import SystemLog
from backend.models.enums import LogSeverity


def add_log(
    db: Session,
    *,
    event_type: str,
    message: str,
    severity: LogSeverity = LogSeverity.INFO,
    details: dict | None = None,
    user_id: int | None = None,
    robot_id: int | None = None,
    task_id: int | None = None,
) -> SystemLog:
    log = SystemLog(
        event_type=event_type,
        severity=severity,
        message=message,
        details=details,
        user_id=user_id,
        robot_id=robot_id,
        task_id=task_id,
    )
    db.add(log)
    db.flush()
    return log


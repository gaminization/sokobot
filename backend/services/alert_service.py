from sqlalchemy.orm import Session

from backend.models import Alert
from backend.models.enums import AlertCategory, AlertSeverity, LogSeverity
from backend.services.log_service import add_log
from backend.services.utils import generate_public_id


def create_alert(
    db: Session,
    *,
    severity: AlertSeverity,
    category: AlertCategory,
    title: str,
    message: str,
    metadata: dict | None = None,
    robot_id: int | None = None,
    task_id: int | None = None,
) -> Alert:
    alert = Alert(
        alert_id=generate_public_id("ALT"),
        severity=severity,
        category=category,
        title=title,
        message=message,
        context=metadata,
        robot_id=robot_id,
        task_id=task_id,
    )
    db.add(alert)
    db.flush()
    add_log(
        db,
        event_type="ALERT_CREATED",
        severity=LogSeverity[severity.name],
        message=f"{title}: {message}",
        details=metadata,
        robot_id=robot_id,
        task_id=task_id,
    )
    return alert

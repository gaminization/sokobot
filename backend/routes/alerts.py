from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.dependencies import get_current_user
from backend.models import Alert
from backend.schemas.alert import AlertRead
from backend.services.log_service import add_log
from backend.services.utils import now_utc


router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/", response_model=list[AlertRead])
def list_alerts(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> list[AlertRead]:
    return [AlertRead.model_validate(alert) for alert in db.query(Alert).order_by(Alert.created_at.desc()).all()]


@router.post("/{alert_id}/acknowledge", response_model=AlertRead)
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> AlertRead:
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")
    alert.is_read = True
    alert.acknowledged_by_user_id = current_user.id
    alert.acknowledged_at = now_utc()
    add_log(db, event_type="ALERT_ACKNOWLEDGED", message=f"Alert {alert.alert_id} acknowledged.", user_id=current_user.id)
    db.commit()
    db.refresh(alert)
    return AlertRead.model_validate(alert)

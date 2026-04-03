from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.dependencies import get_current_user
from backend.schemas.log_entry import LogEntryRead
from backend.models import SystemLog


router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/", response_model=list[LogEntryRead])
def list_logs(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> list[LogEntryRead]:
    return [LogEntryRead.model_validate(log) for log in db.query(SystemLog).order_by(SystemLog.created_at.desc()).limit(250).all()]

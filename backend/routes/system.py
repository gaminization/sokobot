from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.dependencies import get_current_user
from backend.models import Robot
from backend.schemas.common import Message
from backend.services.alert_service import create_alert
from backend.services.log_service import add_log
from backend.services.robot_service import clear_robot_emergency
from backend.services.system_state import system_state
from backend.services.utils import now_utc
from backend.simulation.engine import apply_emergency_stop
from backend.models.enums import AlertCategory, AlertSeverity, LogSeverity, RobotStatus


router = APIRouter(prefix="/system", tags=["system"])


@router.post("/pause", response_model=Message)
def pause_system(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> Message:
    system_state.paused = True
    system_state.last_command = "PAUSE"
    system_state.last_command_at = now_utc()
    system_state.last_command_by_user_id = current_user.id
    add_log(db, event_type="SYSTEM_PAUSED", message="Task allocation paused.", user_id=current_user.id, severity=LogSeverity.WARNING)
    db.commit()
    return Message(message="Task allocation paused.")


@router.post("/resume", response_model=Message)
def resume_system(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> Message:
    if system_state.emergency_stop or db.query(Robot).filter(Robot.status == RobotStatus.ERROR).first() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Clear robot errors before resuming task allocation.")
    system_state.paused = False
    system_state.last_command = "RESUME"
    system_state.last_command_at = now_utc()
    system_state.last_command_by_user_id = current_user.id
    add_log(db, event_type="SYSTEM_RESUMED", message="Task allocation resumed.", user_id=current_user.id)
    db.commit()
    return Message(message="Task allocation resumed.")


@router.post("/emergency-stop", response_model=Message)
def emergency_stop(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> Message:
    system_state.paused = True
    system_state.emergency_stop = True
    system_state.last_command = "EMERGENCY_STOP"
    system_state.last_command_at = now_utc()
    system_state.last_command_by_user_id = current_user.id
    apply_emergency_stop(db)
    system_state.metadata = {"emergency_applied": True}
    create_alert(
        db,
        severity=AlertSeverity.CRITICAL,
        category=AlertCategory.SYSTEM,
        title="Emergency stop triggered",
        message=f"Emergency stop triggered by user {current_user.email}.",
    )
    add_log(db, event_type="EMERGENCY_STOP_TRIGGERED", severity=LogSeverity.CRITICAL, message="Emergency stop triggered.", user_id=current_user.id)
    db.commit()
    return Message(message="Emergency stop triggered.")


@router.post("/clear-emergency", response_model=Message)
def clear_emergency(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> Message:
    system_state.emergency_stop = False
    system_state.paused = False
    system_state.last_command = "CLEAR_EMERGENCY"
    system_state.last_command_at = now_utc()
    system_state.last_command_by_user_id = current_user.id
    system_state.metadata = {}
    for robot in db.query(Robot).filter(Robot.status == RobotStatus.ERROR).all():
        clear_robot_emergency(db, robot, user_id=current_user.id, event_type="ROBOT_EMERGENCY_CLEARED")
    add_log(db, event_type="EMERGENCY_STOP_CLEARED", message="Emergency stop cleared.", user_id=current_user.id, severity=LogSeverity.WARNING)
    db.commit()
    return Message(message="Emergency stop cleared. Robots returned to idle.")

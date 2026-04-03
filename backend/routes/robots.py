from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.config import get_settings
from backend.core.database import get_db
from backend.core.dependencies import get_current_user, require_roles
from backend.models import Robot, Task
from backend.models.enums import RobotStatus, TaskStatus, UserRole
from backend.schemas.common import Message
from backend.schemas.robot import ManualControlCommand, RobotCreate, RobotRead, RobotUpdate
from backend.services.log_service import add_log
from backend.services.robot_service import clear_robot_emergency, manual_control, reset_robot, send_robot_to_charging


router = APIRouter(prefix="/robots", tags=["robots"])
settings = get_settings()


def _to_robot_read(db: Session, robot: Robot) -> RobotRead:
    active_task = (
        db.query(Task)
        .filter(Task.assigned_robot_id == robot.id, Task.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]))
        .order_by(Task.created_at.desc())
        .first()
    )
    return RobotRead.model_validate(
        {
            **robot.__dict__,
            "active_task_id": active_task.task_id if active_task else None,
            "active_task_status": active_task.status.value if active_task else None,
        }
    )


@router.get("/", response_model=list[RobotRead])
def list_robots(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> list[RobotRead]:
    return [_to_robot_read(db, robot) for robot in db.query(Robot).order_by(Robot.robot_id.asc()).all()]


@router.get("/{robot_id}", response_model=RobotRead)
def get_robot(robot_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> RobotRead:
    robot = db.get(Robot, robot_id)
    if robot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Robot not found.")
    return _to_robot_read(db, robot)


@router.post("/", response_model=RobotRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(UserRole.ADMIN))])
def create_robot(payload: RobotCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> RobotRead:
    if db.query(Robot).filter(Robot.robot_id == payload.robot_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Robot ID already exists.")

    robot = Robot(**payload.model_dump())
    db.add(robot)
    db.flush()
    add_log(db, event_type="ROBOT_CREATED", message=f"Robot {robot.robot_id} created.", user_id=current_user.id, robot_id=robot.id)
    db.commit()
    db.refresh(robot)
    return _to_robot_read(db, robot)


@router.patch("/{robot_id}", response_model=RobotRead, dependencies=[Depends(require_roles(UserRole.ADMIN))])
def update_robot(robot_id: int, payload: RobotUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> RobotRead:
    robot = db.get(Robot, robot_id)
    if robot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Robot not found.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(robot, field, value)
    add_log(db, event_type="ROBOT_UPDATED", message=f"Robot {robot.robot_id} updated.", user_id=current_user.id, robot_id=robot.id)
    db.commit()
    db.refresh(robot)
    return _to_robot_read(db, robot)


@router.delete("/{robot_id}", response_model=Message, dependencies=[Depends(require_roles(UserRole.ADMIN))])
def delete_robot(robot_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> Message:
    robot = db.get(Robot, robot_id)
    if robot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Robot not found.")
    if db.query(Task).filter(Task.assigned_robot_id == robot.id, Task.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS])).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete a robot with an active task.")

    db.delete(robot)
    add_log(db, event_type="ROBOT_DELETED", message=f"Robot {robot.robot_id} deleted.", user_id=current_user.id)
    db.commit()
    return Message(message="Robot deleted successfully.")


@router.post("/{robot_id}/reset", response_model=RobotRead)
def reset_robot_endpoint(robot_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> RobotRead:
    robot = db.get(Robot, robot_id)
    if robot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Robot not found.")
    reset_robot(db, robot, user_id=current_user.id)
    db.commit()
    db.refresh(robot)
    return _to_robot_read(db, robot)


@router.post("/{robot_id}/clear-emergency", response_model=RobotRead)
def clear_emergency_endpoint(robot_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> RobotRead:
    robot = db.get(Robot, robot_id)
    if robot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Robot not found.")
    if robot.status != RobotStatus.ERROR:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Robot is not in an emergency state.")
    clear_robot_emergency(db, robot, user_id=current_user.id)
    db.commit()
    db.refresh(robot)
    return _to_robot_read(db, robot)


@router.post("/{robot_id}/charge", response_model=RobotRead)
def send_to_charging(robot_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> RobotRead:
    robot = db.get(Robot, robot_id)
    if robot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Robot not found.")
    if robot.status != RobotStatus.IDLE:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only idle robots can be sent to charging manually.")
    station = send_robot_to_charging(db, robot, reason="MANUAL_COMMAND")
    if station is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No charging station is available.")
    add_log(db, event_type="ROBOT_SENT_TO_CHARGING", message=f"Robot {robot.robot_id} sent to charging.", user_id=current_user.id, robot_id=robot.id)
    db.commit()
    db.refresh(robot)
    return _to_robot_read(db, robot)


@router.post("/{robot_id}/manual-control", response_model=RobotRead)
def manual_control_endpoint(
    robot_id: int,
    payload: ManualControlCommand,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> RobotRead:
    robot = db.get(Robot, robot_id)
    if robot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Robot not found.")
    if robot.status != RobotStatus.IDLE:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only idle robots can enter manual control.")

    manual_control(db, robot, payload.direction, payload.step_size or settings.manual_control_step)
    add_log(db, event_type="MANUAL_MODE", message=f"Manual control used on {robot.robot_id}.", user_id=current_user.id, robot_id=robot.id)
    db.commit()
    db.refresh(robot)
    return _to_robot_read(db, robot)

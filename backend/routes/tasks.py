from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.dependencies import get_current_user
from backend.models import Robot, Task, Waypoint
from backend.models.enums import RobotStatus, TaskStatus
from backend.schemas.common import Message
from backend.schemas.task import TaskCreate, TaskRead, TaskUpdate
from backend.services.log_service import add_log
from backend.services.task_allocator import assign_task
from backend.services.utils import generate_public_id, now_utc


router = APIRouter(prefix="/tasks", tags=["tasks"])


def _task_read(task: Task) -> TaskRead:
    return TaskRead.model_validate(task)


def _apply_waypoint_overrides(db: Session, payload: TaskCreate | TaskUpdate) -> dict:
    data = payload.model_dump(exclude_unset=True)
    source_waypoint_id = data.get("source_waypoint_id")
    destination_waypoint_id = data.get("destination_waypoint_id")

    if source_waypoint_id:
        source = db.get(Waypoint, source_waypoint_id)
        if source is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source waypoint not found.")
        data["source_label"] = source.name
        data["source_x"] = source.x
        data["source_y"] = source.y
    if destination_waypoint_id:
        destination = db.get(Waypoint, destination_waypoint_id)
        if destination is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination waypoint not found.")
        data["destination_label"] = destination.name
        data["destination_x"] = destination.x
        data["destination_y"] = destination.y
    return data


@router.get("/", response_model=list[TaskRead])
def list_tasks(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> list[TaskRead]:
    return [_task_read(task) for task in db.query(Task).order_by(Task.created_at.desc()).all()]


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> TaskRead:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    return _task_read(task)


@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> TaskRead:
    data = _apply_waypoint_overrides(db, payload)
    assigned_robot_id = data.pop("assigned_robot_id", None)

    task = Task(
        task_id=generate_public_id("TSK"),
        status=TaskStatus.PENDING,
        created_by_user_id=current_user.id,
        **data,
    )
    db.add(task)
    db.flush()

    if assigned_robot_id is not None:
        robot = db.get(Robot, assigned_robot_id)
        if robot is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned robot not found.")
        if robot.status != RobotStatus.IDLE:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Selected robot is not available.")
        assign_task(db, task, robot, assignment_mode="MANUAL")

    add_log(db, event_type="TASK_CREATED", message=f"Task {task.task_id} created.", user_id=current_user.id, task_id=task.id)
    db.commit()
    db.refresh(task)
    return _task_read(task)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> TaskRead:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    data = payload.model_dump(exclude_unset=True)
    reassigned_robot_id = data.pop("assigned_robot_id", None)

    for field, value in data.items():
        setattr(task, field, value)

    if reassigned_robot_id is not None:
        robot = db.get(Robot, reassigned_robot_id)
        if robot is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned robot not found.")
        if robot.status != RobotStatus.IDLE:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Selected robot is not available.")
        assign_task(db, task, robot, assignment_mode="MANUAL")

    add_log(db, event_type="TASK_UPDATED", message=f"Task {task.task_id} updated.", user_id=current_user.id, task_id=task.id)
    db.commit()
    db.refresh(task)
    return _task_read(task)


@router.post("/{task_id}/cancel", response_model=TaskRead)
def cancel_task(task_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> TaskRead:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    if task.status in {TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.FAILED}:
        return _task_read(task)

    robot = db.get(Robot, task.assigned_robot_id) if task.assigned_robot_id else None
    task.status = TaskStatus.CANCELLED
    task.failure_reason = "Cancelled by operator"
    task.ended_at = now_utc()
    if robot is not None:
        robot.status = RobotStatus.IDLE
        robot.simulation_state = None
        robot.error_message = None

    add_log(db, event_type="TASK_CANCELLED", message=f"Task {task.task_id} cancelled.", user_id=current_user.id, task_id=task.id, robot_id=robot.id if robot else None)
    db.commit()
    db.refresh(task)
    return _task_read(task)


@router.delete("/{task_id}", response_model=Message)
def delete_task(task_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> Message:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    if task.status in {TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cancel the task before deleting it.")

    db.delete(task)
    add_log(db, event_type="TASK_DELETED", message=f"Task {task.task_id} deleted.", user_id=current_user.id)
    db.commit()
    return Message(message="Task deleted successfully.")

from sqlalchemy import case, select
from sqlalchemy.orm import Session

from backend.core.config import get_settings
from backend.models import Robot, Task
from backend.models.enums import RobotStatus, TaskPriority, TaskStatus
from backend.services.log_service import add_log
from backend.services.utils import build_route_points, euclidean_distance, route_distance


settings = get_settings()


def _priority_order() -> case:
    return case(
        (Task.priority == TaskPriority.HIGH, 0),
        (Task.priority == TaskPriority.MEDIUM, 1),
        else_=2,
    )


def get_active_task_for_robot(db: Session, robot: Robot) -> Task | None:
    return (
        db.query(Task)
        .filter(
            Task.assigned_robot_id == robot.id,
            Task.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]),
        )
        .order_by(Task.created_at.desc())
        .first()
    )


def required_battery_for_task(robot: Robot, task: Task) -> float:
    route = build_route_points((robot.x, robot.y), (task.source_x, task.source_y), (task.destination_x, task.destination_y))
    distance = route_distance(route, (robot.x, robot.y))
    execution_cost = settings.battery_drain_execution * 2
    reserve = settings.low_battery_threshold
    return min(100.0, distance * settings.battery_drain_navigation + execution_cost + reserve)


def find_best_robot(db: Session, task: Task) -> Robot | None:
    robots = (
        db.query(Robot)
        .filter(Robot.status == RobotStatus.IDLE)
        .order_by(Robot.robot_id.asc())
        .all()
    )

    best_robot: Robot | None = None
    best_score: tuple[float, float] | None = None
    target = (task.source_x, task.source_y)

    for robot in robots:
        needed_battery = required_battery_for_task(robot, task)
        if robot.battery_level < needed_battery:
            continue

        distance = euclidean_distance((robot.x, robot.y), target)
        battery_penalty = 100.0 - robot.battery_level
        score = (distance, battery_penalty)
        if best_score is None or score < best_score:
            best_score = score
            best_robot = robot
    return best_robot


def assign_task(db: Session, task: Task, robot: Robot, assignment_mode: str = "AUTO") -> Task:
    route_plan = build_route_points((robot.x, robot.y), (task.source_x, task.source_y), (task.destination_x, task.destination_y))
    task.route_plan = route_plan
    task.route_progress_index = 0
    task.estimated_distance = route_distance(route_plan, (robot.x, robot.y))
    task.estimated_duration_seconds = int((len(route_plan) + 2) * settings.simulation_tick_seconds)
    task.assigned_robot_id = robot.id
    task.assignment_mode = assignment_mode
    task.status = TaskStatus.ASSIGNED
    task.failure_reason = None
    task.simulation_state = {"execution_ticks_remaining": 2, "source_reached": False}
    robot.status = RobotStatus.NAVIGATING
    robot.error_message = None
    robot.simulation_state = {"phase": "TASK_ASSIGNED"}
    add_log(
        db,
        event_type="TASK_ASSIGNED",
        message=f"Task {task.task_id} assigned to robot {robot.robot_id}.",
        details={"assignment_mode": assignment_mode, "estimated_distance": task.estimated_distance},
        robot_id=robot.id,
        task_id=task.id,
    )
    db.flush()
    return task


def allocate_pending_tasks(db: Session) -> int:
    assigned_count = 0
    pending_tasks = (
        db.query(Task)
        .filter(Task.status == TaskStatus.PENDING)
        .order_by(_priority_order(), Task.created_at.asc())
        .all()
    )

    for task in pending_tasks:
        robot = find_best_robot(db, task)
        if robot is None:
            continue
        assign_task(db, task, robot)
        assigned_count += 1

    return assigned_count


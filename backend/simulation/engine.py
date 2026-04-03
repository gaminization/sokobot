import asyncio
from contextlib import suppress

from fastapi import WebSocket
from sqlalchemy.orm import Session

from backend.core.config import get_settings
from backend.core.database import SessionLocal
from backend.models import Robot, RouteHistory, Task
from backend.models.enums import AlertCategory, AlertSeverity, ChargingStationStatus, LogSeverity, RobotStatus, TaskStatus
from backend.services.alert_service import create_alert
from backend.services.dashboard_service import build_snapshot
from backend.services.log_service import add_log
from backend.services.robot_service import clear_robot_assignment, release_current_station, send_robot_to_charging
from backend.services.system_state import system_state
from backend.services.task_allocator import allocate_pending_tasks, get_active_task_for_robot
from backend.services.utils import clamp, now_utc


settings = get_settings()


class DashboardBroadcaster:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)

    async def broadcast(self, payload: dict) -> None:
        stale: list[WebSocket] = []
        for websocket in list(self._connections):
            try:
                await websocket.send_json(payload)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(websocket)


dashboard_broadcaster = DashboardBroadcaster()


def _append_route_history(db: Session, robot: Robot, task: Task | None) -> None:
    last_point = (
        db.query(RouteHistory)
        .filter(RouteHistory.robot_id == robot.id)
        .order_by(RouteHistory.created_at.desc(), RouteHistory.id.desc())
        .first()
    )
    if last_point and last_point.x == robot.x and last_point.y == robot.y:
        return

    point = RouteHistory(
        robot_id=robot.id,
        task_id=task.id if task else None,
        sequence_index=(last_point.sequence_index + 1) if last_point else 1,
        x=robot.x,
        y=robot.y,
    )
    db.add(point)


def _fail_active_task(db: Session, robot: Robot, task: Task, reason: str) -> None:
    task.status = TaskStatus.FAILED
    task.failure_reason = reason
    task.ended_at = now_utc()
    robot.status = RobotStatus.ERROR
    robot.error_message = reason
    robot.simulation_state = {"blocked": True}
    create_alert(
        db,
        severity=AlertSeverity.CRITICAL,
        category=AlertCategory.ROBOT,
        title="Robot entered error state",
        message=f"Robot {robot.robot_id} failed during task {task.task_id}: {reason}",
        robot_id=robot.id,
        task_id=task.id,
        metadata={"reason": reason},
    )
    add_log(
        db,
        event_type="TASK_FAILED",
        severity=LogSeverity.ERROR,
        message=f"Task {task.task_id} failed because {reason}.",
        task_id=task.id,
        robot_id=robot.id,
        details={"reason": reason},
    )


def _complete_active_task(db: Session, robot: Robot, task: Task) -> None:
    task.status = TaskStatus.COMPLETED
    task.ended_at = now_utc()
    robot.status = RobotStatus.IDLE
    robot.error_message = None
    robot.simulation_state = None
    add_log(
        db,
        event_type="TASK_COMPLETED",
        message=f"Task {task.task_id} completed by robot {robot.robot_id}.",
        task_id=task.id,
        robot_id=robot.id,
    )
    create_alert(
        db,
        severity=AlertSeverity.INFO,
        category=AlertCategory.TASK,
        title="Task completed",
        message=f"{task.task_id} completed by {robot.robot_id}.",
        robot_id=robot.id,
        task_id=task.id,
    )
    if robot.battery_level <= settings.low_battery_threshold:
        send_robot_to_charging(db, robot, reason="POST_TASK_LOW_BATTERY")


def _tick_navigation(db: Session, robot: Robot, task: Task) -> None:
    route_plan = task.route_plan or []
    if not route_plan:
        _fail_active_task(db, robot, task, "Route plan missing")
        return

    if task.status == TaskStatus.ASSIGNED:
        task.status = TaskStatus.IN_PROGRESS
        task.started_at = task.started_at or now_utc()
        add_log(
            db,
            event_type="TASK_STARTED",
            message=f"Task {task.task_id} started on robot {robot.robot_id}.",
            task_id=task.id,
            robot_id=robot.id,
        )

    if robot.battery_level <= settings.critical_battery_threshold:
        _fail_active_task(db, robot, task, "Battery dropped below critical threshold")
        return

    if task.route_progress_index >= len(route_plan):
        robot.status = RobotStatus.EXECUTING
        state = task.simulation_state or {}
        state["execution_ticks_remaining"] = state.get("execution_ticks_remaining", 2)
        task.simulation_state = state
        return

    next_point = route_plan[task.route_progress_index]
    previous_x, previous_y = robot.x, robot.y
    robot.x = float(next_point["x"])
    robot.y = float(next_point["y"])
    if robot.x > previous_x:
        robot.heading = 0.0
    elif robot.x < previous_x:
        robot.heading = 180.0
    elif robot.y > previous_y:
        robot.heading = 90.0
    elif robot.y < previous_y:
        robot.heading = 270.0

    robot.battery_level = clamp(robot.battery_level - settings.battery_drain_navigation, 0.0, 100.0)
    task.route_progress_index += 1

    state = task.simulation_state or {}
    if next_point.get("checkpoint") == "SOURCE" and not state.get("source_reached"):
        state["source_reached"] = True
        add_log(
            db,
            event_type="TASK_SOURCE_REACHED",
            message=f"Robot {robot.robot_id} reached task source for {task.task_id}.",
            task_id=task.id,
            robot_id=robot.id,
        )

    task.simulation_state = state
    _append_route_history(db, robot, task)

    if task.route_progress_index >= len(route_plan):
        robot.status = RobotStatus.EXECUTING
        state["execution_ticks_remaining"] = state.get("execution_ticks_remaining", 2)
        task.simulation_state = state
        add_log(
            db,
            event_type="TASK_DESTINATION_REACHED",
            message=f"Robot {robot.robot_id} arrived at destination for task {task.task_id}.",
            task_id=task.id,
            robot_id=robot.id,
        )


def _tick_execution(db: Session, robot: Robot, task: Task) -> None:
    state = task.simulation_state or {}
    remaining = int(state.get("execution_ticks_remaining", 2))
    robot.battery_level = clamp(robot.battery_level - settings.battery_drain_execution, 0.0, 100.0)
    remaining -= 1
    if robot.battery_level <= settings.critical_battery_threshold:
        _fail_active_task(db, robot, task, "Battery dropped below critical threshold during execution")
        return

    if remaining <= 0:
        _complete_active_task(db, robot, task)
        return

    state["execution_ticks_remaining"] = remaining
    task.simulation_state = state


def _tick_charging(db: Session, robot: Robot) -> None:
    robot.battery_level = clamp(robot.battery_level + settings.battery_charge_rate, 0.0, 100.0)
    if robot.current_station is not None:
        robot.x = robot.current_station.x
        robot.y = robot.current_station.y
    if robot.battery_level >= 100.0:
        release_current_station(db, robot)
        robot.status = RobotStatus.IDLE
        robot.simulation_state = None
        add_log(
            db,
            event_type="ROBOT_CHARGING_COMPLETED",
            message=f"Robot {robot.robot_id} finished charging and returned to idle.",
            robot_id=robot.id,
        )


def apply_emergency_stop(db: Session) -> None:
    open_tasks = (
        db.query(Task)
        .filter(Task.status.in_([TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]))
        .all()
    )
    for task in open_tasks:
        task.status = TaskStatus.CANCELLED
        task.failure_reason = "Emergency stop activated"
        task.ended_at = now_utc()
        task.simulation_state = None
        task.route_progress_index = 0

    robots = db.query(Robot).all()
    for robot in robots:
        release_current_station(db, robot)
        clear_robot_assignment(db, robot, "Emergency stop activated", cancel_status=TaskStatus.CANCELLED)
        robot.status = RobotStatus.ERROR
        robot.error_message = "Emergency stop activated"
        robot.simulation_state = {"blocked": True}
    add_log(db, event_type="EMERGENCY_STOP_APPLIED", severity=LogSeverity.CRITICAL, message="Emergency stop applied to fleet.")


def run_simulation_tick(db: Session) -> None:
    if system_state.emergency_stop and not system_state.metadata.get("emergency_applied"):
        apply_emergency_stop(db)
        system_state.metadata["emergency_applied"] = True

    if not system_state.paused and not system_state.emergency_stop:
        allocate_pending_tasks(db)

    robots = db.query(Robot).order_by(Robot.robot_id.asc()).all()
    for robot in robots:
        robot.last_seen_at = now_utc()
        task = get_active_task_for_robot(db, robot)

        if robot.status == RobotStatus.CHARGING:
            _tick_charging(db, robot)
        elif robot.status == RobotStatus.NAVIGATING and task is not None:
            _tick_navigation(db, robot, task)
        elif robot.status == RobotStatus.EXECUTING and task is not None:
            _tick_execution(db, robot, task)
        elif robot.status == RobotStatus.IDLE and robot.battery_level <= settings.low_battery_threshold:
            send_robot_to_charging(db, robot, reason="LOW_BATTERY")

        if robot.current_station is not None and robot.current_station.status == ChargingStationStatus.OCCUPIED:
            robot.x = robot.current_station.x
            robot.y = robot.current_station.y

        if task is None:
            _append_route_history(db, robot, None)


class SimulationEngine:
    def __init__(self) -> None:
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        if self._task is not None:
            return
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        with suppress(asyncio.CancelledError):
            await self._task
        self._task = None

    async def _run(self) -> None:
        while True:
            with SessionLocal() as db:
                run_simulation_tick(db)
                db.commit()
                snapshot = build_snapshot(db)
            await dashboard_broadcaster.broadcast(snapshot.model_dump(mode="json"))
            await asyncio.sleep(settings.simulation_tick_seconds)


simulation_engine = SimulationEngine()

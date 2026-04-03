from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.core.config import get_settings
from backend.models import Alert, ChargingStation, RouteHistory, Robot, SystemLog, Task, Waypoint
from backend.models.enums import RobotStatus, TaskStatus
from backend.schemas.dashboard import DashboardSnapshot, KPISet, MapRobot, MapStation, MapTask, MapWaypoint


settings = get_settings()


def _build_kpis(db: Session) -> KPISet:
    total_robots = db.query(func.count(Robot.id)).scalar() or 0
    active_robots = db.query(func.count(Robot.id)).filter(Robot.status.in_([RobotStatus.NAVIGATING, RobotStatus.EXECUTING])).scalar() or 0
    idle_robots = db.query(func.count(Robot.id)).filter(Robot.status == RobotStatus.IDLE).scalar() or 0
    charging_robots = db.query(func.count(Robot.id)).filter(Robot.status == RobotStatus.CHARGING).scalar() or 0
    error_robots = db.query(func.count(Robot.id)).filter(Robot.status == RobotStatus.ERROR).scalar() or 0
    tasks_pending = db.query(func.count(Task.id)).filter(Task.status == TaskStatus.PENDING).scalar() or 0
    tasks_in_progress = db.query(func.count(Task.id)).filter(Task.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS])).scalar() or 0
    completed_tasks = (
        db.query(Task)
        .filter(Task.status == TaskStatus.COMPLETED, Task.started_at.isnot(None), Task.ended_at.isnot(None))
        .all()
    )
    today = datetime.now(timezone.utc).date()
    tasks_completed_today = sum(1 for task in completed_tasks if task.ended_at is not None and task.ended_at.date() == today)
    durations = [
        (task.ended_at - task.started_at).total_seconds()
        for task in completed_tasks
        if task.started_at is not None and task.ended_at is not None
    ]
    average_duration = sum(durations) / len(durations) if durations else 0.0
    average_battery = db.query(func.avg(Robot.battery_level)).scalar() or 0.0
    utilization = round((active_robots / total_robots) * 100, 2) if total_robots else 0.0

    return KPISet(
        active_robots=active_robots,
        idle_robots=idle_robots,
        charging_robots=charging_robots,
        error_robots=error_robots,
        tasks_pending=tasks_pending,
        tasks_in_progress=tasks_in_progress,
        tasks_completed_today=tasks_completed_today,
        fleet_utilization_rate=utilization,
        average_task_duration_seconds=float(round(average_duration, 2)),
        average_battery_level=float(round(average_battery, 2)),
    )


def _robot_trail(db: Session, robot_id: int) -> list[dict[str, float]]:
    points = (
        db.query(RouteHistory)
        .filter(RouteHistory.robot_id == robot_id)
        .order_by(RouteHistory.created_at.desc(), RouteHistory.id.desc())
        .limit(settings.max_robot_trail_points)
        .all()
    )
    return [{"x": point.x, "y": point.y} for point in reversed(points)]


def build_snapshot(db: Session) -> DashboardSnapshot:
    robots = []
    for robot in db.query(Robot).order_by(Robot.robot_id.asc()).all():
        active_task = (
            db.query(Task)
            .filter(Task.assigned_robot_id == robot.id, Task.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]))
            .order_by(Task.created_at.desc())
            .first()
        )
        robots.append(
            MapRobot(
                robot_id=robot.robot_id,
                status=robot.status.value,
                battery_level=robot.battery_level,
                x=robot.x,
                y=robot.y,
                heading=robot.heading,
                active_task_id=active_task.task_id if active_task else None,
                trail=_robot_trail(db, robot.id),
            )
        )

    stations = [
        MapStation(
            station_id=station.station_id,
            name=station.name,
            status=station.status.value,
            x=station.x,
            y=station.y,
            current_robot_id=station.current_robot_id,
        )
        for station in db.query(ChargingStation).order_by(ChargingStation.station_id.asc()).all()
    ]

    waypoints = [
        MapWaypoint(
            waypoint_id=waypoint.code,
            name=waypoint.name,
            type=waypoint.type,
            x=waypoint.x,
            y=waypoint.y,
        )
        for waypoint in db.query(Waypoint).order_by(Waypoint.code.asc()).all()
    ]

    tasks = [
        MapTask(
            task_id=task.task_id,
            status=task.status.value,
            priority=task.priority.value,
            assigned_robot_id=task.assigned_robot_id,
            route_plan=task.route_plan or [],
        )
        for task in db.query(Task).order_by(Task.created_at.desc()).limit(25).all()
    ]

    alerts = [
        {
            "alert_id": alert.alert_id,
            "severity": alert.severity.value,
            "category": alert.category.value,
            "title": alert.title,
            "message": alert.message,
            "created_at": alert.created_at.isoformat(),
            "robot_id": alert.robot_id,
            "task_id": alert.task_id,
            "is_read": alert.is_read,
        }
        for alert in db.query(Alert).order_by(Alert.created_at.desc()).limit(8).all()
    ]

    recent_logs = [
        {
            "id": log.id,
            "event_type": log.event_type,
            "severity": log.severity.value,
            "message": log.message,
            "created_at": log.created_at.isoformat(),
        }
        for log in db.query(SystemLog).order_by(SystemLog.created_at.desc()).limit(12).all()
    ]

    return DashboardSnapshot(
        generated_at=datetime.now(timezone.utc),
        kpis=_build_kpis(db),
        robots=robots,
        stations=stations,
        waypoints=waypoints,
        tasks=tasks,
        alerts=alerts,
        recent_logs=recent_logs,
    )

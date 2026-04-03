from sqlalchemy.orm import Session

from backend.core.config import get_settings
from backend.models import ChargingSession, ChargingStation, Robot, Task
from backend.models.enums import AlertCategory, AlertSeverity, ChargingStationStatus, LogSeverity, RobotStatus, TaskStatus
from backend.services.alert_service import create_alert
from backend.services.log_service import add_log
from backend.services.task_allocator import get_active_task_for_robot
from backend.services.utils import clamp, euclidean_distance, now_utc


settings = get_settings()


def get_nearest_available_station(db: Session, robot: Robot) -> ChargingStation | None:
    stations = (
        db.query(ChargingStation)
        .filter(ChargingStation.status == ChargingStationStatus.FREE)
        .order_by(ChargingStation.station_id.asc())
        .all()
    )
    if not stations:
        return None
    return min(stations, key=lambda station: euclidean_distance((robot.x, robot.y), (station.x, station.y)))


def release_current_station(db: Session, robot: Robot) -> None:
    if robot.current_station is None:
        return

    station = robot.current_station
    station.status = ChargingStationStatus.FREE
    station.current_robot_id = None

    active_session = (
        db.query(ChargingSession)
        .filter(ChargingSession.robot_id == robot.id, ChargingSession.station_id == station.id, ChargingSession.ended_at.is_(None))
        .order_by(ChargingSession.started_at.desc())
        .first()
    )
    if active_session is not None:
        active_session.battery_end = robot.battery_level
        active_session.ended_at = now_utc()

    robot.current_station_id = None
    robot.current_station = None


def send_robot_to_charging(db: Session, robot: Robot, reason: str = "LOW_BATTERY") -> ChargingStation | None:
    if robot.status == RobotStatus.CHARGING and robot.current_station is not None:
        return robot.current_station

    station = get_nearest_available_station(db, robot)
    if station is None:
        create_alert(
            db,
            severity=AlertSeverity.WARNING,
            category=AlertCategory.CHARGING,
            title="Charging station unavailable",
            message=f"No free charging station is available for {robot.robot_id}.",
            robot_id=robot.id,
            metadata={"reason": reason},
        )
        return None

    active_task = get_active_task_for_robot(db, robot)
    if active_task is not None and active_task.status in {TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS}:
        active_task.status = TaskStatus.FAILED
        active_task.failure_reason = f"Interrupted for charging: {reason}"
        active_task.ended_at = now_utc()
        create_alert(
            db,
            severity=AlertSeverity.WARNING,
            category=AlertCategory.TASK,
            title="Task interrupted for charging",
            message=f"Task {active_task.task_id} was interrupted because robot {robot.robot_id} needed charging.",
            robot_id=robot.id,
            task_id=active_task.id,
            metadata={"reason": reason},
        )

    station.status = ChargingStationStatus.OCCUPIED
    station.current_robot_id = robot.id
    robot.current_station_id = station.id
    robot.x = station.x
    robot.y = station.y
    robot.status = RobotStatus.CHARGING
    robot.simulation_state = {"charging_reason": reason}
    robot.error_message = None

    charging_session = ChargingSession(
        station_id=station.id,
        robot_id=robot.id,
        battery_start=robot.battery_level,
        started_at=now_utc(),
    )
    db.add(charging_session)
    db.flush()

    add_log(
        db,
        event_type="ROBOT_CHARGING_STARTED",
        message=f"Robot {robot.robot_id} assigned to charging station {station.station_id}.",
        details={"reason": reason},
        robot_id=robot.id,
    )
    return station


def clear_robot_assignment(db: Session, robot: Robot, reason: str, cancel_status: TaskStatus = TaskStatus.CANCELLED) -> Task | None:
    active_task = get_active_task_for_robot(db, robot)
    if active_task is None:
        return None

    active_task.status = cancel_status
    active_task.failure_reason = reason
    active_task.ended_at = now_utc()
    active_task.simulation_state = None
    active_task.route_progress_index = 0
    return active_task


def clear_robot_emergency(db: Session, robot: Robot, user_id: int | None = None, event_type: str = "ROBOT_EMERGENCY_CLEARED") -> Robot:
    release_current_station(db, robot)
    clear_robot_assignment(db, robot, "Emergency cleared by operator")
    robot.status = RobotStatus.IDLE
    robot.error_message = None
    robot.simulation_state = None
    add_log(
        db,
        event_type=event_type,
        severity=LogSeverity.WARNING,
        message=f"Robot {robot.robot_id} cleared from emergency state.",
        robot_id=robot.id,
        user_id=user_id,
    )
    return robot


def reset_robot(db: Session, robot: Robot, user_id: int | None = None) -> Robot:
    release_current_station(db, robot)
    clear_robot_assignment(db, robot, "Reset by operator")
    robot.status = RobotStatus.IDLE
    robot.error_message = None
    robot.simulation_state = None
    add_log(
        db,
        event_type="ROBOT_RESET",
        severity=LogSeverity.WARNING,
        message=f"Robot {robot.robot_id} reset to idle.",
        robot_id=robot.id,
        user_id=user_id,
    )
    return robot


def manual_control(db: Session, robot: Robot, direction: str, step_size: float) -> Robot:
    if direction == "FORWARD":
        robot.y = robot.y + step_size
    elif direction == "BACKWARD":
        robot.y = robot.y - step_size
    elif direction == "LEFT":
        robot.x = robot.x - step_size
    elif direction == "RIGHT":
        robot.x = robot.x + step_size
    elif direction == "ROTATE_LEFT":
        robot.heading = (robot.heading - 15.0) % 360
    elif direction == "ROTATE_RIGHT":
        robot.heading = (robot.heading + 15.0) % 360

    robot.x = clamp(robot.x, 0.0, 100.0)
    robot.y = clamp(robot.y, 0.0, 100.0)

    add_log(
        db,
        event_type="MANUAL_CONTROL",
        message=f"Manual control command {direction} applied to robot {robot.robot_id}.",
        robot_id=robot.id,
        details={"direction": direction, "step_size": step_size},
    )
    return robot

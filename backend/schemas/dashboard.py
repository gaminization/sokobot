from datetime import datetime

from backend.schemas.common import WRMSModel


class KPISet(WRMSModel):
    active_robots: int
    idle_robots: int
    charging_robots: int
    error_robots: int
    tasks_pending: int
    tasks_in_progress: int
    tasks_completed_today: int
    fleet_utilization_rate: float
    average_task_duration_seconds: float
    average_battery_level: float


class MapRobot(WRMSModel):
    robot_id: str
    status: str
    battery_level: float
    x: float
    y: float
    heading: float
    active_task_id: str | None = None
    trail: list[dict[str, float]]


class MapStation(WRMSModel):
    station_id: str
    name: str
    status: str
    x: float
    y: float
    current_robot_id: int | None = None


class MapWaypoint(WRMSModel):
    waypoint_id: str
    name: str
    type: str
    x: float
    y: float


class MapTask(WRMSModel):
    task_id: str
    status: str
    priority: str
    assigned_robot_id: int | None
    route_plan: list[dict]


class DashboardSnapshot(WRMSModel):
    generated_at: datetime
    kpis: KPISet
    robots: list[MapRobot]
    stations: list[MapStation]
    waypoints: list[MapWaypoint]
    tasks: list[MapTask]
    alerts: list[dict]
    recent_logs: list[dict]

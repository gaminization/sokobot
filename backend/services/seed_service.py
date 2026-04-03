from sqlalchemy.orm import Session

from backend.core.config import get_settings
from backend.core.security import get_password_hash
from backend.models import ChargingStation, Robot, Task, User, Waypoint
from backend.models.enums import ChargingStationStatus, RobotStatus, TaskPriority, TaskStatus, TaskType, UserRole
from backend.services.utils import generate_public_id


settings = get_settings()


def ensure_seed_data(db: Session) -> None:
    default_users = [
        {
            "first_name": "Marcus",
            "last_name": "Chen",
            "email": settings.admin_email,
            "password": settings.admin_password,
            "role": UserRole.ADMIN,
        },
        {
            "first_name": "Ava",
            "last_name": "Patel",
            "email": settings.operator_email,
            "password": settings.operator_password,
            "role": UserRole.OPERATOR,
        },
    ]

    for default_user in default_users:
        existing_user = db.query(User).filter(User.email == default_user["email"]).first()
        if existing_user is None:
            db.add(
                User(
                    first_name=default_user["first_name"],
                    last_name=default_user["last_name"],
                    email=default_user["email"],
                    hashed_password=get_password_hash(default_user["password"]),
                    role=default_user["role"],
                )
            )
        else:
            existing_user.first_name = default_user["first_name"]
            existing_user.last_name = default_user["last_name"]
            existing_user.role = default_user["role"]
            existing_user.is_active = True
            existing_user.hashed_password = get_password_hash(default_user["password"])
    db.flush()

    if db.query(Waypoint).count() == 0:
        db.add_all(
            [
                Waypoint(code="LOAD_A", name="Loading Bay A", type="PICKUP", x=8, y=12),
                Waypoint(code="STOR_B4", name="Storage B-4", type="STORAGE", x=28, y=18),
                Waypoint(code="STOR_C7", name="Storage C-7", type="STORAGE", x=48, y=22),
                Waypoint(code="PACK_1", name="Packing Zone 1", type="DROPOFF", x=62, y=16),
                Waypoint(code="CHG_A1", name="Charging A1", type="CHARGING", x=10, y=78),
                Waypoint(code="CHG_B1", name="Charging B1", type="CHARGING", x=28, y=78),
            ]
        )
        db.flush()
    else:
        type_mapping = {
            "LOADING": "PICKUP",
            "PACKING": "DROPOFF",
            "STORAGE": "STORAGE",
            "CHARGING": "CHARGING",
        }
        for waypoint in db.query(Waypoint).all():
            waypoint.type = type_mapping.get(waypoint.type, waypoint.type)

    if db.query(ChargingStation).count() == 0:
        db.add_all(
            [
                ChargingStation(station_id="CHARGER-A01", name="Charging A01", status=ChargingStationStatus.FREE, x=10, y=78),
                ChargingStation(station_id="CHARGER-A02", name="Charging A02", status=ChargingStationStatus.FREE, x=18, y=78),
                ChargingStation(station_id="CHARGER-B01", name="Charging B01", status=ChargingStationStatus.FREE, x=28, y=78),
                ChargingStation(station_id="CHARGER-C01", name="Charging C01", status=ChargingStationStatus.MAINTENANCE, x=38, y=78),
            ]
        )
        db.flush()
    else:
        for station in db.query(ChargingStation).all():
            if not getattr(station, "name", None):
                station.name = station.station_id.replace("CHARGER-", "Charging ")

    if db.query(Robot).count() == 0:
        robots = [
            Robot(robot_id="R-904_ALPHA", model="Apex Strider v4", status=RobotStatus.IDLE, battery_level=72, x=12, y=14),
            Robot(robot_id="R-772_DELTA", model="Apex Strider v4", status=RobotStatus.IDLE, battery_level=84, x=24, y=30),
            Robot(robot_id="R-212_SIGMA", model="LiftRunner Lite", status=RobotStatus.IDLE, battery_level=98, x=16, y=64),
            Robot(robot_id="R-551_GAMMA", model="LiftRunner Lite", status=RobotStatus.ERROR, battery_level=41, x=42, y=44, error_message="Sensor alignment fault"),
            Robot(robot_id="R-110_KAPPA", model="PalletSprint X2", status=RobotStatus.IDLE, battery_level=63, x=58, y=18),
            Robot(robot_id="R-320_OMEGA", model="PalletSprint X2", status=RobotStatus.IDLE, battery_level=54, x=66, y=30),
        ]
        db.add_all(robots)
        db.flush()

    if db.query(Task).count() == 0:
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        waypoints = {waypoint.code: waypoint for waypoint in db.query(Waypoint).all()}
        tasks = [
            Task(
                task_id=generate_public_id("TSK"),
                type=TaskType.TRANSPORT,
                priority=TaskPriority.HIGH,
                status=TaskStatus.PENDING,
                source_label=waypoints["LOAD_A"].name,
                destination_label=waypoints["STOR_B4"].name,
                source_x=waypoints["LOAD_A"].x,
                source_y=waypoints["LOAD_A"].y,
                destination_x=waypoints["STOR_B4"].x,
                destination_y=waypoints["STOR_B4"].y,
                source_waypoint_id=waypoints["LOAD_A"].id,
                destination_waypoint_id=waypoints["STOR_B4"].id,
                description="Move replenishment stock to Storage B-4",
                created_by_user_id=admin.id if admin else None,
            ),
            Task(
                task_id=generate_public_id("TSK"),
                type=TaskType.PICK_AND_PLACE,
                priority=TaskPriority.MEDIUM,
                status=TaskStatus.PENDING,
                source_label=waypoints["STOR_C7"].name,
                destination_label=waypoints["PACK_1"].name,
                source_x=waypoints["STOR_C7"].x,
                source_y=waypoints["STOR_C7"].y,
                destination_x=waypoints["PACK_1"].x,
                destination_y=waypoints["PACK_1"].y,
                source_waypoint_id=waypoints["STOR_C7"].id,
                destination_waypoint_id=waypoints["PACK_1"].id,
                description="Pick finished goods from C-7 and deliver to Packing Zone 1",
                created_by_user_id=admin.id if admin else None,
            ),
        ]
        db.add_all(tasks)

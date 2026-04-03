from enum import Enum


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"


class RobotStatus(str, Enum):
    IDLE = "IDLE"
    NAVIGATING = "NAVIGATING"
    EXECUTING = "EXECUTING"
    CHARGING = "CHARGING"
    ERROR = "ERROR"
    RECOVERY = "RECOVERY"
    OFFLINE = "OFFLINE"


class TaskPriority(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class TaskStatus(str, Enum):
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class TaskType(str, Enum):
    TRANSPORT = "TRANSPORT"
    PICK_AND_PLACE = "PICK_AND_PLACE"
    INVENTORY_SCAN = "INVENTORY_SCAN"
    CHARGING_REQUEST = "CHARGING_REQUEST"


class ChargingStationStatus(str, Enum):
    FREE = "FREE"
    OCCUPIED = "OCCUPIED"
    MAINTENANCE = "MAINTENANCE"


class AlertSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class AlertCategory(str, Enum):
    TASK = "TASK"
    ROBOT = "ROBOT"
    BATTERY = "BATTERY"
    SYSTEM = "SYSTEM"
    SECURITY = "SECURITY"
    CHARGING = "CHARGING"


class LogSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class SystemState:
    paused: bool = False
    emergency_stop: bool = False
    last_command_at: datetime | None = None
    last_command_by_user_id: int | None = None
    last_command: str | None = None
    metadata: dict = field(default_factory=dict)


system_state = SystemState()


from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WRMSModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Message(WRMSModel):
    message: str


class Timestamped(WRMSModel):
    created_at: datetime
    updated_at: datetime


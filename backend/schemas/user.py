from datetime import datetime

from pydantic import EmailStr, Field

from backend.models.enums import UserRole
from backend.schemas.common import Timestamped, WRMSModel


class UserBase(WRMSModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    role: UserRole = UserRole.OPERATOR
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(min_length=12, max_length=128)


class UserUpdate(WRMSModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=12, max_length=128)


class UserRead(UserBase, Timestamped):
    id: int
    last_login_at: datetime | None = None

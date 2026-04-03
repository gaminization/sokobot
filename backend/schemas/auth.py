from pydantic import BaseModel, EmailStr, Field

from backend.models.enums import UserRole
from backend.schemas.common import WRMSModel


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class SignupRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.OPERATOR


class Token(WRMSModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserRead"


from backend.schemas.user import UserRead  # noqa: E402

Token.model_rebuild()

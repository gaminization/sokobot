from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from backend.core.config import get_settings
from backend.core.database import get_db
from backend.core.dependencies import get_current_user
from backend.core.security import create_access_token, get_password_hash, verify_password
from backend.models import User
from backend.models.enums import LogSeverity, UserRole
from backend.schemas.common import Message
from backend.schemas.auth import LoginRequest, SignupRequest, Token
from backend.schemas.user import UserRead
from backend.services.log_service import add_log
from backend.services.utils import now_utc


router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        secure=settings.auth_cookie_secure,
        httponly=True,
        samesite=settings.auth_cookie_samesite,
    )


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, response: Response, db: Session = Depends(get_db)) -> Token:
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")

    user = User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email.lower(),
        hashed_password=get_password_hash(payload.password),
        role=UserRole.OPERATOR,
    )
    db.add(user)
    db.flush()
    add_log(
        db,
        event_type="USER_SIGNUP",
        message=f"User {user.email} registered.",
        user_id=user.id,
    )
    db.commit()
    db.refresh(user)
    token = create_access_token(str(user.id), extra={"role": user.role.value, "email": user.email})
    _set_auth_cookie(response, token)
    return Token(access_token=token, user=UserRead.model_validate(user))


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> Token:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

    if user.failed_login_attempts >= 5:
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="Account locked after repeated failures.")

    if not verify_password(payload.password, user.hashed_password):
        user.failed_login_attempts += 1
        add_log(
            db,
            event_type="LOGIN_FAILED",
            severity=LogSeverity.WARNING,
            message=f"Failed login attempt for {user.email}.",
            user_id=user.id,
            details={"failed_login_attempts": user.failed_login_attempts},
        )
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

    user.failed_login_attempts = 0
    user.last_login_at = now_utc()
    add_log(db, event_type="LOGIN_SUCCESS", message=f"User {user.email} logged in.", user_id=user.id)
    db.commit()
    db.refresh(user)
    token = create_access_token(str(user.id), extra={"role": user.role.value, "email": user.email})
    _set_auth_cookie(response, token)
    return Token(access_token=token, user=UserRead.model_validate(user))


@router.post("/logout", response_model=Message)
def logout(response: Response) -> Message:
    _clear_auth_cookie(response)
    return Message(message="Logged out successfully.")


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)

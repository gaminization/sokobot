from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.dependencies import get_current_user, require_roles
from backend.core.security import get_password_hash
from backend.models import User
from backend.models.enums import UserRole
from backend.schemas.common import Message
from backend.schemas.user import UserCreate, UserRead, UserUpdate
from backend.services.log_service import add_log


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=list[UserRead], dependencies=[Depends(require_roles(UserRole.ADMIN))])
def list_users(db: Session = Depends(get_db)) -> list[UserRead]:
    return [UserRead.model_validate(user) for user in db.query(User).order_by(User.created_at.desc()).all()]


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(UserRole.ADMIN))])
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> UserRead:
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")

    user = User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email.lower(),
        role=payload.role,
        is_active=payload.is_active,
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)
    db.flush()
    add_log(db, event_type="USER_CREATED", message=f"User {user.email} created.", user_id=current_user.id, details={"target_user_id": user.id})
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@router.get("/profile", response_model=UserRead)
def get_profile(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch("/profile", response_model=UserRead)
def update_profile(payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> UserRead:
    if payload.first_name is not None:
        current_user.first_name = payload.first_name
    if payload.last_name is not None:
        current_user.last_name = payload.last_name
    if payload.email is not None:
        existing = db.query(User).filter(User.email == payload.email.lower(), User.id != current_user.id).first()
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")
        current_user.email = payload.email.lower()
    if payload.password:
        current_user.hashed_password = get_password_hash(payload.password)

    add_log(db, event_type="PROFILE_UPDATED", message=f"User {current_user.email} updated profile.", user_id=current_user.id)
    db.commit()
    db.refresh(current_user)
    return UserRead.model_validate(current_user)


@router.patch("/{user_id}", response_model=UserRead, dependencies=[Depends(require_roles(UserRole.ADMIN))])
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserRead:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if payload.first_name is not None:
        user.first_name = payload.first_name
    if payload.last_name is not None:
        user.last_name = payload.last_name
    if payload.email is not None:
        existing = db.query(User).filter(User.email == payload.email.lower(), User.id != user.id).first()
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")
        user.email = payload.email.lower()
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password:
        user.hashed_password = get_password_hash(payload.password)

    add_log(db, event_type="USER_UPDATED", message=f"User {user.email} updated by admin.", user_id=current_user.id, details={"target_user_id": user.id})
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@router.delete("/{user_id}", response_model=Message, dependencies=[Depends(require_roles(UserRole.ADMIN))])
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Message:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account.")

    db.delete(user)
    add_log(db, event_type="USER_DELETED", message=f"User {user.email} deleted by admin.", user_id=current_user.id)
    db.commit()
    return Message(message="User deleted successfully.")

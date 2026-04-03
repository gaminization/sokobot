from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.dependencies import get_current_user, require_roles
from backend.models import Waypoint
from backend.models.enums import UserRole
from backend.schemas.common import Message
from backend.schemas.waypoint import WaypointCreate, WaypointRead, WaypointUpdate
from backend.services.log_service import add_log


router = APIRouter(prefix="/waypoints", tags=["waypoints"])


@router.get("/", response_model=list[WaypointRead])
def list_waypoints(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> list[WaypointRead]:
    return [WaypointRead.model_validate(waypoint) for waypoint in db.query(Waypoint).order_by(Waypoint.code.asc()).all()]


@router.post("/", response_model=WaypointRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(UserRole.ADMIN))])
def create_waypoint(payload: WaypointCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> WaypointRead:
    if db.query(Waypoint).filter(Waypoint.code == payload.code).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Waypoint code already exists.")
    waypoint = Waypoint(**payload.model_dump())
    db.add(waypoint)
    db.flush()
    add_log(db, event_type="WAYPOINT_CREATED", message=f"Waypoint {waypoint.code} created.", user_id=current_user.id)
    db.commit()
    db.refresh(waypoint)
    return WaypointRead.model_validate(waypoint)


@router.patch("/{waypoint_id}", response_model=WaypointRead, dependencies=[Depends(require_roles(UserRole.ADMIN))])
def update_waypoint(
    waypoint_id: int,
    payload: WaypointUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> WaypointRead:
    waypoint = db.get(Waypoint, waypoint_id)
    if waypoint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waypoint not found.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(waypoint, field, value)
    add_log(db, event_type="WAYPOINT_UPDATED", message=f"Waypoint {waypoint.code} updated.", user_id=current_user.id)
    db.commit()
    db.refresh(waypoint)
    return WaypointRead.model_validate(waypoint)


@router.delete("/{waypoint_id}", response_model=Message, dependencies=[Depends(require_roles(UserRole.ADMIN))])
def delete_waypoint(waypoint_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> Message:
    waypoint = db.get(Waypoint, waypoint_id)
    if waypoint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waypoint not found.")
    db.delete(waypoint)
    add_log(db, event_type="WAYPOINT_DELETED", message=f"Waypoint {waypoint.code} deleted.", user_id=current_user.id)
    db.commit()
    return Message(message="Waypoint deleted successfully.")

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.dependencies import get_current_user, require_roles
from backend.models import ChargingSession, ChargingStation
from backend.models.enums import UserRole
from backend.schemas.charging_station import ChargingSessionRead, ChargingStationCreate, ChargingStationRead, ChargingStationUpdate
from backend.schemas.common import Message
from backend.services.log_service import add_log


router = APIRouter(prefix="/charging-stations", tags=["charging-stations"])


@router.get("/", response_model=list[ChargingStationRead])
def list_stations(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> list[ChargingStationRead]:
    return [ChargingStationRead.model_validate(station) for station in db.query(ChargingStation).order_by(ChargingStation.station_id.asc()).all()]


@router.get("/sessions", response_model=list[ChargingSessionRead])
def list_sessions(db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> list[ChargingSessionRead]:
    return [ChargingSessionRead.model_validate(session) for session in db.query(ChargingSession).order_by(ChargingSession.started_at.desc()).limit(50).all()]


@router.post("/", response_model=ChargingStationRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(UserRole.ADMIN))])
def create_station(payload: ChargingStationCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> ChargingStationRead:
    if db.query(ChargingStation).filter(ChargingStation.station_id == payload.station_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Station ID already exists.")
    station = ChargingStation(**payload.model_dump())
    db.add(station)
    db.flush()
    add_log(db, event_type="STATION_CREATED", message=f"Charging station {station.station_id} created.", user_id=current_user.id)
    db.commit()
    db.refresh(station)
    return ChargingStationRead.model_validate(station)


@router.patch("/{station_id}", response_model=ChargingStationRead, dependencies=[Depends(require_roles(UserRole.ADMIN))])
def update_station(
    station_id: int,
    payload: ChargingStationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> ChargingStationRead:
    station = db.get(ChargingStation, station_id)
    if station is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charging station not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(station, field, value)
    add_log(db, event_type="STATION_UPDATED", message=f"Charging station {station.station_id} updated.", user_id=current_user.id)
    db.commit()
    db.refresh(station)
    return ChargingStationRead.model_validate(station)


@router.delete("/{station_id}", response_model=Message, dependencies=[Depends(require_roles(UserRole.ADMIN))])
def delete_station(station_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> Message:
    station = db.get(ChargingStation, station_id)
    if station is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charging station not found.")
    if station.current_robot_id is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot delete an occupied charging station.")
    db.delete(station)
    add_log(db, event_type="STATION_DELETED", message=f"Charging station {station.station_id} deleted.", user_id=current_user.id)
    db.commit()
    return Message(message="Charging station deleted successfully.")

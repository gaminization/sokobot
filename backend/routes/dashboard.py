import asyncio

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from backend.core.config import get_settings
from backend.core.database import get_db
from backend.core.dependencies import get_current_user
from backend.core.security import decode_token
from backend.models import User
from backend.schemas.dashboard import DashboardSnapshot, KPISet
from backend.simulation.engine import dashboard_broadcaster
from backend.services.dashboard_service import build_snapshot


router = APIRouter(prefix="/dashboard", tags=["dashboard"])
settings = get_settings()


@router.get("/snapshot", response_model=DashboardSnapshot)
def snapshot(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> DashboardSnapshot:
    return build_snapshot(db)


@router.get("/map")
def map_data(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict:
    snapshot = build_snapshot(db)
    return {
        "generated_at": snapshot.generated_at,
        "robots": snapshot.robots,
        "stations": snapshot.stations,
        "waypoints": snapshot.waypoints,
        "tasks": snapshot.tasks,
    }


@router.get("/kpis", response_model=KPISet)
def kpis(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> KPISet:
    return build_snapshot(db).kpis


@router.websocket("/ws")
async def websocket_dashboard(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token") or websocket.cookies.get(settings.auth_cookie_name)
    if not token:
        await websocket.close(code=4401, reason="Authentication required.")
        return

    try:
        payload = decode_token(token)
    except ValueError:
        await websocket.close(code=4401, reason="Invalid authentication token.")
        return

    if not payload.get("sub"):
        await websocket.close(code=4401, reason="Invalid authentication token.")
        return

    await dashboard_broadcaster.connect(websocket)
    try:
        while True:
            await asyncio.sleep(30)
            await websocket.send_json({"type": "heartbeat"})
    except WebSocketDisconnect:
        dashboard_broadcaster.disconnect(websocket)
    except Exception:
        dashboard_broadcaster.disconnect(websocket)

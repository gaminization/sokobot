from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import get_settings
from backend.core.database import Base, engine, SessionLocal
from backend.models import Alert, ChargingSession, ChargingStation, RouteHistory, Robot, SystemLog, Task, User, Waypoint
from backend.routes import alerts, auth, charging_stations, dashboard, logs, robots, system, tasks, users, waypoints
from backend.schemas.common import Message
from backend.services.seed_service import ensure_seed_data
from backend.simulation.engine import simulation_engine


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.auto_create_schema:
        Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if settings.auto_seed:
            ensure_seed_data(db)
            db.commit()
    await simulation_engine.start()
    try:
        yield
    finally:
        await simulation_engine.stop()


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_model=Message)
def root() -> Message:
    return Message(message="Sokobot backend is running.")


@app.get("/health", response_model=Message)
def health() -> Message:
    return Message(message="ok")


api_prefix = settings.api_prefix
app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(waypoints.router, prefix=api_prefix)
app.include_router(robots.router, prefix=api_prefix)
app.include_router(tasks.router, prefix=api_prefix)
app.include_router(charging_stations.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(logs.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(system.router, prefix=api_prefix)

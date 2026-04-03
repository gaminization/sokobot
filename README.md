# Sokobot

Production-oriented Sokobot web platform built from the supplied Stitch screens and `/docs` requirements set.

## What is included

- `backend/`
  FastAPI app with JWT auth, RBAC, CRUD APIs, queue allocation, robot simulation, alerts, logs, and Alembic migration support.
- `frontend/`
  React + Vite + Tailwind command-center UI derived from the Stitch layouts and connected to live APIs.
- `docs/`
  Original SRS, storyboard, UML/DFD/ER/state/activity/sequence diagrams used as the implementation source of truth.
- `tests/`
  Pytest coverage for auth, RBAC, task creation, and simulation behavior.

## Implemented modules

- User management with `Admin` and `Operator` roles
- Robot management with simulation-friendly lifecycle tracking
- Task management with auto-assignment and queue ordering
- Charging station management and charging session history
- Alerting and persistent system logs
- Dashboard snapshot and warehouse map data
- Background simulation engine for movement, task progression, charging, and recovery

## Core behavior aligned to the docs

- Task flow follows the documented operator -> system -> robot pattern.
- Allocation prefers the nearest idle robot that can finish the task with battery reserve.
- Robot lifecycle includes `IDLE`, `NAVIGATING`, `EXECUTING`, `CHARGING`, `ERROR`, and `RECOVERY`.
- Alerts/logs are stored in the database and exposed via API.
- The frontend preserves the Stitch visual language instead of redesigning the UI.

## Verified locally

- `pytest -q`
- `npm run build`
- FastAPI smoke test with auth login and dashboard snapshot
- Alembic migration smoke test against SQLite

## Default seeded accounts

- Admin: `admin@wrms.com` / `admin123`
- Operator: `operator@wrms.com` / `operator123`

## Quick start

See [INSTALL.md](/home/garvarora/warehouse-robot-management-system/INSTALL.md) for full setup.

Backend:

```bash
pip install -r backend/requirements.txt
alembic -c backend/alembic.ini upgrade head
uvicorn backend.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## API and docs

- OpenAPI UI: `http://localhost:8000/docs`
- API reference: [API_DOCS.md](/home/garvarora/warehouse-robot-management-system/API_DOCS.md)
- Installation guide: [INSTALL.md](/home/garvarora/warehouse-robot-management-system/INSTALL.md)

# API DOCS

Base URL:

- `http://localhost:8000/api`

Auth:

- Bearer JWT in `Authorization: Bearer <token>`

Swagger:

- `http://localhost:8000/docs`

## Auth

- `POST /auth/signup`
  Register a new operator account.
- `POST /auth/login`
  Obtain JWT token and current user payload.
- `GET /auth/me`
  Return the current authenticated user.

## Users

- `GET /users/`
  Admin-only user directory.
- `POST /users/`
  Admin-only user creation.
- `PATCH /users/{user_id}`
  Admin-only user update.
- `DELETE /users/{user_id}`
  Admin-only user deletion.
- `GET /users/profile`
  Current user profile.
- `PATCH /users/profile`
  Update current user name/password.

## Waypoints

- `GET /waypoints/`
  List configured warehouse nodes.
- `POST /waypoints/`
  Admin-only waypoint creation.
- `PATCH /waypoints/{waypoint_id}`
  Admin-only waypoint update.
- `DELETE /waypoints/{waypoint_id}`
  Admin-only waypoint removal.

## Robots

- `GET /robots/`
  List robots with active task summary.
- `GET /robots/{robot_id}`
  Get robot details.
- `POST /robots/`
  Admin-only robot creation.
- `PATCH /robots/{robot_id}`
  Admin-only robot update.
- `DELETE /robots/{robot_id}`
  Admin-only robot deletion.
- `POST /robots/{robot_id}/reset`
  Move robot from `ERROR` into `RECOVERY`.
- `POST /robots/{robot_id}/charge`
  Send robot to the nearest available charging station.
- `POST /robots/{robot_id}/manual-control`
  Apply a simulated manual movement or rotation command.

## Tasks

- `GET /tasks/`
  List task queue entries.
- `GET /tasks/{task_id}`
  Get task details.
- `POST /tasks/`
  Create a task. Supports manual assignment or auto-assignment.
- `PATCH /tasks/{task_id}`
  Update task metadata or manually reassign.
- `POST /tasks/{task_id}/cancel`
  Cancel a task and release the robot if needed.
- `DELETE /tasks/{task_id}`
  Delete inactive task records.

## Charging Stations

- `GET /charging-stations/`
  List stations and occupancy.
- `GET /charging-stations/sessions`
  List recent charging sessions.
- `POST /charging-stations/`
  Admin-only station creation.
- `PATCH /charging-stations/{station_id}`
  Admin-only station update.
- `DELETE /charging-stations/{station_id}`
  Admin-only station deletion.

## Alerts and Logs

- `GET /alerts/`
  List alerts.
- `POST /alerts/{alert_id}/acknowledge`
  Mark an alert as read/acknowledged.
- `GET /logs/`
  List recent system log entries.

## Dashboard and Map

- `GET /dashboard/snapshot`
  Full command-center payload with KPIs, robots, tasks, stations, alerts, and recent logs.
- `GET /dashboard/map`
  Map-focused payload for robots, stations, and routes.
- `GET /dashboard/kpis`
  KPI-only summary.
- `WS /dashboard/ws`
  Live dashboard stream endpoint.

## System Controls

- `POST /system/pause`
  Pause new task allocation.
- `POST /system/resume`
  Resume task allocation.
- `POST /system/emergency-stop`
  Trigger fleet-wide emergency stop behavior.
- `POST /system/clear-emergency`
  Clear emergency-stop mode.

## Notes on simulation

- New tasks without a manual robot assignment remain `PENDING` until the allocator picks the best eligible robot.
- The simulation engine advances robot positions, battery levels, charging behavior, and task lifecycle automatically.
- Robot error recovery is modeled through explicit reset -> recovery -> idle transitions.

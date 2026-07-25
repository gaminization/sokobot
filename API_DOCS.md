# 🔌 Sokobot API Reference

Welcome to the **Sokobot API documentation**. Our backend provides a robust suite of RESTful endpoints to manage the warehouse simulation, track robots, allocate tasks, and monitor system health.

---

## 🌐 Base Information

- **Base URL:** `http://localhost:8000/api`
- **Swagger UI:** `http://localhost:8000/docs`

### 🔐 Authentication

All protected endpoints require a JWT token passed in the `Authorization` header.
> **Format:** `Authorization: Bearer <token>`

---

## 🔑 Auth

Endpoints for managing authentication and sessions.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/signup` | Register a new operator account. |
| `POST` | `/auth/login` | Obtain JWT token and current user payload. |
| `GET` | `/auth/me` | Return the current authenticated user. |

---

## 👥 Users

Manage user accounts, roles, and profiles.

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/users/` | User directory. | 🛡️ Admin |
| `POST` | `/users/` | User creation. | 🛡️ Admin |
| `PATCH` | `/users/{user_id}` | User update. | 🛡️ Admin |
| `DELETE` | `/users/{user_id}` | User deletion. | 🛡️ Admin |
| `GET` | `/users/profile` | Current user profile. | All |
| `PATCH` | `/users/profile` | Update current user name/password. | All |

---

## 📍 Waypoints

Manage the warehouse nodes and paths.

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/waypoints/` | List configured warehouse nodes. | All |
| `POST` | `/waypoints/` | Waypoint creation. | 🛡️ Admin |
| `PATCH` | `/waypoints/{waypoint_id}`| Waypoint update. | 🛡️ Admin |
| `DELETE`| `/waypoints/{waypoint_id}`| Waypoint removal. | 🛡️ Admin |

---

## 🤖 Robots

Interact with the robot fleet and control lifecycle states.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/robots/` | List robots with active task summary. |
| `GET` | `/robots/{robot_id}` | Get specific robot details. |
| `POST` | `/robots/` | 🛡️ Admin: Robot creation. |
| `PATCH` | `/robots/{robot_id}` | 🛡️ Admin: Robot update. |
| `DELETE` | `/robots/{robot_id}` | 🛡️ Admin: Robot deletion. |
| `POST` | `/robots/{robot_id}/reset` | Move robot from `ERROR` into `RECOVERY`. |
| `POST` | `/robots/{robot_id}/charge` | Send robot to the nearest available charging station. |
| `POST` | `/robots/{robot_id}/manual-control` | Apply simulated manual movement/rotation command. |

---

## 📦 Tasks

Manage the operational queue and task allocations.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/tasks/` | List task queue entries. |
| `GET` | `/tasks/{task_id}` | Get specific task details. |
| `POST` | `/tasks/` | Create a task (Supports manual or auto-assignment). |
| `PATCH` | `/tasks/{task_id}` | Update task metadata or manually reassign. |
| `POST` | `/tasks/{task_id}/cancel` | Cancel a task and release the robot if needed. |
| `DELETE` | `/tasks/{task_id}` | Delete inactive task records. |

---

## 🔋 Charging Stations

Manage charging infrastructure and view charging history.

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/charging-stations/` | List stations and current occupancy. | All |
| `GET` | `/charging-stations/sessions` | List recent charging sessions. | All |
| `POST` | `/charging-stations/` | Station creation. | 🛡️ Admin |
| `PATCH` | `/charging-stations/{station_id}` | Station update. | 🛡️ Admin |
| `DELETE`| `/charging-stations/{station_id}` | Station deletion. | 🛡️ Admin |

---

## 🚨 Alerts & 📜 Logs

System-wide monitoring and observability endpoints.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/alerts/` | List all system alerts. |
| `POST` | `/alerts/{alert_id}/acknowledge`| Mark an alert as read/acknowledged. |
| `GET` | `/logs/` | List recent system log entries. |

---

## 📊 Dashboard & Map

Endpoints specifically tailored for frontend command-center consumption.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/dashboard/snapshot` | Full payload (KPIs, robots, tasks, stations, alerts, logs). |
| `GET` | `/dashboard/map` | Map-focused payload (robots, stations, routes). |
| `GET` | `/dashboard/kpis` | KPI-only summary. |
| `WS` | `/dashboard/ws` | Live dashboard stream (WebSocket). |

---

## 🛑 System Controls

Global system state and emergency management.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/system/pause` | Pause new task allocation. |
| `POST` | `/system/resume` | Resume task allocation. |
| `POST` | `/system/emergency-stop` | Trigger fleet-wide emergency stop behavior. |
| `POST` | `/system/clear-emergency`| Clear emergency-stop mode. |

---

## 🧠 Notes on Simulation Behavior

- **Auto-Allocation:** New tasks without a manual robot assignment remain `PENDING` until the system allocator picks the best eligible robot.
- **Autonomous Lifecycle:** The simulation engine advances robot positions, battery levels, charging behavior, and task lifecycles automatically on every tick.
- **Error Handling:** Robot error recovery is explicitly modeled through transitions: `ERROR` ➡️ `RESET` ➡️ `RECOVERY` ➡️ `IDLE`.

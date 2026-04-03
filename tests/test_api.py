from backend.models import Robot, Waypoint
from backend.models.enums import RobotStatus
from backend.simulation.engine import run_simulation_tick


def login(client, email: str, password: str) -> dict:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_login_sets_cookie_and_cookie_auth_works(client_and_session):
    client, _ = client_and_session
    response = client.post("/api/auth/login", json={"email": "admin@wrms.com", "password": "admin123"})
    assert response.status_code == 200
    assert "wrms_session" in response.cookies

    profile = client.get("/api/auth/me")
    assert profile.status_code == 200
    assert profile.json()["email"] == "admin@wrms.com"


def test_logout_clears_cookie_and_blocks_authenticated_routes(client_and_session):
    client, _ = client_and_session
    response = client.post("/api/auth/login", json={"email": "operator@wrms.com", "password": "operator123"})
    assert response.status_code == 200

    logout = client.post("/api/auth/logout")
    assert logout.status_code == 200

    profile = client.get("/api/auth/me")
    assert profile.status_code == 401


def test_auth_login_and_profile(client_and_session):
    client, _ = client_and_session
    headers = login(client, "admin@wrms.com", "admin123")
    profile = client.get("/api/auth/me", headers=headers)
    assert profile.status_code == 200
    assert profile.json()["role"] == "ADMIN"


def test_operator_cannot_access_user_directory(client_and_session):
    client, _ = client_and_session
    headers = login(client, "operator@wrms.com", "operator123")
    response = client.get("/api/users/", headers=headers)
    assert response.status_code == 403


def test_unauthenticated_dashboard_is_rejected(client_and_session):
    client, _ = client_and_session
    response = client.get("/api/dashboard/snapshot")
    assert response.status_code == 401


def test_task_creation_with_manual_assignment(client_and_session):
    client, session_factory = client_and_session
    operator_headers = login(client, "operator@wrms.com", "operator123")

    with session_factory() as db:
        robot = db.query(Robot).filter(Robot.status == RobotStatus.IDLE).first()
        waypoints = db.query(Waypoint).order_by(Waypoint.id.asc()).limit(2).all()
        source_id = waypoints[0].id
        destination_id = waypoints[1].id

    response = client.post(
        "/api/tasks/",
        headers=operator_headers,
        json={
            "type": "TRANSPORT",
            "priority": "HIGH",
            "source_waypoint_id": source_id,
            "destination_waypoint_id": destination_id,
            "source_label": "Loading Bay A",
            "source_x": 8,
            "source_y": 12,
            "destination_label": "Storage B-4",
            "destination_x": 28,
            "destination_y": 18,
            "assigned_robot_id": robot.id,
            "description": "Manual dispatch test",
        },
    )
    assert response.status_code == 201
    assert response.json()["status"] == "ASSIGNED"


def test_simulation_tick_sends_low_battery_robot_to_charge(client_and_session):
    client, session_factory = client_and_session
    headers = login(client, "admin@wrms.com", "admin123")
    snapshot = client.get("/api/dashboard/snapshot", headers=headers)
    assert snapshot.status_code == 200

    with session_factory() as db:
        robot = db.query(Robot).filter(Robot.status == RobotStatus.IDLE).first()
        robot.battery_level = 10
        db.commit()
        run_simulation_tick(db)
        db.commit()
        db.refresh(robot)
        assert robot.status == RobotStatus.CHARGING


def test_admin_can_create_user(client_and_session):
    client, _ = client_and_session
    admin_headers = login(client, "admin@wrms.com", "admin123")
    response = client.post(
        "/api/users/",
        headers=admin_headers,
        json={
            "first_name": "Taylor",
            "last_name": "Nguyen",
            "email": "taylor.nguyen@wrms.com",
            "password": "warehouse123",
            "role": "OPERATOR",
            "is_active": True,
        },
    )
    assert response.status_code == 201
    assert response.json()["email"] == "taylor.nguyen@wrms.com"


def test_admin_can_update_user_email_and_role(client_and_session):
    client, _ = client_and_session
    admin_headers = login(client, "admin@wrms.com", "admin123")
    created = client.post(
        "/api/users/",
        headers=admin_headers,
        json={
            "first_name": "Avery",
            "last_name": "Stone",
            "email": "avery.stone@sokobot.com",
            "password": "Warehouse123!Secure",
            "role": "OPERATOR",
            "is_active": True,
        },
    )
    assert created.status_code == 201

    updated = client.patch(
        f"/api/users/{created.json()['id']}",
        headers=admin_headers,
        json={
            "email": "avery.stone+admin@sokobot.com",
            "role": "ADMIN",
            "is_active": False,
        },
    )
    assert updated.status_code == 200
    assert updated.json()["email"] == "avery.stone+admin@sokobot.com"
    assert updated.json()["role"] == "ADMIN"
    assert updated.json()["is_active"] is False


def test_admin_can_delete_other_user_but_not_self(client_and_session):
    client, _ = client_and_session
    admin_headers = login(client, "admin@wrms.com", "admin123")
    created = client.post(
        "/api/users/",
        headers=admin_headers,
        json={
            "first_name": "Mina",
            "last_name": "Lopez",
            "email": "mina.lopez@sokobot.com",
            "password": "Warehouse123!Secure",
            "role": "OPERATOR",
            "is_active": True,
        },
    )
    assert created.status_code == 201

    deleted = client.delete(f"/api/users/{created.json()['id']}", headers=admin_headers)
    assert deleted.status_code == 200

    me = client.get("/api/auth/me", headers=admin_headers)
    self_delete = client.delete(f"/api/users/{me.json()['id']}", headers=admin_headers)
    assert self_delete.status_code == 400


def test_emergency_stop_and_clear_recover_robot_states(client_and_session):
    client, session_factory = client_and_session
    admin_headers = login(client, "admin@wrms.com", "admin123")

    with session_factory() as db:
        waypoints = db.query(Waypoint).order_by(Waypoint.id.asc()).limit(2).all()
        source_id = waypoints[0].id
        destination_id = waypoints[1].id

    task_response = client.post(
        "/api/tasks/",
        headers=admin_headers,
        json={
            "type": "TRANSPORT",
            "priority": "HIGH",
            "source_waypoint_id": source_id,
            "destination_waypoint_id": destination_id,
            "source_label": "Loading Bay A",
            "source_x": 8,
            "source_y": 12,
            "destination_label": "Storage B-4",
            "destination_x": 28,
            "destination_y": 18,
            "description": "Emergency stop flow",
        },
    )
    assert task_response.status_code == 201

    estop = client.post("/api/system/emergency-stop", headers=admin_headers)
    assert estop.status_code == 200

    resume = client.post("/api/system/resume", headers=admin_headers)
    assert resume.status_code == 409

    clear = client.post("/api/system/clear-emergency", headers=admin_headers)
    assert clear.status_code == 200

    robots = client.get("/api/robots/", headers=admin_headers)
    assert robots.status_code == 200
    assert all(robot["status"] != "ERROR" for robot in robots.json())

    task = client.get(f"/api/tasks/{task_response.json()['id']}", headers=admin_headers)
    assert task.status_code == 200
    assert task.json()["status"] == "CANCELLED"


def test_admin_can_create_update_and_delete_charging_station(client_and_session):
    client, _ = client_and_session
    admin_headers = login(client, "admin@wrms.com", "admin123")

    created = client.post(
        "/api/charging-stations/",
        headers=admin_headers,
        json={
            "station_id": "CHARGER-Z99",
            "name": "Charging Z99",
            "status": "FREE",
            "x": 82,
            "y": 76,
        },
    )
    assert created.status_code == 201
    assert created.json()["name"] == "Charging Z99"

    updated = client.patch(
        f"/api/charging-stations/{created.json()['id']}",
        headers=admin_headers,
        json={"name": "Charging Z99 Updated", "status": "MAINTENANCE", "x": 84, "y": 74},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "MAINTENANCE"

    deleted = client.delete(f"/api/charging-stations/{created.json()['id']}", headers=admin_headers)
    assert deleted.status_code == 200


def test_admin_can_create_update_and_delete_waypoint(client_and_session):
    client, _ = client_and_session
    admin_headers = login(client, "admin@wrms.com", "admin123")

    created = client.post(
        "/api/waypoints/",
        headers=admin_headers,
        json={"code": "DROP_99", "name": "Drop Zone 99", "type": "DROPOFF", "x": 88, "y": 18},
    )
    assert created.status_code == 201
    assert created.json()["type"] == "DROPOFF"

    updated = client.patch(
        f"/api/waypoints/{created.json()['id']}",
        headers=admin_headers,
        json={"name": "Drop Zone 99 Updated", "type": "STORAGE", "x": 86, "y": 20},
    )
    assert updated.status_code == 200
    assert updated.json()["type"] == "STORAGE"

    deleted = client.delete(f"/api/waypoints/{created.json()['id']}", headers=admin_headers)
    assert deleted.status_code == 200

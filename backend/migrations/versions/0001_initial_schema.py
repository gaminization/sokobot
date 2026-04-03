"""initial wrms schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-04-02 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


user_role = sa.Enum("ADMIN", "OPERATOR", name="userrole")
robot_status = sa.Enum("IDLE", "NAVIGATING", "EXECUTING", "CHARGING", "ERROR", "RECOVERY", "OFFLINE", name="robotstatus")
task_priority = sa.Enum("HIGH", "MEDIUM", "LOW", name="taskpriority")
task_status = sa.Enum("PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "FAILED", "CANCELLED", name="taskstatus")
task_type = sa.Enum("TRANSPORT", "PICK_AND_PLACE", "INVENTORY_SCAN", "CHARGING_REQUEST", name="tasktype")
charging_station_status = sa.Enum("FREE", "OCCUPIED", "MAINTENANCE", name="chargingstationstatus")
alert_severity = sa.Enum("INFO", "WARNING", "CRITICAL", name="alertseverity")
alert_category = sa.Enum("TASK", "ROBOT", "BATTERY", "SYSTEM", "SECURITY", "CHARGING", name="alertcategory")
log_severity = sa.Enum("INFO", "WARNING", "ERROR", "CRITICAL", name="logseverity")


def upgrade() -> None:
    bind = op.get_bind()
    dialect_name = bind.dialect.name
    for enum in [
        user_role,
        robot_status,
        task_priority,
        task_status,
        task_type,
        charging_station_status,
        alert_severity,
        alert_category,
        log_severity,
    ]:
        enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "waypoints",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("x", sa.Float(), nullable=False),
        sa.Column("y", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_waypoints_code"), "waypoints", ["code"], unique=True)

    op.create_table(
        "robots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("robot_id", sa.String(length=50), nullable=False),
        sa.Column("model", sa.String(length=120), nullable=False),
        sa.Column("battery_level", sa.Float(), nullable=False),
        sa.Column("status", robot_status, nullable=False),
        sa.Column("x", sa.Float(), nullable=False),
        sa.Column("y", sa.Float(), nullable=False),
        sa.Column("heading", sa.Float(), nullable=False),
        sa.Column("max_speed", sa.Float(), nullable=False),
        sa.Column("load_capacity", sa.Float(), nullable=False),
        sa.Column("battery_capacity", sa.Float(), nullable=False),
        sa.Column("software_version", sa.String(length=50), nullable=False),
        sa.Column("error_message", sa.String(length=255), nullable=True),
        sa.Column("simulation_state", sa.JSON(), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_station_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_robots_robot_id"), "robots", ["robot_id"], unique=True)

    op.create_table(
        "charging_stations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("station_id", sa.String(length=50), nullable=False),
        sa.Column("status", charging_station_status, nullable=False),
        sa.Column("x", sa.Float(), nullable=False),
        sa.Column("y", sa.Float(), nullable=False),
        sa.Column("current_robot_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_charging_stations_station_id"), "charging_stations", ["station_id"], unique=True)

    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("task_id", sa.String(length=50), nullable=False),
        sa.Column("type", task_type, nullable=False),
        sa.Column("priority", task_priority, nullable=False),
        sa.Column("status", task_status, nullable=False),
        sa.Column("source_label", sa.String(length=120), nullable=False),
        sa.Column("destination_label", sa.String(length=120), nullable=False),
        sa.Column("source_x", sa.Float(), nullable=False),
        sa.Column("source_y", sa.Float(), nullable=False),
        sa.Column("destination_x", sa.Float(), nullable=False),
        sa.Column("destination_y", sa.Float(), nullable=False),
        sa.Column("route_plan", sa.JSON(), nullable=True),
        sa.Column("simulation_state", sa.JSON(), nullable=True),
        sa.Column("route_progress_index", sa.Integer(), nullable=False),
        sa.Column("source_waypoint_id", sa.Integer(), nullable=True),
        sa.Column("destination_waypoint_id", sa.Integer(), nullable=True),
        sa.Column("assigned_robot_id", sa.Integer(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("estimated_distance", sa.Float(), nullable=False),
        sa.Column("estimated_duration_seconds", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("assignment_mode", sa.String(length=20), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_reason", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assigned_robot_id"], ["robots.id"], name=op.f("fk_tasks_assigned_robot_id_robots")),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], name=op.f("fk_tasks_created_by_user_id_users")),
        sa.ForeignKeyConstraint(["destination_waypoint_id"], ["waypoints.id"], name=op.f("fk_tasks_destination_waypoint_id_waypoints")),
        sa.ForeignKeyConstraint(["source_waypoint_id"], ["waypoints.id"], name=op.f("fk_tasks_source_waypoint_id_waypoints")),
    )
    op.create_index(op.f("ix_tasks_task_id"), "tasks", ["task_id"], unique=True)

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("alert_id", sa.String(length=50), nullable=False),
        sa.Column("severity", alert_severity, nullable=False),
        sa.Column("category", alert_category, nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("context", sa.JSON(), nullable=True),
        sa.Column("robot_id", sa.Integer(), nullable=True),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column("acknowledged_by_user_id", sa.Integer(), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["acknowledged_by_user_id"], ["users.id"], name=op.f("fk_alerts_acknowledged_by_user_id_users")),
        sa.ForeignKeyConstraint(["robot_id"], ["robots.id"], name=op.f("fk_alerts_robot_id_robots")),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], name=op.f("fk_alerts_task_id_tasks")),
    )
    op.create_index(op.f("ix_alerts_alert_id"), "alerts", ["alert_id"], unique=True)

    op.create_table(
        "system_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("severity", log_severity, nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("robot_id", sa.Integer(), nullable=True),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["robot_id"], ["robots.id"], name=op.f("fk_system_logs_robot_id_robots")),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], name=op.f("fk_system_logs_task_id_tasks")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_system_logs_user_id_users")),
    )
    op.create_index(op.f("ix_system_logs_event_type"), "system_logs", ["event_type"], unique=False)

    op.create_table(
        "route_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("robot_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column("sequence_index", sa.Integer(), nullable=False),
        sa.Column("x", sa.Float(), nullable=False),
        sa.Column("y", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["robot_id"], ["robots.id"], name=op.f("fk_route_history_robot_id_robots")),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], name=op.f("fk_route_history_task_id_tasks")),
    )
    op.create_index(op.f("ix_route_history_robot_id"), "route_history", ["robot_id"], unique=False)
    op.create_index(op.f("ix_route_history_task_id"), "route_history", ["task_id"], unique=False)

    op.create_table(
        "charging_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("station_id", sa.Integer(), nullable=False),
        sa.Column("robot_id", sa.Integer(), nullable=False),
        sa.Column("battery_start", sa.Float(), nullable=False),
        sa.Column("battery_end", sa.Float(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["robot_id"], ["robots.id"], name=op.f("fk_charging_sessions_robot_id_robots")),
        sa.ForeignKeyConstraint(["station_id"], ["charging_stations.id"], name=op.f("fk_charging_sessions_station_id_charging_stations")),
    )

    if dialect_name != "sqlite":
        op.create_foreign_key(op.f("fk_robots_current_station_id_charging_stations"), "robots", "charging_stations", ["current_station_id"], ["id"])
        op.create_foreign_key(op.f("fk_charging_stations_current_robot_id_robots"), "charging_stations", "robots", ["current_robot_id"], ["id"])


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.drop_constraint(op.f("fk_charging_stations_current_robot_id_robots"), "charging_stations", type_="foreignkey")
        op.drop_constraint(op.f("fk_robots_current_station_id_charging_stations"), "robots", type_="foreignkey")
    op.drop_table("charging_sessions")
    op.drop_index(op.f("ix_route_history_task_id"), table_name="route_history")
    op.drop_index(op.f("ix_route_history_robot_id"), table_name="route_history")
    op.drop_table("route_history")
    op.drop_index(op.f("ix_system_logs_event_type"), table_name="system_logs")
    op.drop_table("system_logs")
    op.drop_index(op.f("ix_alerts_alert_id"), table_name="alerts")
    op.drop_table("alerts")
    op.drop_index(op.f("ix_tasks_task_id"), table_name="tasks")
    op.drop_table("tasks")
    op.drop_index(op.f("ix_charging_stations_station_id"), table_name="charging_stations")
    op.drop_table("charging_stations")
    op.drop_index(op.f("ix_robots_robot_id"), table_name="robots")
    op.drop_table("robots")
    op.drop_index(op.f("ix_waypoints_code"), table_name="waypoints")
    op.drop_table("waypoints")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    for enum in [
        log_severity,
        alert_category,
        alert_severity,
        charging_station_status,
        task_type,
        task_status,
        task_priority,
        robot_status,
        user_role,
    ]:
        enum.drop(bind, checkfirst=True)

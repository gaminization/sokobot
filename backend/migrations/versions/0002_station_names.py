"""add charging station names

Revision ID: 0002_station_names
Revises: 0001_initial_schema
Create Date: 2026-04-03 21:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_station_names"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("charging_stations", sa.Column("name", sa.String(length=120), nullable=True))
    op.execute("UPDATE charging_stations SET name = station_id WHERE name IS NULL")
    with op.batch_alter_table("charging_stations") as batch_op:
        batch_op.alter_column("name", existing_type=sa.String(length=120), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("charging_stations") as batch_op:
        batch_op.drop_column("name")

"""Database tables.

Metadata names (gyms, muscle groups, lifts, machines) are unique
case-insensitively within their scope. That is enforced by unique indexes on
lower(trim(name)); see app/names.py for the matching lookup.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, Index, Numeric, func, text
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, SQLModel


class WeightUnit(StrEnum):
    lbs = "lbs"
    kg = "kg"
    plates = "plates"


# Postgres enum type shared by sets.weight_unit and settings.default_unit.
weight_unit_type = SAEnum(WeightUnit, name="weight_unit")


def created_at_field() -> datetime | None:
    return Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"server_default": func.now()},
        nullable=False,
    )


class MetadataBase(SQLModel):
    """Columns shared by every metadata table. Not a table itself."""

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    archived: bool = Field(default=False, sa_column_kwargs={"server_default": text("false")})
    created_at: datetime | None = created_at_field()


class Gym(MetadataBase, table=True):
    __tablename__ = "gyms"
    __table_args__ = (
        Index("uq_gyms_name", text("lower(trim(name))"), unique=True),
    )


class MuscleGroup(MetadataBase, table=True):
    __tablename__ = "muscle_groups"
    __table_args__ = (
        Index("uq_muscle_groups_name", text("lower(trim(name))"), unique=True),
    )


class Lift(MetadataBase, table=True):
    __tablename__ = "lifts"
    __table_args__ = (
        Index("uq_lifts_muscle_group_name", "muscle_group_id", text("lower(trim(name))"), unique=True),
    )

    muscle_group_id: int = Field(foreign_key="muscle_groups.id")


class Machine(MetadataBase, table=True):
    __tablename__ = "machines"
    __table_args__ = (
        Index("uq_machines_gym_name", "gym_id", text("lower(trim(name))"), unique=True),
    )

    gym_id: int = Field(foreign_key="gyms.id")


class WorkoutSet(SQLModel, table=True):
    """One logged set. Named WorkoutSet to avoid confusion with Python's built-in set."""

    __tablename__ = "sets"
    __table_args__ = (
        CheckConstraint("reps > 0", name="ck_sets_reps_positive"),
        CheckConstraint("weight_value >= 0", name="ck_sets_weight_non_negative"),
    )

    id: int | None = Field(default=None, primary_key=True)
    lift_id: int = Field(foreign_key="lifts.id", index=True)
    machine_id: int | None = Field(default=None, foreign_key="machines.id", index=True)
    weight_value: Decimal = Field(sa_type=Numeric(7, 2))
    weight_unit: WeightUnit = Field(sa_type=weight_unit_type)
    reps: int
    approximate: bool = Field(default=False, sa_column_kwargs={"server_default": text("false")})
    performed_on: date | None = None
    notes: str | None = None
    created_at: datetime | None = created_at_field()
    updated_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"server_default": func.now(), "onupdate": func.now()},
        nullable=False,
    )


class Settings(SQLModel, table=True):
    """Exactly one row (id = 1), created by the initial migration."""

    __tablename__ = "settings"
    __table_args__ = (CheckConstraint("id = 1", name="ck_settings_single_row"),)

    id: int = Field(default=1, primary_key=True)
    default_unit: WeightUnit = Field(
        default=WeightUnit.lbs,
        sa_type=weight_unit_type,
        sa_column_kwargs={"server_default": WeightUnit.lbs.value},
    )

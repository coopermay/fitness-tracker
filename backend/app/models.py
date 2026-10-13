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


class ThemeBase(StrEnum):
    """Background colours. `system` follows the phone's light/dark setting."""

    system = "system"
    light = "light"
    dark = "dark"
    black = "black"
    navy = "navy"


class Sex(StrEnum):
    """Only used by the calorie formula, which differs by sex."""

    male = "male"
    female = "female"


class ActivityLevel(StrEnum):
    """How active you are outside the gym too; multiplies resting calories."""

    sedentary = "sedentary"
    light = "light"
    moderate = "moderate"
    active = "active"
    very_active = "very_active"


class BodyUnits(StrEnum):
    """How height and bodyweight are shown and entered. Stored in metric."""

    imperial = "imperial"
    metric = "metric"


class ThemeAccent(StrEnum):
    blue = "blue"
    green = "green"
    purple = "purple"
    orange = "orange"
    red = "red"
    pink = "pink"
    teal = "teal"
    gold = "gold"


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
    # The machine whose numbers count for relative strength on Insights, since
    # numbers differ machine to machine. Null = automatic (the most-used one).
    strength_machine_id: int | None = Field(default=None, foreign_key="machines.id")


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
    __table_args__ = (
        CheckConstraint("id = 1", name="ck_settings_single_row"),
        CheckConstraint(
            "rep_range_min >= 1 AND rep_range_min <= rep_range_max AND rep_range_max <= 50",
            name="ck_settings_rep_range",
        ),
        CheckConstraint("height_cm BETWEEN 50 AND 275", name="ck_settings_height"),
        CheckConstraint("weight_kg BETWEEN 20 AND 400", name="ck_settings_weight"),
    )

    id: int = Field(default=1, primary_key=True)
    default_unit: WeightUnit = Field(
        default=WeightUnit.lbs,
        sa_type=weight_unit_type,
        sa_column_kwargs={"server_default": WeightUnit.lbs.value},
    )
    theme_base: ThemeBase = Field(
        default=ThemeBase.system,
        sa_type=SAEnum(ThemeBase, name="theme_base"),
        sa_column_kwargs={"server_default": ThemeBase.system.value},
    )
    theme_accent: ThemeAccent = Field(
        default=ThemeAccent.blue,
        sa_type=SAEnum(ThemeAccent, name="theme_accent"),
        sa_column_kwargs={"server_default": ThemeAccent.blue.value},
    )
    # The target rep range on the Today page: aim to finish a set between
    # these, and move up a weight once you beat the top of the range.
    rep_range_min: int = Field(default=6, sa_column_kwargs={"server_default": text("6")})
    rep_range_max: int = Field(default=8, sa_column_kwargs={"server_default": text("8")})
    # Body stats (Settings -> Body stats). Optional; calculations that need a
    # missing value are left out.
    sex: Sex | None = Field(default=None, sa_type=SAEnum(Sex, name="sex"))
    birth_date: date | None = None
    height_cm: Decimal | None = Field(default=None, sa_type=Numeric(5, 1))
    weight_kg: Decimal | None = Field(default=None, sa_type=Numeric(5, 2))
    activity_level: ActivityLevel = Field(
        default=ActivityLevel.moderate,
        sa_type=SAEnum(ActivityLevel, name="activity_level"),
        sa_column_kwargs={"server_default": ActivityLevel.moderate.value},
    )
    body_units: BodyUnits = Field(
        default=BodyUnits.imperial,
        sa_type=SAEnum(BodyUnits, name="body_units"),
        sa_column_kwargs={"server_default": BodyUnits.imperial.value},
    )


class SplitDay(SQLModel, table=True):
    """One muscle group trained on one weekday of the user's weekly split.

    weekday follows Python's date.weekday(): 0 = Monday ... 6 = Sunday.
    A weekday with no rows is a rest day.
    """

    __tablename__ = "split_days"
    __table_args__ = (CheckConstraint("weekday BETWEEN 0 AND 6", name="ck_split_days_weekday"),)

    weekday: int = Field(primary_key=True)
    muscle_group_id: int = Field(foreign_key="muscle_groups.id", primary_key=True)

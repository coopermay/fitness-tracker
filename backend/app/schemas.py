"""Request and response bodies for the API.

These are separate from the database tables in app/models.py so the API shape
can differ from storage (e.g. weights are Decimal in the DB but plain JSON
numbers in responses).
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models import WeightUnit

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Weight = Annotated[Decimal, Field(ge=0, max_digits=7, decimal_places=2)]


class ReadModel(BaseModel):
    """Base for responses built from database objects."""

    model_config = ConfigDict(from_attributes=True)


# --- Metadata ---------------------------------------------------------------


class MetadataRead(ReadModel):
    id: int
    name: str
    archived: bool
    created_at: datetime


class GymRead(MetadataRead):
    pass


class MuscleGroupRead(MetadataRead):
    pass


class LiftRead(MetadataRead):
    muscle_group_id: int


class LiftListItem(LiftRead):
    last_performed_on: date | None


class MachineRead(MetadataRead):
    gym_id: int


class GymCreate(BaseModel):
    name: Name


class MuscleGroupCreate(BaseModel):
    name: Name


class LiftCreate(BaseModel):
    name: Name
    muscle_group_id: int


class MachineCreate(BaseModel):
    name: Name
    gym_id: int


class MetadataUpdate(BaseModel):
    """Rename and/or archive. Omitted fields are left unchanged."""

    name: Name | None = None
    archived: bool | None = None


# --- Sets -------------------------------------------------------------------


class SetCreate(BaseModel):
    lift_id: int
    machine_id: int | None = None
    weight_value: Weight
    weight_unit: WeightUnit
    reps: int = Field(gt=0)
    approximate: bool = False
    performed_on: date | None = None
    notes: str | None = None


class SetUpdate(BaseModel):
    """Only the fields sent are changed.

    Fields typed without `| None` can be omitted but not sent as null.
    """

    machine_id: int | None = None
    weight_value: Weight = None
    weight_unit: WeightUnit = None
    reps: int = Field(default=None, gt=0)
    approximate: bool = None
    performed_on: date | None = None
    notes: str | None = None


class SetRead(ReadModel):
    id: int
    lift_id: int
    machine_id: int | None
    weight_value: float
    weight_unit: WeightUnit
    reps: int
    approximate: bool
    performed_on: date | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class SetCreated(SetRead):
    is_new_record: bool = Field(
        description="True if no earlier set on this lift + machine + unit + weight had as many reps."
    )


# --- Records ----------------------------------------------------------------


class RecordRow(BaseModel):
    set_id: int
    weight_value: float
    weight_unit: WeightUnit
    reps: int
    approximate: bool
    performed_on: date | None
    notes: str | None
    estimated_1rm: float | None = Field(description="Epley, rounded to 0.5. Null for plates.")


class ProgressPoint(BaseModel):
    date: date
    value: float = Field(description="Best est. 1RM that day; for plates, the heaviest weight.")
    weight_value: float  # the set that produced `value`
    reps: int
    approximate: bool


class UnitRecords(BaseModel):
    weight_unit: WeightUnit
    records: list[RecordRow]
    progress: list[ProgressPoint] = Field(description="One point per dated session, oldest first.")


class MachineRecords(BaseModel):
    machine: MachineRead | None = Field(description="Null groups sets with no machine recorded.")
    last_performed_on: date | None
    units: list[UnitRecords]
    history: list[SetRead]


class LiftRecords(BaseModel):
    lift: LiftRead
    machine_groups: list[MachineRecords]


# --- Calendar ---------------------------------------------------------------


class CalendarSet(BaseModel):
    id: int
    machine_name: str | None
    weight_value: float
    weight_unit: WeightUnit
    reps: int
    approximate: bool
    is_pr: bool = Field(
        description="First set at this lift + machine + unit + weight, or more reps there than "
        "any earlier set (replayed in date order)."
    )


class CalendarLift(BaseModel):
    lift_id: int
    lift_name: str
    sets: list[CalendarSet]  # in the order they were entered


class CalendarDay(BaseModel):
    date: date
    set_count: int
    pr_count: int
    lifts: list[CalendarLift]  # in the order they were first trained that day


# --- Weekly split -----------------------------------------------------------


class SplitDayBody(BaseModel):
    weekday: int = Field(ge=0, le=6, description="0 = Monday ... 6 = Sunday")
    muscle_group_ids: list[int] = Field(description="Empty = rest day")


class SplitBody(BaseModel):
    """The whole week. Responses always list all 7 days, Monday first."""

    days: list[SplitDayBody]


# --- Insights ---------------------------------------------------------------


class Insights(BaseModel):
    plateaued_lift_ids: list[int] = Field(
        description="Lifts done in the last 4 weeks with no PR in that time."
    )
    overdue_muscle_group_ids: list[int] = Field(
        description="Muscle groups whose scheduled split days earlier this week outnumber "
        "the days they've been trained this week."
    )


# --- Settings ---------------------------------------------------------------


class SettingsRead(ReadModel):
    default_unit: WeightUnit


class SettingsUpdate(BaseModel):
    default_unit: WeightUnit

"""Personal records: the most reps at each weight, per lift + machine + unit."""

from collections import defaultdict
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from sqlmodel import Session, func, select

from app.models import Lift, Machine, WeightUnit, WorkoutSet
from app.schemas import (
    LiftRead,
    LiftRecords,
    MachineRead,
    MachineRecords,
    RecordRow,
    SetRead,
    UnitRecords,
)


def estimated_one_rep_max(weight: Decimal, reps: int, unit: WeightUnit) -> float | None:
    """Epley formula, w * (1 + reps/30), rounded to the nearest 0.5.

    Plates are a count, not a weight, so there's no meaningful 1RM for them.
    """
    if unit == WeightUnit.plates:
        return None
    raw = Decimal(weight) * (1 + Decimal(reps) / 30)
    halves = (raw * 2).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return float(halves / 2)


def recency_key(workout_set: WorkoutSet) -> tuple[bool, date, int]:
    """Sort key from oldest to newest.

    Undated sets count as older than any dated set. Ties fall back to id,
    i.e. the order the sets were entered.
    """
    performed_on = workout_set.performed_on
    return (performed_on is not None, performed_on or date.min, workout_set.id)


def best_set_per_weight(sets: list[WorkoutSet]) -> list[WorkoutSet]:
    """For each distinct weight keep the set with the most reps (ties: most recent).

    Expects sets of a single unit. Returns heaviest first.
    """
    best: dict[Decimal, WorkoutSet] = {}
    for workout_set in sets:
        current = best.get(workout_set.weight_value)
        if current is None or (workout_set.reps, recency_key(workout_set)) > (
            current.reps,
            recency_key(current),
        ):
            best[workout_set.weight_value] = workout_set
    return sorted(best.values(), key=lambda s: s.weight_value, reverse=True)


def to_record_row(workout_set: WorkoutSet) -> RecordRow:
    return RecordRow(
        set_id=workout_set.id,
        weight_value=workout_set.weight_value,
        weight_unit=workout_set.weight_unit,
        reps=workout_set.reps,
        approximate=workout_set.approximate,
        performed_on=workout_set.performed_on,
        notes=workout_set.notes,
        estimated_1rm=estimated_one_rep_max(
            workout_set.weight_value, workout_set.reps, workout_set.weight_unit
        ),
    )


def build_lift_records(
    lift: Lift, sets: list[WorkoutSet], machines_by_id: dict[int, Machine]
) -> LiftRecords:
    """Group a lift's sets by machine, then unit, and pick the records in each group.

    Machine groups and the units inside them are ordered most recently used first.
    """
    sets_by_machine: dict[int | None, list[WorkoutSet]] = defaultdict(list)
    for workout_set in sets:
        sets_by_machine[workout_set.machine_id].append(workout_set)

    groups: list[tuple[tuple, MachineRecords]] = []
    for machine_id, machine_sets in sets_by_machine.items():
        history = sorted(machine_sets, key=recency_key, reverse=True)

        # history is newest first, so units are inserted most recently used first
        sets_by_unit: dict[WeightUnit, list[WorkoutSet]] = defaultdict(list)
        for workout_set in history:
            sets_by_unit[workout_set.weight_unit].append(workout_set)

        machine = machines_by_id[machine_id] if machine_id is not None else None
        group = MachineRecords(
            machine=MachineRead.model_validate(machine) if machine else None,
            last_performed_on=history[0].performed_on,
            units=[
                UnitRecords(
                    weight_unit=unit,
                    records=[to_record_row(s) for s in best_set_per_weight(unit_sets)],
                )
                for unit, unit_sets in sets_by_unit.items()
            ],
            history=[SetRead.model_validate(s) for s in history],
        )
        groups.append((recency_key(history[0]), group))

    groups.sort(key=lambda pair: pair[0], reverse=True)
    return LiftRecords(
        lift=LiftRead.model_validate(lift),
        machine_groups=[group for _, group in groups],
    )


def previous_best_reps(
    session: Session,
    lift_id: int,
    machine_id: int | None,
    unit: WeightUnit,
    weight: Decimal,
) -> int | None:
    """Most reps logged at exactly this lift + machine + unit + weight, or None if never."""
    statement = select(func.max(WorkoutSet.reps)).where(
        WorkoutSet.lift_id == lift_id,
        WorkoutSet.machine_id.is_not_distinct_from(machine_id),  # treats NULL = NULL
        WorkoutSet.weight_unit == unit,
        WorkoutSet.weight_value == weight,
    )
    return session.exec(statement).one()

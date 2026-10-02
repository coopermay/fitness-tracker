"""Day-by-day activity for the calendar view, including which sets were PRs."""

from collections import defaultdict
from datetime import date

from app.models import Lift, Machine, WorkoutSet
from app.records import recency_key
from app.schemas import CalendarDay, CalendarLift, CalendarSet


def find_pr_set_ids(sets: list[WorkoutSet]) -> set[int]:
    """Ids of sets that were a personal record when they were done.

    A set is a PR if it's the first at its lift + machine + unit + weight, or
    has more reps there than any earlier set (the same rule as the "New best"
    banner). Sets are replayed oldest first using recency_key, so undated sets
    count as before all dated ones and same-day sets go in entry order.
    """
    best_reps: dict[tuple, int] = {}
    pr_ids: set[int] = set()
    for workout_set in sorted(sets, key=recency_key):
        key = (
            workout_set.lift_id,
            workout_set.machine_id,
            workout_set.weight_unit,
            workout_set.weight_value,
        )
        previous_best = best_reps.get(key)
        if previous_best is None or workout_set.reps > previous_best:
            pr_ids.add(workout_set.id)
            best_reps[key] = workout_set.reps
    return pr_ids


def build_calendar(
    sets: list[WorkoutSet],
    lifts_by_id: dict[int, Lift],
    machines_by_id: dict[int, Machine],
) -> list[CalendarDay]:
    """One entry per date that has sets, newest first. Undated sets are left out."""
    pr_ids = find_pr_set_ids(sets)

    sets_by_date: dict[date, list[WorkoutSet]] = defaultdict(list)
    for workout_set in sets:
        if workout_set.performed_on is not None:
            sets_by_date[workout_set.performed_on].append(workout_set)

    days = []
    for day, day_sets in sorted(sets_by_date.items(), reverse=True):
        # dicts keep insertion order, so lifts appear in the order first trained
        sets_by_lift: dict[int, list[WorkoutSet]] = defaultdict(list)
        for workout_set in sorted(day_sets, key=lambda s: s.id):
            sets_by_lift[workout_set.lift_id].append(workout_set)

        days.append(
            CalendarDay(
                date=day,
                set_count=len(day_sets),
                pr_count=sum(1 for s in day_sets if s.id in pr_ids),
                lifts=[
                    CalendarLift(
                        lift_id=lift_id,
                        lift_name=lifts_by_id[lift_id].name,
                        sets=[to_calendar_set(s, machines_by_id, pr_ids) for s in lift_sets],
                    )
                    for lift_id, lift_sets in sets_by_lift.items()
                ],
            )
        )
    return days


def to_calendar_set(
    workout_set: WorkoutSet, machines_by_id: dict[int, Machine], pr_ids: set[int]
) -> CalendarSet:
    machine = machines_by_id.get(workout_set.machine_id) if workout_set.machine_id else None
    return CalendarSet(
        id=workout_set.id,
        machine_name=machine.name if machine else None,
        weight_value=workout_set.weight_value,
        weight_unit=workout_set.weight_unit,
        reps=workout_set.reps,
        approximate=workout_set.approximate,
        is_pr=workout_set.id in pr_ids,
    )

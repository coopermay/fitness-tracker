"""Plateau and overdue flags, computed from set history and the weekly split."""

from collections import Counter, defaultdict
from datetime import date, timedelta

from app.calendar import find_pr_set_ids
from app.models import Lift, SplitDay, WorkoutSet

PLATEAU_WINDOW_DAYS = 28  # "the last 4 weeks", including today


def plateaued_lift_ids(sets: list[WorkoutSet], today: date) -> list[int]:
    """Lifts trained in the last 4 weeks without a single PR in that time.

    Uses the same PR rule as the calendar (first set at a weight counts).
    """
    pr_ids = find_pr_set_ids(sets)
    window_start = today - timedelta(days=PLATEAU_WINDOW_DAYS - 1)
    trained: set[int] = set()
    had_pr: set[int] = set()
    for workout_set in sets:
        day = workout_set.performed_on
        if day is not None and window_start <= day <= today:
            trained.add(workout_set.lift_id)
            if workout_set.id in pr_ids:
                had_pr.add(workout_set.lift_id)
    return sorted(trained - had_pr)


def overdue_muscle_group_ids(
    sets: list[WorkoutSet],
    lifts_by_id: dict[int, Lift],
    split_days: list[SplitDay],
    today: date,
) -> list[int]:
    """Muscle groups that have fallen behind the split this week (Monday to today).

    A group is overdue when more of its scheduled days have already passed this
    week (before today) than the number of days it's been trained this week.
    Training it on a different day than scheduled still counts. Today's
    scheduled groups aren't overdue yet.
    """
    monday = today - timedelta(days=today.weekday())
    scheduled_days_passed = Counter(
        row.muscle_group_id for row in split_days if row.weekday < today.weekday()
    )

    days_trained: dict[int, set[date]] = defaultdict(set)
    for workout_set in sets:
        day = workout_set.performed_on
        if day is not None and monday <= day <= today:
            muscle_group_id = lifts_by_id[workout_set.lift_id].muscle_group_id
            days_trained[muscle_group_id].add(day)

    return sorted(
        muscle_group_id
        for muscle_group_id, passed in scheduled_days_passed.items()
        if len(days_trained[muscle_group_id]) < passed
    )

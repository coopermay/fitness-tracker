"""Plateau flags, computed from set history."""

from datetime import date, timedelta

from app.calendar import find_pr_set_ids
from app.models import WorkoutSet

PLATEAU_WINDOW_DAYS = 21  # "the last 3 weeks", including today


def plateaued_lift_ids(sets: list[WorkoutSet], today: date) -> list[int]:
    """Lifts trained in the last 3 weeks without a single PR in that time.

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

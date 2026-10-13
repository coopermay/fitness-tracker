"""The Today page: today's split groups, your usual lifts, and what to beat.

Target rule (double progression, the user's own method): keep a weight until
you beat the top of the rep range (e.g. 9 reps with a 6-8 range), then move up
one increment and aim for at least the bottom of the range.
"""

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from app.calendar import find_pr_set_ids
from app.insights import plateaued_lift_ids
from app.models import Lift, Machine, MuscleGroup, SplitDay, WeightUnit, WorkoutSet
from app.records import best_set_per_weight, recency_key
from app.schemas import (
    LastSession,
    NextTraining,
    Target,
    TodayGroup,
    TodayLift,
    TodayResponse,
    TodaySet,
)

USUAL_WINDOW_DAYS = 42  # "the last 6 weeks", including today
USUAL_LIFTS_PER_GROUP = 2  # the user does two lifts per muscle group

# Step up by this much when there's no history to learn the step from.
DEFAULT_INCREMENT = {
    WeightUnit.lbs: Decimal("5"),
    WeightUnit.kg: Decimal("2.5"),
    WeightUnit.plates: Decimal("1"),
}


def weight_increment(sets: list[WorkoutSet], unit: WeightUnit) -> Decimal:
    """The smallest gap between weights you've used (one machine + unit).

    Machines and dumbbells go up in fixed steps, so your own history is the
    best guide to the next weight. Falls back to a default per unit.
    """
    weights = sorted({s.weight_value for s in sets})
    gaps = [b - a for a, b in zip(weights, weights[1:])]
    return min(gaps) if gaps else DEFAULT_INCREMENT[unit]


def target_for(sets: list[WorkoutSet], rep_min: int, rep_max: int) -> Target | None:
    """What to beat next time, from the sets before today (one machine + unit).

    The working weight is the heaviest weight from your most recent session.
    Below the top of the range there: one more rep than your best. Past the
    top of the range: the next weight up, aiming for one more rep than your
    best there (if you've tried it) and at least `rep_min`.
    """
    if not sets:
        return None
    latest = max(sets, key=recency_key)
    last_day = [s for s in sets if s.performed_on == latest.performed_on]
    working_weight = max(s.weight_value for s in last_day)

    best_reps = {s.weight_value: s.reps for s in best_set_per_weight(sets)}
    unit = latest.weight_unit
    if best_reps[working_weight] <= rep_max:
        return Target(
            weight_value=float(working_weight),
            weight_unit=unit,
            reps=best_reps[working_weight] + 1,
            move_up=False,
        )

    next_weight = working_weight + weight_increment(sets, unit)
    reps = max(rep_min, best_reps.get(next_weight, 0) + 1)
    return Target(weight_value=float(next_weight), weight_unit=unit, reps=reps, move_up=True)


def usual_lift_ids(lifts: list[Lift], sets_by_lift: dict[int, list[WorkoutSet]], today: date) -> list[int]:
    """The lifts you've trained on the most days in the last 6 weeks, best first.

    Ties go to the one done most recently, then to creation order. At most
    USUAL_LIFTS_PER_GROUP.
    """
    window_start = today - timedelta(days=USUAL_WINDOW_DAYS - 1)
    ranked = []
    for lift in lifts:
        days = {
            s.performed_on
            for s in sets_by_lift[lift.id]
            if s.performed_on is not None and window_start <= s.performed_on <= today
        }
        if days:
            # Negated so a plain ascending sort puts the best first.
            ranked.append((-len(days), -max(days).toordinal(), lift.id))
    ranked.sort()
    return [lift_id for _, _, lift_id in ranked[:USUAL_LIFTS_PER_GROUP]]


def to_today_set(workout_set: WorkoutSet, pr_ids: set[int]) -> TodaySet:
    return TodaySet(
        id=workout_set.id,
        weight_value=float(workout_set.weight_value),
        weight_unit=workout_set.weight_unit,
        reps=workout_set.reps,
        approximate=workout_set.approximate,
        is_pr=workout_set.id in pr_ids,
    )


def build_today_lift(
    lift: Lift,
    lift_sets: list[WorkoutSet],
    today: date,
    machines_by_id: dict[int, Machine],
    pr_ids: set[int],
    plateaued: set[int],
    rep_min: int,
    rep_max: int,
) -> TodayLift:
    sets_today = sorted((s for s in lift_sets if s.performed_on == today), key=lambda s: s.id)
    earlier = [s for s in lift_sets if s.performed_on is None or s.performed_on < today]

    # Last session and target use the machine + unit you used most recently.
    latest = max(earlier or sets_today, key=recency_key, default=None)
    machine_id = latest.machine_id if latest else None
    machine = machines_by_id.get(machine_id) if machine_id is not None else None
    same_setup = [
        s for s in earlier if latest and s.machine_id == machine_id and s.weight_unit == latest.weight_unit
    ]

    dated = [s for s in same_setup if s.performed_on is not None]
    last_session = None
    if dated:
        last_date = max(s.performed_on for s in dated)
        last_session = LastSession(
            date=last_date,
            machine_name=machine.name if machine else None,
            sets=[to_today_set(s, pr_ids) for s in sorted(dated, key=lambda s: s.id) if s.performed_on == last_date],
        )

    return TodayLift(
        id=lift.id,
        name=lift.name,
        plateaued=lift.id in plateaued,
        machine_id=machine_id,
        machine_name=machine.name if machine else None,
        last_session=last_session,
        target=target_for(same_setup, rep_min, rep_max),
        sets_today=[to_today_set(s, pr_ids) for s in sets_today],
    )


def next_training_day(
    split_days: list[SplitDay], groups_by_id: dict[int, MuscleGroup], today: date
) -> NextTraining | None:
    """The next day (after today, within a week) that has visible groups in the split."""
    for offset in range(1, 8):
        day = today + timedelta(days=offset)
        names = [
            groups_by_id[row.muscle_group_id].name
            for row in sorted(split_days, key=lambda r: r.muscle_group_id)
            if row.weekday == day.weekday() and row.muscle_group_id in groups_by_id
        ]
        if names:
            return NextTraining(date=day, muscle_groups=names)
    return None


def build_today(
    today: date,
    sets: list[WorkoutSet],
    lifts: list[Lift],
    muscle_groups: list[MuscleGroup],
    machines_by_id: dict[int, Machine],
    split_days: list[SplitDay],
    rep_min: int,
    rep_max: int,
) -> TodayResponse:
    """Everything the Today page shows, in one response.

    Archived muscle groups and lifts are left out; archived machines still show.
    """
    pr_ids = find_pr_set_ids(sets)
    plateaued = set(plateaued_lift_ids(sets, today))
    sets_by_lift: dict[int, list[WorkoutSet]] = defaultdict(list)
    for workout_set in sets:
        sets_by_lift[workout_set.lift_id].append(workout_set)

    visible_groups = {g.id: g for g in muscle_groups if not g.archived}
    todays_group_ids = sorted(
        row.muscle_group_id
        for row in split_days
        if row.weekday == today.weekday() and row.muscle_group_id in visible_groups
    )

    groups = []
    for group_id in todays_group_ids:
        group_lifts = sorted(
            (lift for lift in lifts if lift.muscle_group_id == group_id and not lift.archived),
            key=lambda lift: lift.id,
        )
        built = {
            lift.id: build_today_lift(
                lift, sets_by_lift[lift.id], today, machines_by_id, pr_ids, plateaued, rep_min, rep_max
            )
            for lift in group_lifts
        }
        # Your usual lifts first, then anything else you've already done today.
        main_ids = usual_lift_ids(group_lifts, sets_by_lift, today)
        main_ids += [lift_id for lift_id, item in built.items() if item.sets_today and lift_id not in main_ids]

        # "Show all": most recently done first; never-done lifts last.
        def last_done(lift_id: int) -> tuple[bool, date]:
            days = [s.performed_on for s in sets_by_lift[lift_id] if s.performed_on is not None]
            return (bool(days), max(days, default=date.min))

        other_ids = sorted((i for i in built if i not in main_ids), key=last_done, reverse=True)
        groups.append(
            TodayGroup(
                id=group_id,
                name=visible_groups[group_id].name,
                lifts=[built[i] for i in main_ids],
                other_lifts=[built[i] for i in other_ids],
            )
        )

    sets_today = [s for s in sets if s.performed_on == today]
    return TodayResponse(
        date=today,
        groups=groups,
        next_training=None if groups else next_training_day(split_days, visible_groups, today),
        lifts_done=len({s.lift_id for s in sets_today}),
        set_count=len(sets_today),
        pr_count=sum(1 for s in sets_today if s.id in pr_ids),
        rep_range_min=rep_min,
        rep_range_max=rep_max,
    )

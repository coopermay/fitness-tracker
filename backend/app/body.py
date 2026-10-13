"""Calculations from body stats: age, calories, protein, water and relative strength.

Body stats are stored in metric. Lifts keep their own unit (records are never
converted); for relative strength the bodyweight is expressed in the lift's
unit instead.
"""

from collections import defaultdict
from datetime import date
from decimal import Decimal

from app.models import ActivityLevel, Lift, Machine, Settings, Sex, WeightUnit, WorkoutSet
from app.records import best_set, estimated_one_rep_max, recency_key
from app.schemas import (
    BodyStats,
    CalorieTargets,
    ProteinRange,
    RelativeStrength,
    StrengthScore,
    WaterTarget,
)
from app.standards import grade, level_for_score, standard_for

LBS_PER_KG = Decimal("2.20462262")

# Standard multipliers for total daily energy expenditure.
ACTIVITY_MULTIPLIERS = {
    ActivityLevel.sedentary: 1.2,  # desk job, little exercise
    ActivityLevel.light: 1.375,  # exercise 1-3 days a week
    ActivityLevel.moderate: 1.55,  # 3-5 days
    ActivityLevel.active: 1.725,  # 6-7 days
    ActivityLevel.very_active: 1.9,  # hard training plus a physical job
}

CUT_DEFICIT = 500
LEAN_BULK_SURPLUS = 300
PROTEIN_G_PER_KG = (1.6, 2.2)
WATER_ML_PER_KG = 35
TRAINING_DAY_EXTRA_ML = 500


def age_on(birth_date: date, today: date) -> int:
    """Whole years, counting a birthday only once it has happened this year."""
    had_birthday = (today.month, today.day) >= (birth_date.month, birth_date.day)
    return today.year - birth_date.year - (0 if had_birthday else 1)


def bmr_mifflin_st_jeor(weight_kg: float, height_cm: float, age: int, sex: Sex) -> float:
    """Resting calories per day: 10w + 6.25h - 5a, then +5 (male) or -161 (female)."""
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    return base + (5 if sex == Sex.male else -161)


def round_to_10(value: float) -> int:
    return int(round(value / 10) * 10)


def calorie_targets(bmr: float, activity: ActivityLevel) -> CalorieTargets:
    maintenance = bmr * ACTIVITY_MULTIPLIERS[activity]
    return CalorieTargets(
        bmr=round_to_10(bmr),
        maintenance=round_to_10(maintenance),
        cut=round_to_10(maintenance - CUT_DEFICIT),
        lean_bulk=round_to_10(maintenance + LEAN_BULK_SURPLUS),
    )


def protein_range(weight_kg: float) -> ProteinRange:
    low, high = PROTEIN_G_PER_KG
    return ProteinRange(min_g=round(weight_kg * low), max_g=round(weight_kg * high))


def water_target(weight_kg: float) -> WaterTarget:
    daily = round(weight_kg * WATER_ML_PER_KG / 100) * 100
    return WaterTarget(daily_ml=daily, training_day_ml=daily + TRAINING_DAY_EXTRA_ML)


def bodyweight_in(unit: WeightUnit, weight_kg: Decimal) -> Decimal:
    return weight_kg * LBS_PER_KG if unit == WeightUnit.lbs else weight_kg


def strength_machine(lift: Lift, lift_sets: list[WorkoutSet]) -> tuple[int | None, bool] | None:
    """Which machine counts for this lift's relative strength, and whether automatically.

    The one picked on the lift page if it has weighted sets; otherwise the
    machine trained on the most days (ties: most recent). None if the lift
    has no lbs/kg sets at all.
    """
    weighted = [s for s in lift_sets if s.weight_unit != WeightUnit.plates]
    if not weighted:
        return None
    if lift.strength_machine_id is not None and any(s.machine_id == lift.strength_machine_id for s in weighted):
        return lift.strength_machine_id, False

    days: dict[int | None, set] = defaultdict(set)
    latest: dict[int | None, tuple] = {}
    for workout_set in weighted:
        days[workout_set.machine_id].add(workout_set.performed_on)
        latest[workout_set.machine_id] = max(latest.get(workout_set.machine_id, ()), recency_key(workout_set))
    machine_id = max(days, key=lambda m: (len(days[m]), latest[m]))
    return machine_id, True


def relative_strength(
    sets: list[WorkoutSet],
    lifts_by_id: dict[int, Lift],
    machines_by_id: dict[int, Machine],
    weight_kg: Decimal,
    sex: Sex | None,
) -> list[RelativeStrength]:
    """One row per non-archived lift: its best set on its strength machine ÷ bodyweight.

    The best set follows the Today page's rule (best est. 1RM among 5+ rep
    sets), in the unit used most recently on that machine. Lifts with a
    strength standard also get a level and score (needs sex). Strongest first.
    """
    sets_by_lift: dict[int, list[WorkoutSet]] = defaultdict(list)
    for workout_set in sets:
        sets_by_lift[workout_set.lift_id].append(workout_set)

    rows = []
    for lift_id, lift_sets in sets_by_lift.items():
        lift = lifts_by_id[lift_id]
        choice = None if lift.archived else strength_machine(lift, lift_sets)
        if choice is None:
            continue
        machine_id, automatic = choice
        on_machine = [s for s in lift_sets if s.machine_id == machine_id and s.weight_unit != WeightUnit.plates]
        unit = max(on_machine, key=recency_key).weight_unit
        best = best_set([s for s in on_machine if s.weight_unit == unit])

        one_rep_max = estimated_one_rep_max(best.weight_value, best.reps, best.weight_unit)
        ratio = one_rep_max / float(bodyweight_in(unit, weight_kg))
        machine = machines_by_id.get(machine_id) if machine_id is not None else None
        key = standard_for(lift.name, machine.name if machine else None)
        level, score = grade(ratio, sex, key) if key and sex else (None, None)
        rows.append(
            RelativeStrength(
                lift_id=lift_id,
                lift_name=lift.name,
                machine_id=machine_id,
                machine_name=machine.name if machine else None,
                automatic=automatic,
                weight_value=float(best.weight_value),
                reps=best.reps,
                one_rep_max=one_rep_max,
                weight_unit=unit,
                ratio=round(ratio, 2),
                level=level,
                score=score,
            )
        )
    return sorted(rows, key=lambda row: row.ratio, reverse=True)


def strength_score(rows: list[RelativeStrength]) -> StrengthScore | None:
    """The average score of the graded lifts, or None if none are graded."""
    scores = [row.score for row in rows if row.score is not None]
    if not scores:
        return None
    average = sum(scores) / len(scores)
    return StrengthScore(score=round(average), level=level_for_score(average), graded_lifts=len(scores))


def build_body_stats(
    settings: Settings,
    today: date,
    sets: list[WorkoutSet],
    lifts_by_id: dict[int, Lift],
    machines_by_id: dict[int, Machine],
) -> BodyStats:
    """Everything the Body stats page shows. Missing inputs leave parts empty."""
    missing = [
        field
        for field in ("sex", "birth_date", "height_cm", "weight_kg")
        if getattr(settings, field) is None
    ]
    age = age_on(settings.birth_date, today) if settings.birth_date else None

    calories = None
    if not missing:
        bmr = bmr_mifflin_st_jeor(float(settings.weight_kg), float(settings.height_cm), age, settings.sex)
        calories = calorie_targets(bmr, settings.activity_level)

    weight_kg = settings.weight_kg
    strength = (
        relative_strength(sets, lifts_by_id, machines_by_id, weight_kg, settings.sex)
        if weight_kg is not None
        else []
    )
    return BodyStats(
        age=age,
        calories=calories,
        protein=protein_range(float(weight_kg)) if weight_kg is not None else None,
        water=water_target(float(weight_kg)) if weight_kg is not None else None,
        strength_score=strength_score(strength),
        relative_strength=strength,
        missing=missing,
    )

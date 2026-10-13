"""Calculations from body stats: age, calories, protein and relative strength.

Body stats are stored in metric. Lifts keep their own unit (records are never
converted); for relative strength the bodyweight is expressed in the lift's
unit instead.
"""

from datetime import date
from decimal import Decimal

from app.models import ActivityLevel, Lift, Machine, Settings, Sex, WeightUnit, WorkoutSet
from app.records import estimated_one_rep_max
from app.schemas import BodyStats, CalorieTargets, ProteinRange, RelativeStrength

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


def bodyweight_in(unit: WeightUnit, weight_kg: Decimal) -> Decimal:
    return weight_kg * LBS_PER_KG if unit == WeightUnit.lbs else weight_kg


def relative_strength(
    sets: list[WorkoutSet],
    lifts_by_id: dict[int, Lift],
    machines_by_id: dict[int, Machine],
    weight_kg: Decimal,
) -> list[RelativeStrength]:
    """Each non-archived lift's best est. 1RM divided by bodyweight, strongest first.

    Plates are left out: they're a count, not a weight, so there's no 1RM.
    """
    best: dict[int, tuple[float, WorkoutSet]] = {}
    for workout_set in sets:
        lift = lifts_by_id[workout_set.lift_id]
        if lift.archived:
            continue
        one_rep_max = estimated_one_rep_max(workout_set.weight_value, workout_set.reps, workout_set.weight_unit)
        if one_rep_max is None:
            continue
        ratio = one_rep_max / float(bodyweight_in(workout_set.weight_unit, weight_kg))
        if workout_set.lift_id not in best or ratio > best[workout_set.lift_id][0]:
            best[workout_set.lift_id] = (ratio, workout_set)

    rows = []
    for lift_id, (ratio, workout_set) in best.items():
        machine = machines_by_id.get(workout_set.machine_id) if workout_set.machine_id else None
        rows.append(
            RelativeStrength(
                lift_id=lift_id,
                lift_name=lifts_by_id[lift_id].name,
                machine_name=machine.name if machine else None,
                one_rep_max=estimated_one_rep_max(
                    workout_set.weight_value, workout_set.reps, workout_set.weight_unit
                ),
                weight_unit=workout_set.weight_unit,
                ratio=round(ratio, 2),
            )
        )
    return sorted(rows, key=lambda row: row.ratio, reverse=True)


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
    return BodyStats(
        age=age,
        calories=calories,
        protein=protein_range(float(weight_kg)) if weight_kg is not None else None,
        relative_strength=(
            relative_strength(sets, lifts_by_id, machines_by_id, weight_kg) if weight_kg is not None else []
        ),
        missing=missing,
    )

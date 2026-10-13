"""Strength standards: grading a lift's est. 1RM / bodyweight ratio.

The thresholds are approximate, adult, not age-adjusted, and in line with
commonly published strength standards for free-weight lifts. Each list is the
ratio needed to reach Novice, Intermediate, Advanced and Elite; anything below
Novice is Beginner. Dumbbell standards are per dumbbell.

Machines aren't graded: their numbers depend on the machine (pulleys, cams,
stack weights), so there's nothing fair to compare them with.
"""

from app.models import Sex

LEVELS = ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"]

# key -> sex -> thresholds for Novice, Intermediate, Advanced, Elite
STANDARDS: dict[str, dict[Sex, list[float]]] = {
    "barbell_bench": {Sex.male: [0.75, 1.0, 1.5, 2.0], Sex.female: [0.5, 0.75, 1.0, 1.5]},
    "barbell_squat": {Sex.male: [1.25, 1.5, 2.25, 2.75], Sex.female: [0.75, 1.25, 1.5, 2.0]},
    "barbell_deadlift": {Sex.male: [1.5, 2.0, 2.5, 3.0], Sex.female: [1.0, 1.25, 1.75, 2.5]},
    "barbell_overhead_press": {Sex.male: [0.55, 0.8, 1.1, 1.4], Sex.female: [0.35, 0.5, 0.75, 1.0]},
    "barbell_row": {Sex.male: [0.75, 1.0, 1.5, 1.75], Sex.female: [0.4, 0.65, 0.9, 1.2]},
    "barbell_curl": {Sex.male: [0.4, 0.6, 0.85, 1.15], Sex.female: [0.2, 0.4, 0.6, 0.85]},
    "dumbbell_bench": {Sex.male: [0.35, 0.5, 0.75, 1.0], Sex.female: [0.2, 0.3, 0.45, 0.65]},
    "dumbbell_shoulder_press": {Sex.male: [0.25, 0.4, 0.55, 0.75], Sex.female: [0.15, 0.25, 0.35, 0.5]},
    "dumbbell_curl": {Sex.male: [0.2, 0.35, 0.5, 0.65], Sex.female: [0.1, 0.2, 0.3, 0.45]},
}

# (key, words the lift name must contain one of, words that rule it out)
_LIFT_PATTERNS: dict[str, list[tuple[str, list[str], list[str]]]] = {
    "barbell": [
        ("barbell_bench", ["bench"], ["incline", "decline", "close"]),
        ("barbell_squat", ["squat"], ["split", "hack", "goblet", "front", "box"]),
        ("barbell_deadlift", ["deadlift"], ["romanian", "rdl", "stiff", "sumo", "trap"]),
        ("barbell_overhead_press", ["overhead press", "ohp", "military", "shoulder press"], ["seated"]),
        ("barbell_row", ["row"], ["upright", "pendlay", "seal"]),
        ("barbell_curl", ["curl"], ["leg", "hamstring", "wrist", "reverse"]),
    ],
    "dumbbell": [
        ("dumbbell_bench", ["bench", "chest press"], ["incline", "decline"]),
        ("dumbbell_shoulder_press", ["shoulder press", "overhead press"], []),
        ("dumbbell_curl", ["curl"], ["leg", "hamstring", "wrist", "concentration"]),
    ],
}


def standard_for(lift_name: str, machine_name: str | None) -> str | None:
    """Which standard applies, from the lift name and a Barbell/Dumbbell machine.

    E.g. "Bench press" on "Barbell" -> "barbell_bench"; "Hammer curl" on
    "Dumbbell" -> "dumbbell_curl". Anything else (including all machines) -> None.
    """
    machine = (machine_name or "").lower()
    kind = "barbell" if "barbell" in machine else "dumbbell" if "dumbbell" in machine else None
    if kind is None:
        return None
    name = lift_name.lower()
    for key, include, exclude in _LIFT_PATTERNS[kind]:
        if any(word in name for word in include) and not any(word in name for word in exclude):
            return key
    return None


def grade(ratio: float, sex: Sex, key: str) -> tuple[str, float]:
    """The level name and a 0-100 score for one lift.

    The score places the ratio on the Beginner -> Elite scale: each level is 25
    points, interpolated between thresholds (0 at no weight, 100 at Elite).
    """
    thresholds = STANDARDS[key][sex]
    level = sum(1 for threshold in thresholds if ratio >= threshold)
    if level == len(thresholds):
        return LEVELS[level], 100.0
    low = thresholds[level - 1] if level > 0 else 0.0
    high = thresholds[level]
    score = 25 * (level + (ratio - low) / (high - low))
    return LEVELS[level], round(score, 1)


def level_for_score(score: float) -> str:
    """The level matching an overall 0-100 score (25 points per level)."""
    return LEVELS[min(int(score // 25), len(LEVELS) - 1)]

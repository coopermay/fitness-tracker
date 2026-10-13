# Body stats

**Code:** [`routers/body.py`](../../backend/app/routers/body.py), logic in [`body.py`](../../backend/app/body.py) (see [Domain logic → body.py](../04-backend/domain-logic.md#bodypy))

Numbers worked out from your body stats: age, calorie targets, protein and water, and graded relative strength for each lift, with an overall strength score. The **inputs** (sex, date of birth, height, weight, activity level, display units) are settings, edited with [`PATCH /settings`](settings-and-health.md#update-settings).

---

## Get body stats

`GET /api/body`

| Query param | Type | Default | Notes |
| --- | --- | --- | --- |
| `today` | `"YYYY-MM-DD"` | the **server's** date | Pass it from the client; used for the age |

### Response 200 (`BodyStats`)

| Field | Type | Meaning | Needs |
| --- | --- | --- | --- |
| `age` | int \| null | Whole years on `today` | birth date |
| `calories` | object \| null | `bmr`, `maintenance`, `cut`, `lean_bulk` in kcal/day, rounded to 10 | sex, birth date, height, weight |
| `protein` | `{min_g, max_g}` \| null | Grams a day | weight |
| `water` | `{daily_ml, training_day_ml}` \| null | About 35 ml/kg, rounded to 100 ml; +500 ml on training days | weight |
| `strength_score` | `{score, level, graded_lifts}` \| null | The average 0–100 score of your graded lifts, and its level | weight, sex, a graded lift |
| `relative_strength` | `RelativeStrength[]` | Strongest first; empty without a weight | weight |
| `missing` | string[] | Which of `sex`, `birth_date`, `height_cm`, `weight_kg` are still empty | |

**`RelativeStrength`:** `{lift_id, lift_name, machine_id, machine_name, automatic, weight_value, reps, one_rep_max, weight_unit, ratio, level, score}`. One row per non-archived lift with lbs/kg sets:
- **Which machine:** the one picked on the lift page (`lifts.strength_machine_id`, set with [`PATCH /lifts/{id}`](metadata-endpoints.md#update-a-lift)), or **automatically** the machine trained on the most days (ties: most recent). Numbers aren't comparable between machines, so only one counts. `automatic` says which.
- **Which set:** the [best set](today.md#best-set-and-goal) on that machine, in the unit used most recently there (`weight_value`, `reps`, and its est. 1RM `one_rep_max`).
- `ratio` = `one_rep_max` ÷ bodyweight in that unit, to 0.01.
- `level` (`Beginner`, `Novice`, `Intermediate`, `Advanced`, `Elite`) and `score` (0–100), only for lifts with a [strength standard](#strength-standards) and with `sex` set; otherwise `null`.

Plates sets are left out (no 1RM).

### Formulas

| Value | Formula |
| --- | --- |
| BMR (Mifflin-St Jeor) | `10 × kg + 6.25 × cm − 5 × age`, then `+ 5` (male) or `− 161` (female) |
| Maintenance (TDEE) | BMR × activity: sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very active 1.9 |
| Cut / lean bulk | maintenance − 500 / + 300 |
| Protein | 1.6–2.2 g per kg of bodyweight (≈ 0.7–1 g per lb) |
| Water | `kg × 35` ml rounded to 100; training days + 500 ml |
| Relative strength | best set's est. 1RM ÷ bodyweight; for lbs lifts the bodyweight is `kg × 2.20462262` |
| Lift score | 25 points per level, interpolated between thresholds (0 at no weight, 100 at Elite) |
| Strength score | the average lift score, rounded; its level is `score ÷ 25` (Beginner 0–24, Novice 25–49, Intermediate 50–74, Advanced 75–99, Elite 100) |

Bodyweight is converted to the lift's unit, never the other way round, so logged records are still never converted.

### Strength standards

From [`app/standards.py`](../../backend/app/standards.py). Approximate adult standards in line with commonly published ones, **not age-adjusted**. Each value is the 1RM ÷ bodyweight needed for that level; below Novice is Beginner. Dumbbell values are **per dumbbell**.

| Standard | Men: Novice / Intermediate / Advanced / Elite | Women |
| --- | --- | --- |
| Barbell bench | 0.75 / 1.0 / 1.5 / 2.0 | 0.5 / 0.75 / 1.0 / 1.5 |
| Barbell squat | 1.25 / 1.5 / 2.25 / 2.75 | 0.75 / 1.25 / 1.5 / 2.0 |
| Barbell deadlift | 1.5 / 2.0 / 2.5 / 3.0 | 1.0 / 1.25 / 1.75 / 2.5 |
| Barbell overhead press | 0.55 / 0.8 / 1.1 / 1.4 | 0.35 / 0.5 / 0.75 / 1.0 |
| Barbell row | 0.75 / 1.0 / 1.5 / 1.75 | 0.4 / 0.65 / 0.9 / 1.2 |
| Barbell curl | 0.4 / 0.6 / 0.85 / 1.15 | 0.2 / 0.4 / 0.6 / 0.85 |
| Dumbbell bench | 0.35 / 0.5 / 0.75 / 1.0 | 0.2 / 0.3 / 0.45 / 0.65 |
| Dumbbell shoulder press | 0.25 / 0.4 / 0.55 / 0.75 | 0.15 / 0.25 / 0.35 / 0.5 |
| Dumbbell curl (incl. hammer) | 0.2 / 0.35 / 0.5 / 0.65 | 0.1 / 0.2 / 0.3 / 0.45 |

**Matching** (`standard_for`): the machine's name must contain "barbell" or "dumbbell", and the lift's name must contain a keyword (e.g. "bench", "squat", "curl") without an excluding one (e.g. "incline", "front", "romanian", "leg"). Everything else, including every machine, is ungraded: machine numbers depend on the machine.

```bash
curl -s "localhost:8000/api/body?today=2026-10-01"
```
```json
{
  "age": 29,
  "calories": {"bmr": 1780, "maintenance": 2770, "cut": 2270, "lean_bulk": 3070},
  "protein": {"min_g": 128, "max_g": 176},
  "water": {"daily_ml": 2800, "training_day_ml": 3300},
  "strength_score": {"score": 63, "level": "Intermediate", "graded_lifts": 1},
  "relative_strength": [
    {"lift_id": 1, "lift_name": "Bench press", "machine_id": 2, "machine_name": "Barbell", "automatic": false,
     "weight_value": 185, "reps": 6, "one_rep_max": 222.0, "weight_unit": "lbs", "ratio": 1.26,
     "level": "Intermediate", "score": 63.0}
  ],
  "missing": []
}
```

**Used by:** the Insights tab (`useBody`). Settings changes, set changes and lift/machine updates (including picking a lift's machine) refresh it.

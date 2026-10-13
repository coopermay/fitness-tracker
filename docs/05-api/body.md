# Body stats

**Code:** [`routers/body.py`](../../backend/app/routers/body.py), logic in [`body.py`](../../backend/app/body.py) (see [Domain logic → body.py](../04-backend/domain-logic.md#bodypy))

Numbers worked out from your body stats: age, calorie targets, a protein range, and relative strength for each lift. The **inputs** (sex, date of birth, height, weight, activity level, display units) are settings, edited with [`PATCH /settings`](settings-and-health.md#update-settings).

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
| `relative_strength` | `RelativeStrength[]` | Strongest first; empty without a weight | weight |
| `missing` | string[] | Which of `sex`, `birth_date`, `height_cm`, `weight_kg` are still empty | |

**`RelativeStrength`:** `{lift_id, lift_name, machine_name, one_rep_max, weight_unit, ratio}`. This is the lift's best estimated 1RM (Epley, any machine, its own unit) divided by your bodyweight in that unit, rounded to 0.01. Archived lifts and plates sets are left out.

### Formulas

| Value | Formula |
| --- | --- |
| BMR (Mifflin-St Jeor) | `10 × kg + 6.25 × cm − 5 × age`, then `+ 5` (male) or `− 161` (female) |
| Maintenance (TDEE) | BMR × activity: sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very active 1.9 |
| Cut / lean bulk | maintenance − 500 / + 300 |
| Protein | 1.6–2.2 g per kg of bodyweight (≈ 0.7–1 g per lb) |
| Relative strength | best est. 1RM ÷ bodyweight; for lbs lifts the bodyweight is `kg × 2.20462262` |

Bodyweight is converted to the lift's unit, never the other way round, so logged records are still never converted.

```bash
curl -s "localhost:8000/api/body?today=2026-10-01"
```
```json
{
  "age": 29,
  "calories": {"bmr": 1780, "maintenance": 2770, "cut": 2270, "lean_bulk": 3070},
  "protein": {"min_g": 128, "max_g": 176},
  "relative_strength": [
    {"lift_id": 2, "lift_name": "Squat", "machine_name": null, "one_rep_max": 116.5, "weight_unit": "kg", "ratio": 1.46}
  ],
  "missing": []
}
```

**Used by:** Settings → Body stats (`useBody`). Settings changes, set changes and lift/machine updates refresh it.

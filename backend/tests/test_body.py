"""Body stats: the settings fields, the calculations, and GET /body."""

from datetime import date

import pytest

from app.body import age_on, bmr_mifflin_st_jeor, calorie_targets
from app.models import ActivityLevel, Sex

TODAY = "2026-10-01"
PROFILE = {"sex": "male", "birth_date": "1996-10-02", "height_cm": 180, "weight_kg": 80}


def get_body(client):
    response = client.get(f"/api/body?today={TODAY}")
    assert response.status_code == 200, response.text
    return response.json()


# --- Pure calculations ---


def test_age_counts_the_birthday_only_once_it_has_happened():
    assert age_on(date(1996, 10, 2), date(2026, 10, 1)) == 29
    assert age_on(date(1996, 10, 2), date(2026, 10, 2)) == 30


def test_mifflin_st_jeor():
    # 10*80 + 6.25*180 - 5*30 = 1775; +5 male, -161 female
    assert bmr_mifflin_st_jeor(80, 180, 30, Sex.male) == 1780
    assert bmr_mifflin_st_jeor(80, 180, 30, Sex.female) == 1614


def test_calorie_targets_round_to_10():
    targets = calorie_targets(1780, ActivityLevel.moderate)  # 1780 * 1.55 = 2759
    assert (targets.bmr, targets.maintenance, targets.cut, targets.lean_bulk) == (1780, 2760, 2260, 3060)


# --- Settings fields ---


def test_body_fields_save_and_clear(client):
    saved = client.patch("/api/settings", json={**PROFILE, "body_units": "metric"}).json()
    assert (saved["height_cm"], saved["weight_kg"], saved["body_units"]) == (180, 80, "metric")
    cleared = client.patch("/api/settings", json={"weight_kg": None}).json()
    assert cleared["weight_kg"] is None and cleared["height_cm"] == 180


@pytest.mark.parametrize("body", [
    {"height_cm": 30},
    {"weight_kg": 500},
    {"birth_date": "2099-01-01"},
    {"sex": "other"},
    {"activity_level": None},
])
def test_invalid_body_values_are_rejected(client, body):
    assert client.patch("/api/settings", json=body).status_code == 422


# --- GET /body ---


def test_nothing_entered_yet(client):
    assert get_body(client) == {
        "age": None,
        "calories": None,
        "protein": None,
        "relative_strength": [],
        "missing": ["sex", "birth_date", "height_cm", "weight_kg"],
    }


def test_full_profile(client):
    client.patch("/api/settings", json=PROFILE)

    data = get_body(client)
    assert data["age"] == 29
    # 10*80 + 6.25*180 - 5*29 + 5 = 1785 -> 1780 (rounded); x1.55 = 2766.75 -> 2770
    assert data["calories"] == {"bmr": 1780, "maintenance": 2770, "cut": 2270, "lean_bulk": 3070}
    assert data["protein"] == {"min_g": 128, "max_g": 176}
    assert data["missing"] == []


def test_relative_strength_uses_best_1rm_in_each_lifts_unit(client, gym_id, muscle_group_id):
    client.patch("/api/settings", json={"weight_kg": 80})  # = 176.4 lbs
    bench = client.post("/api/lifts", json={"name": "Bench", "muscle_group_id": muscle_group_id}).json()["id"]
    squat = client.post("/api/lifts", json={"name": "Squat", "muscle_group_id": muscle_group_id}).json()["id"]
    sled = client.post("/api/lifts", json={"name": "Sled", "muscle_group_id": muscle_group_id}).json()["id"]
    for lift, weight, unit, reps in [
        (bench, 185, "lbs", 5),  # 1RM 216
        (bench, 175, "lbs", 6),  # 1RM 210, not the best
        (squat, 100, "kg", 5),  # 1RM 116.5
        (sled, 4, "plates", 10),  # no 1RM: left out
    ]:
        body = {"lift_id": lift, "weight_value": weight, "weight_unit": unit, "reps": reps}
        assert client.post("/api/sets", json=body).status_code == 201

    rows = get_body(client)["relative_strength"]
    assert [(r["lift_name"], r["one_rep_max"], r["weight_unit"], r["ratio"]) for r in rows] == [
        ("Squat", 116.5, "kg", 1.46),  # 116.5 / 80
        ("Bench", 216.0, "lbs", 1.22),  # 216 / 176.37
    ]

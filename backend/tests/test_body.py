"""Body stats: the settings fields, the calculations, and GET /body."""

from datetime import date

import pytest

from app.body import age_on, bmr_mifflin_st_jeor, calorie_targets, water_target
from app.models import ActivityLevel, Sex
from app.standards import STANDARDS, grade, level_for_score, standard_for

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
        "water": None,
        "strength_score": None,
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
    assert data["water"] == {"daily_ml": 2800, "training_day_ml": 3300}
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
    assert all(r["level"] is None for r in rows)  # no sex set, and no Barbell machine


# --- Which machine counts ---


def machine(client, gym_id, name):
    return client.post("/api/machines", json={"name": name, "gym_id": gym_id}).json()["id"]


def log_on(client, lift_id, machine_id, weight, reps, day):
    body = {"lift_id": lift_id, "machine_id": machine_id, "weight_value": weight,
            "weight_unit": "lbs", "reps": reps, "performed_on": day}
    assert client.post("/api/sets", json=body).status_code == 201


@pytest.fixture
def press(client, gym_id, muscle_group_id):
    """A lift done on two machines: the Smith machine on more days, the barbell heavier."""
    lift = client.post("/api/lifts", json={"name": "Bench press", "muscle_group_id": muscle_group_id}).json()["id"]
    smith, barbell = machine(client, gym_id, "Smith"), machine(client, gym_id, "Barbell")
    for day in ["2026-09-01", "2026-09-08", "2026-09-15"]:
        log_on(client, lift, smith, 225, 8, day)
    log_on(client, lift, barbell, 185, 6, "2026-09-20")
    client.patch("/api/settings", json={"weight_kg": 80, "sex": "male"})
    return {"lift": lift, "smith": smith, "barbell": barbell}


def test_automatic_uses_the_machine_trained_on_most_days(client, press):
    row = get_body(client)["relative_strength"][0]
    assert (row["machine_name"], row["automatic"], row["weight_value"], row["reps"]) == ("Smith", True, 225, 8)
    assert row["level"] is None  # machines aren't graded


def test_picking_a_machine_on_the_lift(client, press):
    response = client.patch(f"/api/lifts/{press['lift']}", json={"strength_machine_id": press["barbell"]})
    assert response.json()["strength_machine_id"] == press["barbell"]

    row = get_body(client)["relative_strength"][0]
    assert (row["machine_name"], row["automatic"]) == ("Barbell", False)
    # 185 x 6 -> 1RM 222 / 176.37 lbs = 1.26: Intermediate (1.0-1.5) for men
    assert (row["ratio"], row["level"]) == (1.26, "Intermediate")
    assert get_body(client)["strength_score"] == {"score": 63, "level": "Intermediate", "graded_lifts": 1}

    client.patch(f"/api/lifts/{press['lift']}", json={"strength_machine_id": None})  # back to automatic
    assert get_body(client)["relative_strength"][0]["machine_name"] == "Smith"


def test_picking_an_unknown_machine_is_404(client, press):
    assert client.patch(f"/api/lifts/{press['lift']}", json={"strength_machine_id": 999}).status_code == 404


# --- Standards ---


@pytest.mark.parametrize("lift, machine_name, expected", [
    ("Bench press", "Barbell", "barbell_bench"),
    ("Incline bench", "Barbell", None),
    ("Bench press", "Smith machine", None),
    ("Hammer curl", "Dumbbells", "dumbbell_curl"),
    ("Leg curl", "Dumbbell", None),
    ("Romanian deadlift", "Barbell", None),
    ("Overhead press", "Barbell", "barbell_overhead_press"),
    ("Squat", None, None),
])
def test_standard_for(lift, machine_name, expected):
    assert standard_for(lift, machine_name) == expected


def test_grade_levels_and_scores():
    # Men's bench: Novice 0.75, Intermediate 1.0, Advanced 1.5, Elite 2.0
    assert grade(0.5, Sex.male, "barbell_bench") == ("Beginner", 16.7)
    assert grade(1.25, Sex.male, "barbell_bench") == ("Intermediate", 62.5)
    assert grade(2.4, Sex.male, "barbell_bench") == ("Elite", 100.0)
    assert grade(1.25, Sex.female, "barbell_bench") == ("Advanced", 87.5)
    assert [level_for_score(s) for s in (10, 30, 60, 80, 100)] == [
        "Beginner", "Novice", "Intermediate", "Advanced", "Elite"
    ]


def test_water_target():
    target = water_target(80)  # 80 x 35 = 2800 ml
    assert (target.daily_ml, target.training_day_ml) == (2800, 3300)



def test_standards_guide_lists_every_graded_lift(client):
    guide = client.get("/api/body/standards").json()
    assert len(guide) == len(STANDARDS)
    bench = next(item for item in guide if item["key"] == "barbell_bench")
    assert bench == {
        "key": "barbell_bench",
        "equipment": "Barbell",
        "label": "Bench press",
        "name_words": ["bench"],
        "excluded_words": ["incline", "decline", "close"],
        "levels": ["Novice", "Intermediate", "Advanced", "Elite"],
        "male": [0.75, 1.0, 1.5, 2.0],
        "female": [0.5, 0.75, 1.0, 1.5],
    }

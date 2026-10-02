"""GET /insights: plateau and overdue flags."""

import pytest

TODAY = "2026-10-01"  # a Thursday (weekday 3)


@pytest.fixture
def ids(client, gym_id) -> dict[str, int]:
    chest = client.post("/api/muscle-groups", json={"name": "Chest"}).json()["id"]
    back = client.post("/api/muscle-groups", json={"name": "Back"}).json()["id"]
    legs = client.post("/api/muscle-groups", json={"name": "Legs"}).json()["id"]

    def lift(name, group):
        return client.post("/api/lifts", json={"name": name, "muscle_group_id": group}).json()["id"]

    return {
        "chest": chest, "back": back, "legs": legs,
        "bench": lift("Bench", chest), "row": lift("Row", back), "squat": lift("Squat", legs),
    }


def log_set(client, lift_id, weight, reps, performed_on):
    body = {"lift_id": lift_id, "weight_value": weight, "weight_unit": "lbs", "reps": reps,
            "performed_on": performed_on}
    assert client.post("/api/sets", json=body).status_code == 201


def get_insights(client):
    response = client.get(f"/api/insights?today={TODAY}")
    assert response.status_code == 200, response.text
    return response.json()


def set_split(client, days: dict[int, list[int]]):
    body = {"days": [{"weekday": w, "muscle_group_ids": g} for w, g in days.items()]}
    assert client.put("/api/split", json=body).status_code == 200


# --- Plateau ---


def test_lift_with_no_pr_in_last_4_weeks_is_plateaued(client, ids):
    log_set(client, ids["bench"], 185, 5, "2026-08-01")  # PR, but before the window
    log_set(client, ids["bench"], 185, 5, "2026-09-20")  # tie: not a PR
    log_set(client, ids["bench"], 185, 4, "2026-09-27")

    assert get_insights(client)["plateaued_lift_ids"] == [ids["bench"]]


def test_a_pr_in_the_window_clears_the_plateau(client, ids):
    log_set(client, ids["bench"], 185, 5, "2026-08-01")
    log_set(client, ids["bench"], 185, 6, "2026-09-20")  # beat 5: PR

    assert get_insights(client)["plateaued_lift_ids"] == []


def test_lifts_not_trained_recently_are_not_plateaued(client, ids):
    log_set(client, ids["bench"], 185, 5, "2026-08-01")
    log_set(client, ids["bench"], 185, 4, "2026-09-03")  # 28 days before TODAY: just outside

    assert get_insights(client)["plateaued_lift_ids"] == []


# --- Overdue ---


def test_scheduled_day_passed_without_training_is_overdue(client, ids):
    set_split(client, {0: [ids["chest"]], 2: [ids["back"]], 3: [ids["legs"]]})  # Mon, Wed, Thu
    log_set(client, ids["bench"], 185, 5, "2026-09-28")  # Monday: chest done

    # Back (Wednesday) was missed; Legs is today, so not overdue yet.
    assert get_insights(client)["overdue_muscle_group_ids"] == [ids["back"]]


def test_training_on_a_different_day_this_week_counts(client, ids):
    set_split(client, {2: [ids["back"]]})
    log_set(client, ids["row"], 160, 7, TODAY)  # Wednesday's back, done Thursday

    assert get_insights(client)["overdue_muscle_group_ids"] == []


def test_last_weeks_training_does_not_count(client, ids):
    set_split(client, {0: [ids["chest"]]})
    log_set(client, ids["bench"], 185, 5, "2026-09-27")  # the Sunday before this week

    assert get_insights(client)["overdue_muscle_group_ids"] == [ids["chest"]]


def test_group_scheduled_twice_needs_two_days(client, ids):
    set_split(client, {0: [ids["chest"]], 2: [ids["chest"]]})  # Mon and Wed
    log_set(client, ids["bench"], 185, 5, "2026-09-28")
    log_set(client, ids["bench"], 175, 6, "2026-09-28")  # same day: still one day

    assert get_insights(client)["overdue_muscle_group_ids"] == [ids["chest"]]

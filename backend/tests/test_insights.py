"""GET /insights: plateau flags."""

import pytest

TODAY = "2026-10-01"  # the 3-week window is 2026-09-11 to 2026-10-01


@pytest.fixture
def ids(client, gym_id) -> dict[str, int]:
    chest = client.post("/api/muscle-groups", json={"name": "Chest"}).json()["id"]

    def lift(name, group):
        return client.post("/api/lifts", json={"name": name, "muscle_group_id": group}).json()["id"]

    return {"bench": lift("Bench", chest), "fly": lift("Fly", chest)}


def log_set(client, lift_id, weight, reps, performed_on):
    body = {"lift_id": lift_id, "weight_value": weight, "weight_unit": "lbs", "reps": reps,
            "performed_on": performed_on}
    assert client.post("/api/sets", json=body).status_code == 201


def get_insights(client):
    response = client.get(f"/api/insights?today={TODAY}")
    assert response.status_code == 200, response.text
    return response.json()


def test_lift_with_no_pr_in_last_3_weeks_is_plateaued(client, ids):
    log_set(client, ids["bench"], 185, 5, "2026-08-01")  # PR, but before the window
    log_set(client, ids["bench"], 185, 5, "2026-09-20")  # tie: not a PR
    log_set(client, ids["bench"], 185, 4, "2026-09-27")

    assert get_insights(client) == {"plateaued_lift_ids": [ids["bench"]]}


def test_a_pr_in_the_window_clears_the_plateau(client, ids):
    log_set(client, ids["bench"], 185, 5, "2026-08-01")
    log_set(client, ids["bench"], 185, 6, "2026-09-20")  # beat 5: PR

    assert get_insights(client)["plateaued_lift_ids"] == []


def test_window_starts_20_days_before_today(client, ids):
    log_set(client, ids["bench"], 185, 5, "2026-08-01")
    log_set(client, ids["bench"], 185, 4, "2026-09-11")  # 20 days before: first day inside
    log_set(client, ids["fly"], 50, 10, "2026-08-01")
    log_set(client, ids["fly"], 50, 9, "2026-09-10")  # 21 days before: just outside

    assert get_insights(client)["plateaued_lift_ids"] == [ids["bench"]]


def test_lifts_never_trained_are_not_plateaued(client, ids):
    assert get_insights(client)["plateaued_lift_ids"] == []

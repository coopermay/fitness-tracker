"""GET /calendar: per-day grouping and PR flags."""

import pytest


@pytest.fixture
def barbell_id(client, gym_id) -> int:
    return client.post("/api/machines", json={"name": "Barbell", "gym_id": gym_id}).json()["id"]


def log_set(client, lift_id, machine_id, weight, reps, performed_on, unit="lbs"):
    response = client.post(
        "/api/sets",
        json={
            "lift_id": lift_id,
            "machine_id": machine_id,
            "weight_value": weight,
            "weight_unit": unit,
            "reps": reps,
            "performed_on": performed_on,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def get_calendar(client):
    response = client.get("/api/calendar")
    assert response.status_code == 200, response.text
    return response.json()


def test_empty_calendar(client):
    assert get_calendar(client) == []


def test_days_are_newest_first_with_counts(client, lift_id, barbell_id):
    log_set(client, lift_id, barbell_id, 185, 4, "2026-09-11")
    log_set(client, lift_id, barbell_id, 185, 5, "2026-09-25")
    log_set(client, lift_id, barbell_id, 175, 6, "2026-09-25")

    days = get_calendar(client)

    assert [d["date"] for d in days] == ["2026-09-25", "2026-09-11"]
    assert days[0]["set_count"] == 2
    [bench] = days[0]["lifts"]
    assert bench["lift_name"] == "Bench"
    assert [(s["weight_value"], s["reps"], s["machine_name"]) for s in bench["sets"]] == [
        (185, 5, "Barbell"),
        (175, 6, "Barbell"),
    ]


def test_pr_rules(client, lift_id, barbell_id):
    first = log_set(client, lift_id, barbell_id, 185, 4, "2026-09-01")  # first at weight: PR
    beat = log_set(client, lift_id, barbell_id, 185, 5, "2026-09-08")  # beats 4: PR
    tie = log_set(client, lift_id, barbell_id, 185, 5, "2026-09-15")  # ties 5: not a PR
    worse = log_set(client, lift_id, barbell_id, 185, 3, "2026-09-15")  # not a PR
    kg = log_set(client, lift_id, barbell_id, 185, 1, "2026-09-15", unit="kg")  # other unit: PR

    is_pr = {s["id"]: s["is_pr"] for d in get_calendar(client) for l in d["lifts"] for s in l["sets"]}

    assert is_pr == {first: True, beat: True, tie: False, worse: False, kg: True}
    assert [d["pr_count"] for d in get_calendar(client)] == [1, 1, 1]


def test_prs_follow_date_order_not_entry_order(client, lift_id, barbell_id):
    # Entered out of order: the Sep 20 set is logged before the Sep 1 one.
    later = log_set(client, lift_id, barbell_id, 185, 6, "2026-09-20")
    earlier = log_set(client, lift_id, barbell_id, 185, 5, "2026-09-01")

    is_pr = {s["id"]: s["is_pr"] for d in get_calendar(client) for l in d["lifts"] for s in l["sets"]}

    assert is_pr == {earlier: True, later: True}  # 5 was first, then 6 beat it


def test_undated_sets_are_hidden_but_count_as_earlier_history(client, lift_id, barbell_id):
    log_set(client, lift_id, barbell_id, 135, 16, None)
    dated = log_set(client, lift_id, barbell_id, 135, 12, "2026-09-01")

    days = get_calendar(client)

    assert [d["date"] for d in days] == ["2026-09-01"]
    [only_set] = days[0]["lifts"][0]["sets"]
    assert only_set["id"] == dated
    assert only_set["is_pr"] is False  # the undated 16 reps came first


def test_lifts_grouped_in_order_first_trained(client, muscle_group_id, lift_id, barbell_id):
    flys = client.post("/api/lifts", json={"name": "Flys", "muscle_group_id": muscle_group_id})
    flys_id = flys.json()["id"]
    log_set(client, flys_id, None, 100, 10, "2026-09-25")
    log_set(client, lift_id, barbell_id, 185, 5, "2026-09-25")
    log_set(client, flys_id, None, 110, 8, "2026-09-25")

    [day] = get_calendar(client)

    assert [l["lift_name"] for l in day["lifts"]] == ["Flys", "Bench"]
    assert len(day["lifts"][0]["sets"]) == 2
    assert day["lifts"][0]["sets"][0]["machine_name"] is None

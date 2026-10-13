"""GET /today: today's groups, usual lifts, last session and targets."""

import pytest

TODAY = "2026-10-01"  # a Thursday (weekday 3)
THURSDAY = 3


@pytest.fixture
def setup(client, gym_id) -> dict[str, int]:
    def post(path, body):
        return client.post(f"/api/{path}", json=body).json()["id"]

    chest = post("muscle-groups", {"name": "Chest"})
    back = post("muscle-groups", {"name": "Back"})

    def lift(name, group):
        return post("lifts", {"name": name, "muscle_group_id": group})

    return {
        "chest": chest,
        "back": back,
        "bench": lift("Bench", chest),
        "fly": lift("Fly", chest),
        "dips": lift("Dips", chest),
        "row": lift("Row", back),
        "cable": post("machines", {"name": "Cable", "gym_id": gym_id}),
        "barbell": post("machines", {"name": "Barbell", "gym_id": gym_id}),
    }


def log(client, lift_id, machine_id, weight, reps, performed_on, unit="lbs"):
    body = {"lift_id": lift_id, "machine_id": machine_id, "weight_value": weight,
            "weight_unit": unit, "reps": reps, "performed_on": performed_on}
    assert client.post("/api/sets", json=body).status_code == 201


def set_split(client, days: dict[int, list[int]]):
    body = {"days": [{"weekday": w, "muscle_group_ids": g} for w, g in days.items()]}
    assert client.put("/api/split", json=body).status_code == 200


def get_today(client):
    response = client.get(f"/api/today?today={TODAY}")
    assert response.status_code == 200, response.text
    return response.json()


def only_lift(data, name):
    return next(l for g in data["groups"] for l in g["lifts"] + g["other_lifts"] if l["name"] == name)


# --- Targets ---


def test_below_the_top_of_the_range_aim_for_one_more_rep(client, setup):
    set_split(client, {THURSDAY: [setup["chest"]]})
    log(client, setup["bench"], setup["barbell"], 185, 6, "2026-09-24")
    log(client, setup["bench"], setup["barbell"], 185, 7, "2026-09-28")
    log(client, setup["bench"], setup["barbell"], 175, 8, "2026-09-28")  # lighter back-off set

    bench = only_lift(get_today(client), "Bench")
    assert bench["target"] == {"weight_value": 185, "weight_unit": "lbs", "reps": 8, "move_up": False}
    assert bench["last_session"]["date"] == "2026-09-28"
    assert [s["reps"] for s in bench["last_session"]["sets"]] == [7, 8]


def test_past_the_top_of_the_range_move_up_one_increment(client, setup):
    set_split(client, {THURSDAY: [setup["chest"]]})
    log(client, setup["fly"], setup["cable"], 50, 8, "2026-09-20")
    log(client, setup["fly"], setup["cable"], 55, 9, "2026-09-28")  # 9 > 8: time to move up

    fly = only_lift(get_today(client), "Fly")
    # Step learned from history (50 -> 55), aiming for the bottom of the range.
    assert fly["target"] == {"weight_value": 60, "weight_unit": "lbs", "reps": 6, "move_up": True}


def test_moving_up_to_a_weight_already_tried_aims_to_beat_it(client, setup):
    set_split(client, {THURSDAY: [setup["chest"]]})
    log(client, setup["fly"], setup["cable"], 60, 6, "2026-09-01")
    log(client, setup["fly"], setup["cable"], 55, 9, "2026-09-28")

    fly = only_lift(get_today(client), "Fly")
    assert fly["target"] == {"weight_value": 60, "weight_unit": "lbs", "reps": 7, "move_up": True}


def test_increment_defaults_by_unit_and_range_comes_from_settings(client, setup):
    set_split(client, {THURSDAY: [setup["chest"]]})
    client.patch("/api/settings", json={"rep_range_min": 8, "rep_range_max": 12})
    log(client, setup["fly"], setup["cable"], 20, 13, "2026-09-28", unit="kg")  # one weight: no step to learn

    data = get_today(client)
    assert (data["rep_range_min"], data["rep_range_max"]) == (8, 12)
    assert only_lift(data, "Fly")["target"] == {"weight_value": 22.5, "weight_unit": "kg", "reps": 8, "move_up": True}


def test_uses_the_machine_used_most_recently(client, setup):
    set_split(client, {THURSDAY: [setup["chest"]]})
    log(client, setup["bench"], setup["cable"], 100, 8, "2026-09-20")
    log(client, setup["bench"], setup["barbell"], 185, 5, "2026-09-28")

    bench = only_lift(get_today(client), "Bench")
    assert bench["machine_name"] == "Barbell"
    assert bench["target"]["weight_value"] == 185


# --- Which lifts show ---


def test_usual_lifts_are_the_two_done_on_the_most_days(client, setup):
    set_split(client, {THURSDAY: [setup["chest"]]})
    for day in ["2026-09-10", "2026-09-17", "2026-09-24"]:
        log(client, setup["bench"], setup["barbell"], 185, 5, day)
        log(client, setup["fly"], setup["cable"], 50, 8, day)
    log(client, setup["dips"], None, 0, 10, "2026-09-24")  # done once

    chest = get_today(client)["groups"][0]
    assert [l["name"] for l in chest["lifts"]] == ["Bench", "Fly"]  # a tie: creation order
    assert [l["name"] for l in chest["other_lifts"]] == ["Dips"]


def test_a_lift_done_today_joins_the_main_list(client, setup):
    set_split(client, {THURSDAY: [setup["chest"]]})
    for day in ["2026-09-17", "2026-09-24"]:
        log(client, setup["bench"], setup["barbell"], 185, 5, day)
        log(client, setup["fly"], setup["cable"], 50, 8, day)
    log(client, setup["dips"], None, 0, 12, TODAY)

    data = get_today(client)
    chest = data["groups"][0]
    assert [l["name"] for l in chest["lifts"]][-1] == "Dips"
    dips = chest["lifts"][-1]
    assert dips["sets_today"][0]["is_pr"] is True
    assert (data["lifts_done"], data["set_count"], data["pr_count"]) == (1, 1, 1)


def test_rest_day_points_to_the_next_training_day(client, setup):
    set_split(client, {5: [setup["back"]], 6: [setup["chest"]]})  # Saturday and Sunday

    data = get_today(client)
    assert data["groups"] == []
    assert data["next_training"] == {"date": "2026-10-03", "muscle_groups": ["Back"]}


def test_archived_lifts_and_groups_are_left_out(client, setup):
    set_split(client, {THURSDAY: [setup["chest"], setup["back"]]})
    client.patch(f"/api/lifts/{setup['dips']}", json={"archived": True})
    client.patch(f"/api/muscle-groups/{setup['back']}", json={"archived": True})

    data = get_today(client)
    assert [g["name"] for g in data["groups"]] == ["Chest"]
    assert sorted(l["name"] for l in data["groups"][0]["other_lifts"]) == ["Bench", "Fly"]


def test_more_days_beats_more_recent(client, setup):
    set_split(client, {THURSDAY: [setup["chest"]]})
    for day in ["2026-09-10", "2026-09-17"]:
        log(client, setup["fly"], setup["cable"], 50, 8, day)
    log(client, setup["dips"], None, 0, 10, "2026-09-30")
    log(client, setup["bench"], setup["barbell"], 185, 5, "2026-08-01")  # outside the 6 weeks

    chest = get_today(client)["groups"][0]
    assert [l["name"] for l in chest["lifts"]] == ["Fly", "Dips"]
    assert [l["name"] for l in chest["other_lifts"]] == ["Bench"]

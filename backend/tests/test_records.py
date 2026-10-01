"""GET /lifts/{id}/records, the Epley estimate, and the new-record flag on POST /sets."""

from decimal import Decimal

import pytest

from app.models import WeightUnit
from app.records import estimated_one_rep_max


@pytest.fixture
def machine_ids(client, gym_id) -> dict[str, int]:
    names = ["Barbell", "Dumbbell", "Hip thrust machine"]
    return {
        name: client.post("/api/machines", json={"name": name, "gym_id": gym_id}).json()["id"]
        for name in names
    }


def log_set(client, lift_id, machine_id, weight, reps, unit="lbs", performed_on=None, **extra):
    response = client.post(
        "/api/sets",
        json={
            "lift_id": lift_id,
            "machine_id": machine_id,
            "weight_value": weight,
            "weight_unit": unit,
            "reps": reps,
            "performed_on": performed_on,
            **extra,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def get_records(client, lift_id):
    response = client.get(f"/api/lifts/{lift_id}/records")
    assert response.status_code == 200, response.text
    return response.json()


def rows(unit_records):
    """Compact (weight, reps, date) tuples for readable assertions."""
    return [(r["weight_value"], r["reps"], r["performed_on"]) for r in unit_records["records"]]


# --- Epley -------------------------------------------------------------------


@pytest.mark.parametrize(
    ("weight", "reps", "expected"),
    [
        ("185", 5, 216.0),  # 215.83 -> 216.0
        ("100", 1, 103.5),  # 103.33 -> 103.5
        ("100", 8, 126.5),  # 126.67 -> 126.5
        ("72.5", 9, 94.5),  # 94.25 -> 94.5 (rounds half up)
    ],
)
def test_estimated_one_rep_max_rounds_to_half(weight, reps, expected):
    assert estimated_one_rep_max(Decimal(weight), reps, WeightUnit.lbs) == expected


def test_estimated_one_rep_max_is_none_for_plates():
    assert estimated_one_rep_max(Decimal("8"), 10, WeightUnit.plates) is None


# --- Records -----------------------------------------------------------------


def test_keeps_most_reps_per_weight_sorted_heaviest_first(client, lift_id, machine_ids):
    barbell = machine_ids["Barbell"]
    log_set(client, lift_id, barbell, 175, 6, performed_on="2026-09-25")
    log_set(client, lift_id, barbell, 185, 4, performed_on="2026-09-11")
    log_set(client, lift_id, barbell, 185, 5, performed_on="2026-09-25")
    log_set(client, lift_id, barbell, 185, 3, performed_on="2026-09-28")

    [group] = get_records(client, lift_id)["machine_groups"]
    [lbs] = group["units"]

    assert rows(lbs) == [(185, 5, "2026-09-25"), (175, 6, "2026-09-25")]
    assert lbs["records"][0]["estimated_1rm"] == 216.0


def test_tie_on_reps_prefers_most_recent_date(client, lift_id, machine_ids):
    barbell = machine_ids["Barbell"]
    log_set(client, lift_id, barbell, 160, 7, performed_on="2026-09-29", notes="newer")
    log_set(client, lift_id, barbell, 160, 7, performed_on="2026-09-11", notes="older")

    [group] = get_records(client, lift_id)["machine_groups"]

    [record] = group["units"][0]["records"]
    assert record["performed_on"] == "2026-09-29"
    assert record["notes"] == "newer"


def test_tie_on_reps_prefers_dated_over_undated(client, lift_id, machine_ids):
    barbell = machine_ids["Barbell"]
    undated = log_set(client, lift_id, barbell, 135, 16, performed_on=None)
    dated = log_set(client, lift_id, barbell, 135, 16, performed_on="2026-08-01")

    [group] = get_records(client, lift_id)["machine_groups"]

    [record] = group["units"][0]["records"]
    assert record["set_id"] == dated["id"]
    assert record["set_id"] != undated["id"]


def test_undated_set_can_hold_the_record(client, lift_id, machine_ids):
    barbell = machine_ids["Barbell"]
    log_set(client, lift_id, barbell, 135, 16, performed_on=None)
    log_set(client, lift_id, barbell, 135, 12, performed_on="2026-09-01")

    [group] = get_records(client, lift_id)["machine_groups"]

    assert rows(group["units"][0]) == [(135, 16, None)]


def test_history_is_newest_first_with_undated_last(client, lift_id, machine_ids):
    barbell = machine_ids["Barbell"]
    log_set(client, lift_id, barbell, 135, 16, performed_on=None)
    log_set(client, lift_id, barbell, 155, 10, performed_on="2026-09-01")
    log_set(client, lift_id, barbell, 185, 5, performed_on="2026-09-25")

    [group] = get_records(client, lift_id)["machine_groups"]

    assert [s["performed_on"] for s in group["history"]] == ["2026-09-25", "2026-09-01", None]
    assert group["last_performed_on"] == "2026-09-25"


def test_mixed_units_on_one_machine_are_kept_separate(client, lift_id, machine_ids):
    machine = machine_ids["Hip thrust machine"]
    log_set(client, lift_id, machine, 8, 10, unit="plates", performed_on="2026-09-23")
    log_set(client, lift_id, machine, 8, 12, unit="lbs", performed_on="2026-08-01")
    log_set(client, lift_id, machine, 8, 9, unit="kg", performed_on="2026-07-01")

    [group] = get_records(client, lift_id)["machine_groups"]
    units = {u["weight_unit"]: u for u in group["units"]}

    # Same number, three units: three separate records, never compared or converted.
    assert [u["weight_unit"] for u in group["units"]] == ["plates", "lbs", "kg"]  # most recent first
    assert rows(units["plates"]) == [(8, 10, "2026-09-23")]
    assert rows(units["lbs"]) == [(8, 12, "2026-08-01")]
    assert rows(units["kg"]) == [(8, 9, "2026-07-01")]
    assert units["plates"]["records"][0]["estimated_1rm"] is None
    assert len(group["history"]) == 3


def test_sets_without_machine_form_their_own_group(client, lift_id, machine_ids):
    log_set(client, lift_id, machine_ids["Barbell"], 60, 10, performed_on="2026-08-01")
    log_set(client, lift_id, None, 60, 6, performed_on="2026-08-23")

    groups = get_records(client, lift_id)["machine_groups"]

    assert [g["machine"] and g["machine"]["name"] for g in groups] == [None, "Barbell"]
    assert rows(groups[0]["units"][0]) == [(60, 6, "2026-08-23")]
    assert rows(groups[1]["units"][0]) == [(60, 10, "2026-08-01")]


def test_machine_groups_ordered_by_most_recent_use(client, lift_id, machine_ids):
    log_set(client, lift_id, machine_ids["Barbell"], 185, 5, performed_on="2026-09-01")
    log_set(client, lift_id, machine_ids["Dumbbell"], 35, 8, performed_on=None)
    log_set(client, lift_id, machine_ids["Hip thrust machine"], 8, 10, "plates", "2026-09-20")

    groups = get_records(client, lift_id)["machine_groups"]

    assert [g["machine"]["name"] for g in groups] == ["Hip thrust machine", "Barbell", "Dumbbell"]


def test_records_for_lift_with_no_sets(client, lift_id):
    assert get_records(client, lift_id)["machine_groups"] == []


def test_records_for_unknown_lift_is_404(client):
    assert client.get("/api/lifts/999/records").status_code == 404


def test_records_only_include_this_lift(client, muscle_group_id, lift_id, machine_ids):
    other = client.post("/api/lifts", json={"name": "Flys", "muscle_group_id": muscle_group_id})
    log_set(client, other.json()["id"], machine_ids["Barbell"], 100, 10)

    assert get_records(client, lift_id)["machine_groups"] == []


# --- New-record flag ---------------------------------------------------------------


def test_new_record_flag(client, lift_id, machine_ids):
    barbell = machine_ids["Barbell"]

    assert log_set(client, lift_id, barbell, 185, 4)["is_new_record"] is True  # first at weight
    assert log_set(client, lift_id, barbell, 185, 5)["is_new_record"] is True  # beat 4
    assert log_set(client, lift_id, barbell, 185, 5)["is_new_record"] is False  # only tied
    assert log_set(client, lift_id, barbell, 185, 3)["is_new_record"] is False
    # Same weight, different unit or machine: compared separately.
    assert log_set(client, lift_id, barbell, 185, 1, unit="kg")["is_new_record"] is True
    assert log_set(client, lift_id, None, 185, 1)["is_new_record"] is True
    assert log_set(client, lift_id, None, 185, 1)["is_new_record"] is False

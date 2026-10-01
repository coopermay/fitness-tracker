"""Set create/update/delete validation and settings."""


def create_set(client, lift_id, **overrides):
    body = {"lift_id": lift_id, "weight_value": 100, "weight_unit": "lbs", "reps": 5}
    return client.post("/api/sets", json={**body, **overrides})


def test_reps_must_be_positive(client, lift_id):
    assert create_set(client, lift_id, reps=0).status_code == 422


def test_weight_supports_half_increments(client, lift_id):
    response = create_set(client, lift_id, weight_value=72.5)
    assert response.json()["weight_value"] == 72.5


def test_unknown_unit_is_rejected(client, lift_id):
    assert create_set(client, lift_id, weight_unit="stone").status_code == 422


def test_patch_changes_only_sent_fields(client, lift_id, gym_id):
    machine = client.post("/api/machines", json={"name": "Barbell", "gym_id": gym_id}).json()
    created = create_set(
        client, lift_id, machine_id=machine["id"], performed_on="2026-09-01", notes="felt easy"
    ).json()

    response = client.patch(f"/api/sets/{created['id']}", json={"reps": 7, "approximate": True})

    updated = response.json()
    assert (updated["reps"], updated["approximate"]) == (7, True)
    assert updated["machine_id"] == machine["id"]
    assert updated["notes"] == "felt easy"
    assert updated["performed_on"] == "2026-09-01"


def test_patch_can_clear_nullable_fields(client, lift_id, gym_id):
    machine = client.post("/api/machines", json={"name": "Barbell", "gym_id": gym_id}).json()
    created = create_set(client, lift_id, machine_id=machine["id"], performed_on="2026-09-01").json()

    response = client.patch(
        f"/api/sets/{created['id']}", json={"machine_id": None, "performed_on": None}
    )

    assert response.json()["machine_id"] is None
    assert response.json()["performed_on"] is None


def test_patch_rejects_null_for_required_fields(client, lift_id):
    created = create_set(client, lift_id).json()
    assert client.patch(f"/api/sets/{created['id']}", json={"reps": None}).status_code == 422


def test_delete_set(client, lift_id):
    created = create_set(client, lift_id).json()

    assert client.delete(f"/api/sets/{created['id']}").status_code == 204
    assert client.get(f"/api/sets?lift_id={lift_id}").json() == []
    assert client.delete(f"/api/sets/{created['id']}").status_code == 404


def test_settings_default_and_update(client):
    assert client.get("/api/settings").json() == {"default_unit": "lbs"}
    assert client.patch("/api/settings", json={"default_unit": "kg"}).json() == {
        "default_unit": "kg"
    }
    assert client.get("/api/settings").json() == {"default_unit": "kg"}

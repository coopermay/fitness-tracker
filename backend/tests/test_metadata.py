"""Case-insensitive idempotent create, renaming, and archive/unarchive."""


# --- Idempotent create --------------------------------------------------------


def test_create_returns_201_for_new_item(client):
    response = client.post("/api/muscle-groups", json={"name": "Chest"})
    assert response.status_code == 201
    assert response.json()["name"] == "Chest"


def test_create_matching_name_returns_existing_with_200(client):
    first = client.post("/api/muscle-groups", json={"name": "Chest"}).json()

    response = client.post("/api/muscle-groups", json={"name": "  cHEST "})

    assert response.status_code == 200
    assert response.json()["id"] == first["id"]
    assert response.json()["name"] == "Chest"  # original display name kept
    assert len(client.get("/api/muscle-groups").json()) == 1


def test_create_trims_whitespace_from_stored_name(client):
    response = client.post("/api/muscle-groups", json={"name": "  Back  "})
    assert response.json()["name"] == "Back"


def test_create_rejects_blank_name(client):
    response = client.post("/api/muscle-groups", json={"name": "   "})
    assert response.status_code == 422


def test_lift_names_are_unique_per_muscle_group(client):
    biceps = client.post("/api/muscle-groups", json={"name": "Biceps"}).json()["id"]
    forearms = client.post("/api/muscle-groups", json={"name": "Forearms"}).json()["id"]

    curl = client.post("/api/lifts", json={"name": "Curl", "muscle_group_id": biceps})
    same = client.post("/api/lifts", json={"name": "curl", "muscle_group_id": biceps})
    other_group = client.post("/api/lifts", json={"name": "Curl", "muscle_group_id": forearms})

    assert curl.status_code == 201
    assert same.status_code == 200
    assert same.json()["id"] == curl.json()["id"]
    assert other_group.status_code == 201
    assert other_group.json()["id"] != curl.json()["id"]


def test_machine_names_are_unique_per_gym(client):
    gym_a = client.post("/api/gyms", json={"name": "Main gym"}).json()["id"]
    gym_b = client.post("/api/gyms", json={"name": "Hotel gym"}).json()["id"]

    first = client.post("/api/machines", json={"name": "Dual cable", "gym_id": gym_a})
    same = client.post("/api/machines", json={"name": "DUAL CABLE", "gym_id": gym_a})
    other_gym = client.post("/api/machines", json={"name": "Dual cable", "gym_id": gym_b})

    assert first.status_code == 201
    assert same.status_code == 200
    assert same.json()["id"] == first.json()["id"]
    assert other_gym.status_code == 201


def test_create_lift_with_unknown_muscle_group_is_404(client):
    response = client.post("/api/lifts", json={"name": "Bench", "muscle_group_id": 999})
    assert response.status_code == 404


# --- Archive / unarchive --------------------------------------------------------


def test_archived_items_are_hidden_from_lists_by_default(client):
    chest = client.post("/api/muscle-groups", json={"name": "Chest"}).json()
    client.post("/api/muscle-groups", json={"name": "Back"})

    client.patch(f"/api/muscle-groups/{chest['id']}", json={"archived": True})

    names = [g["name"] for g in client.get("/api/muscle-groups").json()]
    assert names == ["Back"]
    all_names = [
        g["name"] for g in client.get("/api/muscle-groups?include_archived=true").json()
    ]
    assert all_names == ["Chest", "Back"]


def test_creating_an_archived_name_unarchives_it(client):
    chest = client.post("/api/muscle-groups", json={"name": "Chest"}).json()
    client.patch(f"/api/muscle-groups/{chest['id']}", json={"archived": True})

    response = client.post("/api/muscle-groups", json={"name": "chest"})

    assert response.status_code == 200
    assert response.json()["id"] == chest["id"]
    assert response.json()["archived"] is False
    assert [g["name"] for g in client.get("/api/muscle-groups").json()] == ["Chest"]


def test_unarchive_via_patch(client):
    chest = client.post("/api/muscle-groups", json={"name": "Chest"}).json()
    client.patch(f"/api/muscle-groups/{chest['id']}", json={"archived": True})

    response = client.patch(f"/api/muscle-groups/{chest['id']}", json={"archived": False})

    assert response.json()["archived"] is False


def test_archived_lifts_are_hidden_from_lift_list(client, muscle_group_id, lift_id):
    client.patch(f"/api/lifts/{lift_id}", json={"archived": True})

    assert client.get(f"/api/lifts?muscle_group_id={muscle_group_id}").json() == []
    assert len(client.get("/api/lifts?include_archived=true").json()) == 1


def test_sets_on_archived_machine_still_appear_in_records(client, gym_id, lift_id):
    machine = client.post("/api/machines", json={"name": "Barbell", "gym_id": gym_id}).json()
    client.post(
        "/api/sets",
        json={
            "lift_id": lift_id,
            "machine_id": machine["id"],
            "weight_value": 185,
            "weight_unit": "lbs",
            "reps": 5,
        },
    )

    client.patch(f"/api/machines/{machine['id']}", json={"archived": True})

    assert client.get("/api/machines").json() == []
    groups = client.get(f"/api/lifts/{lift_id}/records").json()["machine_groups"]
    assert groups[0]["machine"]["name"] == "Barbell"
    assert groups[0]["machine"]["archived"] is True
    assert len(groups[0]["history"]) == 1


# --- Rename ---------------------------------------------------------------------


def test_rename_changes_display_name(client):
    chest = client.post("/api/muscle-groups", json={"name": "chest"}).json()

    response = client.patch(f"/api/muscle-groups/{chest['id']}", json={"name": "Chest"})

    assert response.status_code == 200
    assert response.json()["name"] == "Chest"


def test_rename_onto_another_items_name_is_409(client):
    client.post("/api/muscle-groups", json={"name": "Chest"})
    back = client.post("/api/muscle-groups", json={"name": "Back"}).json()

    response = client.patch(f"/api/muscle-groups/{back['id']}", json={"name": "CHEST"})

    assert response.status_code == 409


def test_patch_unknown_id_is_404(client):
    assert client.patch("/api/muscle-groups/999", json={"archived": True}).status_code == 404

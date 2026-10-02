"""GET/PUT /split: the weekly split."""


def make_group(client, name) -> int:
    return client.post("/api/muscle-groups", json={"name": name}).json()["id"]


def ids_by_weekday(split) -> dict[int, list[int]]:
    return {day["weekday"]: day["muscle_group_ids"] for day in split["days"]}


def test_default_split_is_seven_rest_days(client):
    split = client.get("/api/split").json()
    assert ids_by_weekday(split) == {weekday: [] for weekday in range(7)}


def test_put_replaces_the_whole_split(client):
    chest = make_group(client, "Chest")
    triceps = make_group(client, "Triceps")
    back = make_group(client, "Back")

    client.put("/api/split", json={"days": [
        {"weekday": 0, "muscle_group_ids": [chest, triceps]},
        {"weekday": 2, "muscle_group_ids": [back]},
    ]})
    response = client.put("/api/split", json={"days": [
        {"weekday": 0, "muscle_group_ids": [back]},
    ]})

    assert response.status_code == 200
    days = ids_by_weekday(response.json())
    assert days[0] == [back]
    assert days[2] == []  # left out of the second PUT, so now a rest day
    assert ids_by_weekday(client.get("/api/split").json()) == days


def test_duplicate_ids_in_a_day_are_ignored(client):
    chest = make_group(client, "Chest")
    response = client.put("/api/split", json={"days": [{"weekday": 4, "muscle_group_ids": [chest, chest]}]})
    assert ids_by_weekday(response.json())[4] == [chest]


def test_unknown_muscle_group_is_404_and_changes_nothing(client):
    chest = make_group(client, "Chest")
    client.put("/api/split", json={"days": [{"weekday": 0, "muscle_group_ids": [chest]}]})

    response = client.put("/api/split", json={"days": [{"weekday": 0, "muscle_group_ids": [999]}]})

    assert response.status_code == 404
    assert ids_by_weekday(client.get("/api/split").json())[0] == [chest]


def test_invalid_weekdays_are_rejected(client):
    assert client.put("/api/split", json={"days": [{"weekday": 7, "muscle_group_ids": []}]}).status_code == 422
    duplicate = {"days": [{"weekday": 1, "muscle_group_ids": []}, {"weekday": 1, "muscle_group_ids": []}]}
    assert client.put("/api/split", json=duplicate).status_code == 422

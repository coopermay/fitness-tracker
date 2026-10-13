"""GET/PATCH /settings: default unit, theme and rep range."""

DEFAULTS = {
    "default_unit": "lbs",
    "theme_base": "system",
    "theme_accent": "blue",
    "rep_range_min": 6,
    "rep_range_max": 8,
}


def test_defaults(client):
    assert client.get("/api/settings").json() == DEFAULTS


def test_patch_changes_only_the_fields_sent(client):
    response = client.patch("/api/settings", json={"default_unit": "kg"})
    assert response.json() == {**DEFAULTS, "default_unit": "kg"}

    response = client.patch("/api/settings", json={"theme_base": "black", "theme_accent": "teal"})
    expected = {**DEFAULTS, "default_unit": "kg", "theme_base": "black", "theme_accent": "teal"}
    assert response.json() == expected
    assert client.get("/api/settings").json() == expected


def test_unknown_theme_values_are_rejected(client):
    assert client.patch("/api/settings", json={"theme_base": "purple"}).status_code == 422
    assert client.patch("/api/settings", json={"theme_accent": "black"}).status_code == 422
    assert client.patch("/api/settings", json={"theme_accent": None}).status_code == 422
    assert client.get("/api/settings").json() == DEFAULTS


def test_rep_range_can_change_one_end_at_a_time(client):
    assert client.patch("/api/settings", json={"rep_range_max": 10}).json()["rep_range_max"] == 10
    assert client.patch("/api/settings", json={"rep_range_min": 8}).json()["rep_range_min"] == 8


def test_rep_range_min_cannot_pass_max(client):
    assert client.patch("/api/settings", json={"rep_range_min": 9}).status_code == 422  # max is 8
    assert client.patch("/api/settings", json={"rep_range_min": 0}).status_code == 422
    assert client.patch("/api/settings", json={"rep_range_max": 51}).status_code == 422
    assert client.get("/api/settings").json() == DEFAULTS

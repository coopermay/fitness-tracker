"""GET/PATCH /settings: default unit and theme."""

DEFAULTS = {"default_unit": "lbs", "theme_base": "system", "theme_accent": "blue"}


def test_defaults(client):
    assert client.get("/api/settings").json() == DEFAULTS


def test_patch_changes_only_the_fields_sent(client):
    response = client.patch("/api/settings", json={"default_unit": "kg"})
    assert response.json() == {**DEFAULTS, "default_unit": "kg"}

    response = client.patch("/api/settings", json={"theme_base": "black", "theme_accent": "teal"})
    expected = {"default_unit": "kg", "theme_base": "black", "theme_accent": "teal"}
    assert response.json() == expected
    assert client.get("/api/settings").json() == expected


def test_unknown_theme_values_are_rejected(client):
    assert client.patch("/api/settings", json={"theme_base": "purple"}).status_code == 422
    assert client.patch("/api/settings", json={"theme_accent": "black"}).status_code == 422
    assert client.patch("/api/settings", json={"theme_accent": None}).status_code == 422
    assert client.get("/api/settings").json() == DEFAULTS

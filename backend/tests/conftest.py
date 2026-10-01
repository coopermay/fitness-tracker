"""Test fixtures.

Tests run against a separate `lifts_test` database in the same Postgres
container, so your real data is never touched. Postgres must be running
(`docker compose up -d db`).

The schema is built by running the real Alembic migrations (down, then up),
so the migrations are tested too. Each test starts with empty tables.
"""

import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, make_url, text
from sqlmodel import Session

from app.db import get_session
from app.main import app

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://lifts:lifts@localhost:5432/lifts_test",
)
BACKEND_DIR = Path(__file__).resolve().parents[1]


def create_test_database_if_missing() -> None:
    url = make_url(TEST_DATABASE_URL)
    # CREATE DATABASE can't run inside a transaction, hence AUTOCOMMIT.
    admin_engine = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as connection:
        exists = connection.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": url.database}
        ).scalar()
        if not exists:
            connection.execute(text(f'CREATE DATABASE "{url.database}"'))
    admin_engine.dispose()


@pytest.fixture(scope="session")
def engine():
    create_test_database_if_missing()
    alembic_config = Config(str(BACKEND_DIR / "alembic.ini"))
    alembic_config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    command.downgrade(alembic_config, "base")
    command.upgrade(alembic_config, "head")

    engine = create_engine(TEST_DATABASE_URL)
    yield engine
    engine.dispose()


@pytest.fixture
def session(engine):
    with engine.begin() as connection:
        connection.execute(
            text("TRUNCATE sets, lifts, machines, muscle_groups, gyms RESTART IDENTITY CASCADE")
        )
        connection.execute(text("UPDATE settings SET default_unit = 'lbs'"))
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(session):
    """An API client whose requests use the test database."""
    app.dependency_overrides[get_session] = lambda: session
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def gym_id(client) -> int:
    return client.post("/api/gyms", json={"name": "Main gym"}).json()["id"]


@pytest.fixture
def muscle_group_id(client) -> int:
    return client.post("/api/muscle-groups", json={"name": "Chest"}).json()["id"]


@pytest.fixture
def lift_id(client, muscle_group_id) -> int:
    response = client.post("/api/lifts", json={"name": "Bench", "muscle_group_id": muscle_group_id})
    return response.json()["id"]

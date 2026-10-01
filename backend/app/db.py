import os
from collections.abc import Iterator

from sqlmodel import Session, create_engine

# Matches the dev credentials in docker-compose.yml. Override with the
# DATABASE_URL environment variable (e.g. when running inside Docker).
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg://lifts:lifts@localhost:5432/lifts",
)

engine = create_engine(DATABASE_URL)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session

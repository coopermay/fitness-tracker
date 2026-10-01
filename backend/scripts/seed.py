"""Load seed_data.json into the database.

Run from backend/:  uv run python -m scripts.seed [path/to/seed_data.json]

Safe to run more than once:
- Metadata (gym, muscle groups, machines, lifts) is matched by name using the
  same case-insensitive rules as the unique indexes, and only created if missing.
  Existing items are left alone (archived ones stay archived).
- Sets have no natural key (two identical sets on the same day are legitimate),
  so sets are imported only if the sets table is empty.

Everything runs in one transaction: if any line fails, nothing is written.
"""

import json
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlmodel import Session, func, select

from app.db import engine
from app.models import Gym, Lift, Machine, MetadataBase, MuscleGroup, WeightUnit, WorkoutSet
from app.names import clean_name, find_by_name

DEFAULT_SEED_PATH = Path(__file__).resolve().parents[2] / "seed_data.json"


def get_or_create(session: Session, model: type[MetadataBase], name: str, **scope: int) -> MetadataBase:
    existing = find_by_name(session, model, name, **scope)
    if existing is not None:
        return existing
    item = model(name=clean_name(name), **scope)
    session.add(item)
    session.flush()  # assigns item.id without committing
    print(f"  created {model.__tablename__}: {item.name}")
    return item


def seed(session: Session, data: dict[str, Any]) -> None:
    gym = get_or_create(session, Gym, data["gym"]["name"])

    muscle_groups = {}
    for name in data["muscle_groups"]:
        muscle_groups[name] = get_or_create(session, MuscleGroup, name)

    machines = {}
    for name in data["machines"]:
        machines[name] = get_or_create(session, Machine, name, gym_id=gym.id)

    lifts = {}
    for entry in data["lifts"]:
        muscle_group = muscle_groups[entry["muscle_group"]]
        lifts[entry["name"]] = get_or_create(session, Lift, entry["name"], muscle_group_id=muscle_group.id)

    existing_set_count = session.exec(select(func.count()).select_from(WorkoutSet)).one()
    if existing_set_count > 0:
        print(f"  sets table already has {existing_set_count} rows; skipping sets")
        return

    for entry in data["sets"]:
        machine_name = entry["machine"]
        performed_on = entry["performed_on"]
        session.add(
            WorkoutSet(
                lift_id=lifts[entry["lift"]].id,
                machine_id=machines[machine_name].id if machine_name is not None else None,
                weight_value=Decimal(str(entry["weight_value"])),
                weight_unit=WeightUnit(entry["weight_unit"]),
                reps=entry["reps"],
                approximate=entry["approximate"],
                performed_on=date.fromisoformat(performed_on) if performed_on else None,
                notes=entry["notes"],
            )
        )
    print(f"  created {len(data['sets'])} sets")


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SEED_PATH
    data = json.loads(path.read_text())
    print(f"Seeding from {path}")
    with Session(engine) as session:
        seed(session, data)
        session.commit()
    print("Done.")


if __name__ == "__main__":
    main()

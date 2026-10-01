from fastapi import APIRouter, Response
from sqlmodel import col, func, select

from app.db import SessionDep
from app.metadata import create_or_restore, get_or_404, update_item
from app.models import Lift, Machine, MuscleGroup, WorkoutSet
from app.records import build_lift_records
from app.schemas import LiftCreate, LiftListItem, LiftRead, LiftRecords, MetadataUpdate

router = APIRouter(prefix="/lifts", tags=["lifts"])


@router.get("", response_model=list[LiftListItem])
def list_lifts(
    session: SessionDep, muscle_group_id: int | None = None, include_archived: bool = False
):
    """Each lift includes `last_performed_on`: the latest dated set, or null."""
    last_performed_on = func.max(WorkoutSet.performed_on)
    statement = (
        select(Lift, last_performed_on)
        .outerjoin(WorkoutSet, col(WorkoutSet.lift_id) == Lift.id)
        .group_by(Lift.id)
        .order_by(Lift.id)
    )
    if muscle_group_id is not None:
        statement = statement.where(Lift.muscle_group_id == muscle_group_id)
    if not include_archived:
        statement = statement.where(Lift.archived == False)  # noqa: E712 (SQL comparison)

    return [
        LiftListItem(**LiftRead.model_validate(lift).model_dump(), last_performed_on=last_date)
        for lift, last_date in session.exec(statement)
    ]


@router.post("", response_model=LiftRead, status_code=201)
def create_lift(body: LiftCreate, session: SessionDep, response: Response):
    """Returns 201 if created, or 200 with the existing (unarchived) lift if the name is taken in this muscle group."""
    get_or_404(session, MuscleGroup, body.muscle_group_id)
    lift, created = create_or_restore(
        session, Lift, body.name, muscle_group_id=body.muscle_group_id
    )
    if not created:
        response.status_code = 200
    return lift


@router.patch("/{lift_id}", response_model=LiftRead)
def update_lift(lift_id: int, body: MetadataUpdate, session: SessionDep):
    lift = get_or_404(session, Lift, lift_id)
    return update_item(session, lift, body, muscle_group_id=lift.muscle_group_id)


@router.get("/{lift_id}/records", response_model=LiftRecords)
def get_lift_records(lift_id: int, session: SessionDep):
    """Best reps at each weight, grouped by machine then unit, with full history per machine.

    Includes sets on archived machines.
    """
    lift = get_or_404(session, Lift, lift_id)
    sets = list(session.exec(select(WorkoutSet).where(WorkoutSet.lift_id == lift_id)))

    machine_ids = {s.machine_id for s in sets if s.machine_id is not None}
    machines = session.exec(select(Machine).where(col(Machine.id).in_(machine_ids)))
    machines_by_id = {machine.id: machine for machine in machines}

    return build_lift_records(lift, sets, machines_by_id)

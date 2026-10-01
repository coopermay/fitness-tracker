from fastapi import APIRouter, Response
from sqlmodel import col, select

from app.db import SessionDep
from app.metadata import get_or_404
from app.models import Lift, Machine, WorkoutSet
from app.records import previous_best_reps
from app.schemas import SetCreate, SetCreated, SetRead, SetUpdate

router = APIRouter(prefix="/sets", tags=["sets"])


@router.get("", response_model=list[SetRead])
def list_sets(session: SessionDep, lift_id: int | None = None):
    """Newest first; undated sets last."""
    statement = select(WorkoutSet).order_by(
        col(WorkoutSet.performed_on).desc().nulls_last(), col(WorkoutSet.id).desc()
    )
    if lift_id is not None:
        statement = statement.where(WorkoutSet.lift_id == lift_id)
    return session.exec(statement).all()


@router.post("", response_model=SetCreated, status_code=201)
def create_set(body: SetCreate, session: SessionDep):
    get_or_404(session, Lift, body.lift_id)
    if body.machine_id is not None:
        get_or_404(session, Machine, body.machine_id)

    previous_best = previous_best_reps(
        session, body.lift_id, body.machine_id, body.weight_unit, body.weight_value
    )

    workout_set = WorkoutSet(**body.model_dump())
    session.add(workout_set)
    session.commit()
    session.refresh(workout_set)

    return SetCreated(
        **SetRead.model_validate(workout_set).model_dump(),
        is_new_record=previous_best is None or body.reps > previous_best,
    )


@router.patch("/{set_id}", response_model=SetRead)
def update_set(set_id: int, body: SetUpdate, session: SessionDep):
    workout_set = get_or_404(session, WorkoutSet, set_id)
    changes = body.model_dump(exclude_unset=True)
    if changes.get("machine_id") is not None:
        get_or_404(session, Machine, changes["machine_id"])

    for field, value in changes.items():
        setattr(workout_set, field, value)
    session.add(workout_set)
    session.commit()
    session.refresh(workout_set)
    return workout_set


@router.delete("/{set_id}", status_code=204)
def delete_set(set_id: int, session: SessionDep):
    workout_set = get_or_404(session, WorkoutSet, set_id)
    session.delete(workout_set)
    session.commit()
    return Response(status_code=204)

from fastapi import APIRouter, HTTPException
from sqlmodel import col, delete, select

from app.db import SessionDep
from app.metadata import get_or_404
from app.models import MuscleGroup, SplitDay
from app.schemas import SplitBody, SplitDayBody

router = APIRouter(prefix="/split", tags=["split"])


def read_split(session: SessionDep) -> SplitBody:
    ids_by_weekday: dict[int, list[int]] = {weekday: [] for weekday in range(7)}
    rows = session.exec(select(SplitDay).order_by(col(SplitDay.weekday), col(SplitDay.muscle_group_id)))
    for row in rows:
        ids_by_weekday[row.weekday].append(row.muscle_group_id)
    return SplitBody(
        days=[SplitDayBody(weekday=weekday, muscle_group_ids=ids) for weekday, ids in ids_by_weekday.items()]
    )


@router.get("", response_model=SplitBody)
def get_split(session: SessionDep):
    """All 7 days, Monday first. May include archived muscle groups."""
    return read_split(session)


@router.put("", response_model=SplitBody)
def replace_split(body: SplitBody, session: SessionDep):
    """Replace the whole split. Days left out of the body become rest days."""
    weekdays = [day.weekday for day in body.days]
    if len(weekdays) != len(set(weekdays)):
        raise HTTPException(status_code=422, detail="Each weekday may appear only once")
    for muscle_group_id in {id_ for day in body.days for id_ in day.muscle_group_ids}:
        get_or_404(session, MuscleGroup, muscle_group_id)

    session.exec(delete(SplitDay))
    for day in body.days:
        for muscle_group_id in set(day.muscle_group_ids):  # ignore duplicates
            session.add(SplitDay(weekday=day.weekday, muscle_group_id=muscle_group_id))
    session.commit()
    return read_split(session)

from fastapi import APIRouter
from sqlmodel import select

from app.calendar import build_calendar
from app.db import SessionDep
from app.models import Lift, Machine, WorkoutSet
from app.schemas import CalendarDay

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("", response_model=list[CalendarDay])
def get_calendar(session: SessionDep):
    """Every day with logged sets, newest first, with each set's PR flag.

    Includes archived lifts and machines. Undated sets are left out (but still
    count as earlier history when deciding PRs).
    """
    sets = list(session.exec(select(WorkoutSet)))
    lifts_by_id = {lift.id: lift for lift in session.exec(select(Lift))}
    machines_by_id = {machine.id: machine for machine in session.exec(select(Machine))}
    return build_calendar(sets, lifts_by_id, machines_by_id)

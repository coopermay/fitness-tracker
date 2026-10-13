from datetime import date

from fastapi import APIRouter
from sqlmodel import select

from app.body import build_body_stats
from app.db import SessionDep
from app.models import Lift, Machine, Settings, WorkoutSet
from app.routers.settings import SETTINGS_ID
from app.schemas import BodyStats

router = APIRouter(prefix="/body", tags=["body"])


@router.get("", response_model=BodyStats)
def get_body_stats(session: SessionDep, today: date | None = None):
    """Age, calorie targets, protein range and relative strength.

    The inputs (sex, birth date, height, weight, activity level) are edited
    through PATCH /settings. Pass `today` from the client for the age.
    """
    return build_body_stats(
        settings=session.get(Settings, SETTINGS_ID),
        today=today or date.today(),
        sets=list(session.exec(select(WorkoutSet))),
        lifts_by_id={lift.id: lift for lift in session.exec(select(Lift))},
        machines_by_id={m.id: m for m in session.exec(select(Machine))},
    )

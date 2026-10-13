from datetime import date

from fastapi import APIRouter
from sqlmodel import select

from app.db import SessionDep
from app.models import Lift, Machine, MuscleGroup, Settings, SplitDay, WorkoutSet
from app.routers.settings import SETTINGS_ID
from app.schemas import TodayResponse
from app.today import build_today

router = APIRouter(prefix="/today", tags=["today"])


@router.get("", response_model=TodayResponse)
def get_today(session: SessionDep, today: date | None = None):
    """Today's split groups with your usual lifts, last session and target.

    Pass `today` (YYYY-MM-DD) from the client: the server's clock may be in a
    different timezone than the person using the app. Defaults to the server's date.
    """
    today = today or date.today()
    settings = session.get(Settings, SETTINGS_ID)
    return build_today(
        today=today,
        sets=list(session.exec(select(WorkoutSet))),
        lifts=list(session.exec(select(Lift))),
        muscle_groups=list(session.exec(select(MuscleGroup))),
        machines_by_id={m.id: m for m in session.exec(select(Machine))},
        split_days=list(session.exec(select(SplitDay))),
        rep_min=settings.rep_range_min,
        rep_max=settings.rep_range_max,
    )

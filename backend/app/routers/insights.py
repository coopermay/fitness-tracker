from datetime import date

from fastapi import APIRouter
from sqlmodel import select

from app.db import SessionDep
from app.insights import overdue_muscle_group_ids, plateaued_lift_ids
from app.models import Lift, SplitDay, WorkoutSet
from app.schemas import Insights

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("", response_model=Insights)
def get_insights(session: SessionDep, today: date | None = None):
    """Plateau and overdue flags.

    Pass `today` (YYYY-MM-DD) from the client: the server's clock may be in a
    different timezone than the person using the app. Defaults to the server's date.
    """
    today = today or date.today()
    sets = list(session.exec(select(WorkoutSet)))
    lifts_by_id = {lift.id: lift for lift in session.exec(select(Lift))}
    split_days = list(session.exec(select(SplitDay)))
    return Insights(
        plateaued_lift_ids=plateaued_lift_ids(sets, today),
        overdue_muscle_group_ids=overdue_muscle_group_ids(sets, lifts_by_id, split_days, today),
    )

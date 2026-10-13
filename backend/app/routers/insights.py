from datetime import date

from fastapi import APIRouter
from sqlmodel import select

from app.db import SessionDep
from app.insights import plateaued_lift_ids
from app.models import WorkoutSet
from app.schemas import Insights

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("", response_model=Insights)
def get_insights(session: SessionDep, today: date | None = None):
    """Plateau flags.

    Pass `today` (YYYY-MM-DD) from the client: the server's clock may be in a
    different timezone than the person using the app. Defaults to the server's date.
    """
    today = today or date.today()
    sets = list(session.exec(select(WorkoutSet)))
    return Insights(plateaued_lift_ids=plateaued_lift_ids(sets, today))

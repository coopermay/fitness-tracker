from datetime import date

from fastapi import APIRouter, HTTPException

from app.db import SessionDep
from app.models import Settings
from app.schemas import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])

# The migration creates exactly one settings row, with this id.
SETTINGS_ID = 1


@router.get("", response_model=SettingsRead)
def get_settings(session: SessionDep):
    return session.get(Settings, SETTINGS_ID)


@router.patch("", response_model=SettingsRead)
def update_settings(body: SettingsUpdate, session: SessionDep):
    settings = session.get(Settings, SETTINGS_ID)
    changes = body.model_dump(exclude_unset=True)
    # A request may change only one end of the range, so check the result,
    # before touching the row.
    rep_min = changes.get("rep_range_min", settings.rep_range_min)
    rep_max = changes.get("rep_range_max", settings.rep_range_max)
    if rep_min > rep_max:
        raise HTTPException(status_code=422, detail="rep_range_min can't be above rep_range_max")
    birth_date = changes.get("birth_date")
    if birth_date is not None and not date(1900, 1, 1) <= birth_date <= date.today():
        raise HTTPException(status_code=422, detail="birth_date must be between 1900 and today")

    for field, value in changes.items():
        setattr(settings, field, value)
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings

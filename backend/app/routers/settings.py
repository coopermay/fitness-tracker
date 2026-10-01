from fastapi import APIRouter

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
    settings.default_unit = body.default_unit
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings

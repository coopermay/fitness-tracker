from fastapi import APIRouter, Response

from app.db import SessionDep
from app.metadata import create_or_restore, list_items
from app.models import Gym
from app.schemas import GymCreate, GymRead

router = APIRouter(prefix="/gyms", tags=["gyms"])


@router.get("", response_model=list[GymRead])
def list_gyms(session: SessionDep, include_archived: bool = False):
    return list_items(session, Gym, include_archived)


@router.post("", response_model=GymRead, status_code=201)
def create_gym(body: GymCreate, session: SessionDep, response: Response):
    """Returns 201 if created, or 200 with the existing gym if the name is taken."""
    gym, created = create_or_restore(session, Gym, body.name)
    if not created:
        response.status_code = 200
    return gym

from fastapi import APIRouter, Response

from app.db import SessionDep
from app.metadata import create_or_restore, get_or_404, list_items, update_item
from app.models import MuscleGroup
from app.schemas import MetadataUpdate, MuscleGroupCreate, MuscleGroupRead

router = APIRouter(prefix="/muscle-groups", tags=["muscle groups"])


@router.get("", response_model=list[MuscleGroupRead])
def list_muscle_groups(session: SessionDep, include_archived: bool = False):
    return list_items(session, MuscleGroup, include_archived)


@router.post("", response_model=MuscleGroupRead, status_code=201)
def create_muscle_group(body: MuscleGroupCreate, session: SessionDep, response: Response):
    """Returns 201 if created, or 200 with the existing (unarchived) item if the name is taken."""
    muscle_group, created = create_or_restore(session, MuscleGroup, body.name)
    if not created:
        response.status_code = 200
    return muscle_group


@router.patch("/{muscle_group_id}", response_model=MuscleGroupRead)
def update_muscle_group(muscle_group_id: int, body: MetadataUpdate, session: SessionDep):
    muscle_group = get_or_404(session, MuscleGroup, muscle_group_id)
    return update_item(session, muscle_group, body)

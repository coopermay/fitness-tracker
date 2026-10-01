from fastapi import APIRouter, Response

from app.db import SessionDep
from app.metadata import create_or_restore, get_or_404, list_items, update_item
from app.models import Gym, Machine
from app.schemas import MachineCreate, MachineRead, MetadataUpdate

router = APIRouter(prefix="/machines", tags=["machines"])


@router.get("", response_model=list[MachineRead])
def list_machines(session: SessionDep, gym_id: int | None = None, include_archived: bool = False):
    return list_items(session, Machine, include_archived, gym_id=gym_id)


@router.post("", response_model=MachineRead, status_code=201)
def create_machine(body: MachineCreate, session: SessionDep, response: Response):
    """Returns 201 if created, or 200 with the existing (unarchived) machine if the name is taken in this gym."""
    get_or_404(session, Gym, body.gym_id)
    machine, created = create_or_restore(session, Machine, body.name, gym_id=body.gym_id)
    if not created:
        response.status_code = 200
    return machine


@router.patch("/{machine_id}", response_model=MachineRead)
def update_machine(machine_id: int, body: MetadataUpdate, session: SessionDep):
    machine = get_or_404(session, Machine, machine_id)
    return update_item(session, machine, body, gym_id=machine.gym_id)

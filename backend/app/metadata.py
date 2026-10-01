"""Behaviour shared by the metadata tables: gyms, muscle groups, lifts, machines."""

from typing import TypeVar

from fastapi import HTTPException
from sqlmodel import Session, SQLModel, select

from app.models import MetadataBase
from app.names import clean_name, find_by_name
from app.schemas import MetadataUpdate

M = TypeVar("M", bound=MetadataBase)
T = TypeVar("T", bound=SQLModel)


def get_or_404(session: Session, model: type[T], item_id: int) -> T:
    item = session.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"{model.__name__} {item_id} not found")
    return item


def list_items(session: Session, model: type[M], include_archived: bool, **filters: int | None) -> list[M]:
    """List in creation order, skipping archived items unless asked. None filters are ignored."""
    statement = select(model).order_by(model.id)
    if not include_archived:
        statement = statement.where(model.archived == False)  # noqa: E712 (SQL comparison)
    for column_name, value in filters.items():
        if value is not None:
            statement = statement.where(getattr(model, column_name) == value)
    return list(session.exec(statement))


def create_or_restore(session: Session, model: type[M], name: str, **scope: int) -> tuple[M, bool]:
    """Idempotent create. Returns (item, created).

    If the name already exists in this scope (case-insensitively), return that
    item instead, unarchiving it if needed.
    """
    existing = find_by_name(session, model, name, **scope)
    if existing is not None:
        if existing.archived:
            existing.archived = False
            session.add(existing)
            session.commit()
            session.refresh(existing)
        return existing, False

    item = model(name=clean_name(name), **scope)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item, True


def update_item(session: Session, item: M, changes: MetadataUpdate, **scope: int) -> M:
    """Rename and/or archive. Renaming onto another item's name is a 409."""
    if changes.name is not None:
        clash = find_by_name(session, type(item), changes.name, **scope)
        if clash is not None and clash.id != item.id:
            state = "an archived item" if clash.archived else "another item"
            raise HTTPException(
                status_code=409,
                detail=f"'{clash.name}' is already used by {state} (id {clash.id})",
            )
        item.name = clean_name(changes.name)
    if changes.archived is not None:
        item.archived = changes.archived
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

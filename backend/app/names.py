"""Name cleanup and case-insensitive lookup for metadata tables."""

from typing import TypeVar

from sqlalchemy import func
from sqlmodel import Session, select

from app.models import MetadataBase

M = TypeVar("M", bound=MetadataBase)


def clean_name(name: str) -> str:
    """The display name we store: as entered, minus surrounding whitespace."""
    return name.strip()


def find_by_name(session: Session, model: type[M], name: str, **scope: int) -> M | None:
    """Find a row whose name matches case-insensitively, archived or not.

    `scope` narrows the search the same way the unique index does,
    e.g. find_by_name(session, Lift, "Curl", muscle_group_id=4).
    The comparison mirrors the lower(trim(name)) unique index.
    """
    statement = select(model).where(
        func.lower(func.trim(model.name)) == func.lower(clean_name(name))
    )
    for column_name, value in scope.items():
        statement = statement.where(getattr(model, column_name) == value)
    return session.exec(statement).first()

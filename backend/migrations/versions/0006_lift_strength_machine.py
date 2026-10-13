"""machine used for relative strength, per lift

Revision ID: 0006_lift_strength_machine
Revises: 0005_settings_body
Create Date: 2026-10-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0006_lift_strength_machine'
down_revision: Union[str, Sequence[str], None] = '0005_settings_body'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Null = automatic (the machine used on the most days).
    op.add_column('lifts', sa.Column('strength_machine_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'lifts_strength_machine_id_fkey', 'lifts', 'machines', ['strength_machine_id'], ['id']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('lifts_strength_machine_id_fkey', 'lifts', type_='foreignkey')
    op.drop_column('lifts', 'strength_machine_id')

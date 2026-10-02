"""weekly split

Revision ID: 0002_split_days
Revises: ba7a79739cdb
Create Date: 2026-10-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_split_days'
down_revision: Union[str, Sequence[str], None] = 'ba7a79739cdb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('split_days',
    sa.Column('weekday', sa.Integer(), nullable=False),
    sa.Column('muscle_group_id', sa.Integer(), nullable=False),
    sa.CheckConstraint('weekday BETWEEN 0 AND 6', name='ck_split_days_weekday'),
    sa.ForeignKeyConstraint(['muscle_group_id'], ['muscle_groups.id'], ),
    sa.PrimaryKeyConstraint('weekday', 'muscle_group_id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('split_days')

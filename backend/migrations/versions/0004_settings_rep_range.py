"""target rep range setting

Revision ID: 0004_settings_rep_range
Revises: 0003_settings_theme
Create Date: 2026-10-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004_settings_rep_range'
down_revision: Union[str, Sequence[str], None] = '0003_settings_theme'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # server_default fills in the existing settings row.
    op.add_column('settings', sa.Column('rep_range_min', sa.Integer(), server_default=sa.text('6'), nullable=False))
    op.add_column('settings', sa.Column('rep_range_max', sa.Integer(), server_default=sa.text('8'), nullable=False))
    op.create_check_constraint(
        'ck_settings_rep_range',
        'settings',
        'rep_range_min >= 1 AND rep_range_min <= rep_range_max AND rep_range_max <= 50',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('ck_settings_rep_range', 'settings', type_='check')
    op.drop_column('settings', 'rep_range_max')
    op.drop_column('settings', 'rep_range_min')

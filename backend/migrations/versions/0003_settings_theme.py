"""theme settings

Revision ID: 0003_settings_theme
Revises: 0002_split_days
Create Date: 2026-10-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0003_settings_theme'
down_revision: Union[str, Sequence[str], None] = '0002_split_days'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# create_type=False: the types are created explicitly below, because
# add_column doesn't create enum types the way create_table does.
theme_base = postgresql.ENUM(
    'system', 'light', 'dark', 'black', 'navy', name='theme_base', create_type=False
)
theme_accent = postgresql.ENUM(
    'blue', 'green', 'purple', 'orange', 'red', 'pink', 'teal', 'gold',
    name='theme_accent', create_type=False,
)


def upgrade() -> None:
    """Upgrade schema."""
    theme_base.create(op.get_bind())
    theme_accent.create(op.get_bind())
    # server_default fills in the existing settings row.
    op.add_column('settings', sa.Column('theme_base', theme_base, server_default='system', nullable=False))
    op.add_column('settings', sa.Column('theme_accent', theme_accent, server_default='blue', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('settings', 'theme_accent')
    op.drop_column('settings', 'theme_base')
    theme_accent.drop(op.get_bind())
    theme_base.drop(op.get_bind())

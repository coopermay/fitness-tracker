"""body stats settings

Revision ID: 0005_settings_body
Revises: 0004_settings_rep_range
Create Date: 2026-10-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0005_settings_body'
down_revision: Union[str, Sequence[str], None] = '0004_settings_rep_range'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# create_type=False: created explicitly below, since add_column doesn't.
sex = postgresql.ENUM('male', 'female', name='sex', create_type=False)
activity_level = postgresql.ENUM(
    'sedentary', 'light', 'moderate', 'active', 'very_active',
    name='activity_level', create_type=False,
)
body_units = postgresql.ENUM('imperial', 'metric', name='body_units', create_type=False)


def upgrade() -> None:
    """Upgrade schema."""
    for enum_type in (sex, activity_level, body_units):
        enum_type.create(op.get_bind())
    op.add_column('settings', sa.Column('sex', sex, nullable=True))
    op.add_column('settings', sa.Column('birth_date', sa.Date(), nullable=True))
    op.add_column('settings', sa.Column('height_cm', sa.Numeric(5, 1), nullable=True))
    op.add_column('settings', sa.Column('weight_kg', sa.Numeric(5, 2), nullable=True))
    op.add_column('settings', sa.Column('activity_level', activity_level, server_default='moderate', nullable=False))
    op.add_column('settings', sa.Column('body_units', body_units, server_default='imperial', nullable=False))
    op.create_check_constraint('ck_settings_height', 'settings', 'height_cm BETWEEN 50 AND 275')
    op.create_check_constraint('ck_settings_weight', 'settings', 'weight_kg BETWEEN 20 AND 400')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('ck_settings_weight', 'settings', type_='check')
    op.drop_constraint('ck_settings_height', 'settings', type_='check')
    for column in ('body_units', 'activity_level', 'weight_kg', 'height_cm', 'birth_date', 'sex'):
        op.drop_column('settings', column)
    for enum_type in (body_units, activity_level, sex):
        enum_type.drop(op.get_bind())

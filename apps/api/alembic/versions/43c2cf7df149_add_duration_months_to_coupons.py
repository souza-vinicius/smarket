"""add_duration_months_to_coupons

Revision ID: 43c2cf7df149
Revises: fe88bdd81f7b
Create Date: 2026-02-13 22:47:26.423121

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '43c2cf7df149'
down_revision: Union[str, None] = 'fe88bdd81f7b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('coupons', sa.Column('duration_months', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('coupons', 'duration_months')

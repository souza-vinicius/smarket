"""Add household profile fields to users

Revision ID: 3f8a9b2c1d4e
Revises: 2da2e49a20cb
Create Date: 2026-02-05 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f8a9b2c1d4e'
down_revision: Union[str, None] = '2da2e49a20cb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add household profile fields to users table
    op.add_column('users', sa.Column('household_income', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('users', sa.Column('adults_count', sa.Integer(), nullable=True, server_default='1'))
    op.add_column('users', sa.Column('children_count', sa.Integer(), nullable=True, server_default='0'))


def downgrade() -> None:
    # Remove household profile fields from users table
    op.drop_column('users', 'children_count')
    op.drop_column('users', 'adults_count')
    op.drop_column('users', 'household_income')

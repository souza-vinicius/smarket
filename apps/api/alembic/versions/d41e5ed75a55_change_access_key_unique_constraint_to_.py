"""change access_key unique constraint to per user

Revision ID: d41e5ed75a55
Revises: 88011037c12d
Create Date: 2026-02-07 23:56:01.982060

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd41e5ed75a55'
down_revision: Union[str, None] = '88011037c12d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the global unique index on access_key
    op.drop_index('ix_invoices_access_key', table_name='invoices')

    # Create composite unique constraint (access_key per user)
    op.create_unique_constraint(
        'uq_invoices_access_key_user_id',
        'invoices',
        ['access_key', 'user_id']
    )

    # Keep a non-unique index on access_key for query performance
    op.create_index('ix_invoices_access_key', 'invoices', ['access_key'], unique=False)


def downgrade() -> None:
    # Remove the non-unique index
    op.drop_index('ix_invoices_access_key', table_name='invoices')

    # Remove the composite unique constraint
    op.drop_constraint('uq_invoices_access_key_user_id', 'invoices', type_='unique')

    # Restore the global unique index
    op.create_index('ix_invoices_access_key', 'invoices', ['access_key'], unique=True)

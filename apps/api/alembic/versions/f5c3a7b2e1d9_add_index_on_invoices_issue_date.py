"""add index on invoices issue_date for query optimization

Revision ID: f5c3a7b2e1d9
Revises: d41e5ed75a55
Create Date: 2026-02-11 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5c3a7b2e1d9'
down_revision: Union[str, None] = 'd41e5ed75a55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create descending index on issue_date for optimized DESC sorting
    op.create_index(
        'ix_invoices_issue_date_desc',
        'invoices',
        ['issue_date'],
        postgresql_ops={'issue_date': 'DESC'}
    )


def downgrade() -> None:
    # Remove the index
    op.drop_index('ix_invoices_issue_date_desc', table_name='invoices')

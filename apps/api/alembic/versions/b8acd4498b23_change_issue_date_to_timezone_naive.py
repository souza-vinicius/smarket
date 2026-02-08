"""change issue_date to timezone naive

Revision ID: b8acd4498b23
Revises: d41e5ed75a55
Create Date: 2026-02-08 01:05:13.963404

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8acd4498b23'
down_revision: Union[str, None] = 'd41e5ed75a55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change issue_date from TIMESTAMPTZ to TIMESTAMP (timezone-naive)
    # This is safe because we're removing timezone info from local Brazilian times
    op.execute("ALTER TABLE invoices ALTER COLUMN issue_date TYPE TIMESTAMP WITHOUT TIME ZONE")


def downgrade() -> None:
    # Revert back to TIMESTAMPTZ
    op.execute("ALTER TABLE invoices ALTER COLUMN issue_date TYPE TIMESTAMP WITH TIME ZONE")

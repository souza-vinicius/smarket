"""backfill_subscriptions_for_existing_users

Revision ID: f7e8d9c0b1a2
Revises: 43c2cf7df149
Create Date: 2026-02-14 02:08:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7e8d9c0b1a2'
down_revision: Union[str, None] = '43c2cf7df149'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create subscriptions for users that don't have one.

    Users still within trial period (registered < 30 days ago) get TRIAL status
    with proper trial dates. Older users get EXPIRED/FREE status.
    """
    # Users still within trial period → TRIAL subscription
    op.execute(
        """
        INSERT INTO subscriptions (
            id, user_id, plan, status,
            trial_start, trial_end,
            created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            u.id,
            'free',
            'trial',
            u.created_at,
            u.created_at + INTERVAL '30 days',
            NOW(),
            NOW()
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = u.id
        WHERE s.id IS NULL
          AND u.created_at > NOW() - INTERVAL '30 days'
        """
    )
    # Users past trial period → EXPIRED/FREE subscription
    op.execute(
        """
        INSERT INTO subscriptions (
            id, user_id, plan, status,
            trial_start, trial_end,
            created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            u.id,
            'free',
            'expired',
            NOW(),
            NOW(),
            NOW(),
            NOW()
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = u.id
        WHERE s.id IS NULL
          AND u.created_at <= NOW() - INTERVAL '30 days'
        """
    )


def downgrade() -> None:
    """Remove auto-created expired FREE subscriptions."""
    op.execute(
        """
        DELETE FROM subscriptions
        WHERE plan = 'free'
          AND status = 'expired'
          AND trial_start = trial_end
        """
    )

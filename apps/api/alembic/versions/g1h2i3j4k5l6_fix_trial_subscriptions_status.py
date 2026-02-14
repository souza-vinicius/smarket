"""fix_trial_subscriptions_status

Fix subscriptions that were incorrectly created as 'expired' for users
who are still within their trial period (registered < 30 days ago).

Revision ID: g1h2i3j4k5l6
Revises: f7e8d9c0b1a2
Create Date: 2026-02-14 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g1h2i3j4k5l6'
down_revision: Union[str, None] = 'f7e8d9c0b1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix expired subscriptions that should be trial.

    Users who registered less than 30 days ago but got an 'expired'
    subscription (from backfill or ensure_subscription) should have
    'trial' status with proper trial dates.
    """
    op.execute(
        """
        UPDATE subscriptions s
        SET
            status = 'trial',
            trial_start = u.created_at,
            trial_end = u.created_at + INTERVAL '30 days',
            updated_at = NOW()
        FROM users u
        WHERE s.user_id = u.id
          AND s.status = 'expired'
          AND s.plan = 'free'
          AND u.created_at > NOW() - INTERVAL '30 days'
        """
    )


def downgrade() -> None:
    """Revert trial subscriptions back to expired."""
    op.execute(
        """
        UPDATE subscriptions s
        SET
            status = 'expired',
            trial_start = NOW(),
            trial_end = NOW(),
            updated_at = NOW()
        FROM users u
        WHERE s.user_id = u.id
          AND s.status = 'trial'
          AND s.plan = 'free'
          AND s.stripe_subscription_id IS NULL
          AND u.created_at > NOW() - INTERVAL '30 days'
        """
    )

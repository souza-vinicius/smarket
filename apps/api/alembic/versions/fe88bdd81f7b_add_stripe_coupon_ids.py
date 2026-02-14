"""add_stripe_coupon_ids

Revision ID: fe88bdd81f7b
Revises: b2c3d4e5f6a7
Create Date: 2026-02-13 22:32:09.452169

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fe88bdd81f7b'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add stripe_coupon_id and stripe_promo_code_id columns to coupons table
    op.add_column('coupons', sa.Column('stripe_coupon_id', sa.String(), nullable=True))
    op.add_column('coupons', sa.Column('stripe_promo_code_id', sa.String(), nullable=True))

    # Add unique constraints
    op.create_unique_constraint('uq_coupons_stripe_coupon_id', 'coupons', ['stripe_coupon_id'])
    op.create_unique_constraint('uq_coupons_stripe_promo_code_id', 'coupons', ['stripe_promo_code_id'])


def downgrade() -> None:
    # Remove unique constraints
    op.drop_constraint('uq_coupons_stripe_promo_code_id', 'coupons', type_='unique')
    op.drop_constraint('uq_coupons_stripe_coupon_id', 'coupons', type_='unique')

    # Remove columns
    op.drop_column('coupons', 'stripe_promo_code_id')
    op.drop_column('coupons', 'stripe_coupon_id')

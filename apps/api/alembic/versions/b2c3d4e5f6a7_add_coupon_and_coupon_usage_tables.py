"""add coupon and coupon_usage tables

Revision ID: a1b2c3d4e5f6
Revises: f5c3a7b2e1d9
Create Date: 2026-02-13 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create coupons table
    op.create_table(
        'coupons',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('discount_type', sa.String(length=20), nullable=False),
        sa.Column('discount_value', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('max_uses', sa.Integer(), nullable=True),
        sa.Column('max_uses_per_user', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('min_purchase_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('first_time_only', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('allow_reuse_after_cancel', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_stackable', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('applicable_plans', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('applicable_cycles', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('valid_from', sa.DateTime(), nullable=False),
        sa.Column('valid_until', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_coupons_active_code', 'coupons', ['is_active', 'code'], unique=False)
    op.create_index('idx_coupons_validity', 'coupons', ['valid_from', 'valid_until'], unique=False)
    op.create_index(op.f('ix_coupons_code'), 'coupons', ['code'], unique=True)

    # Create coupon_usages table
    op.create_table(
        'coupon_usages',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('coupon_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('subscription_id', sa.UUID(), nullable=False),
        sa.Column('original_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('discount_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('final_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('canceled_at', sa.DateTime(), nullable=True),
        sa.Column('used_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['coupon_id'], ['coupons.id'], ),
        sa.ForeignKeyConstraint(['subscription_id'], ['subscriptions.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_coupon_usages_subscription', 'coupon_usages', ['subscription_id'], unique=False)
    op.create_index('idx_coupon_usages_user', 'coupon_usages', ['user_id', 'coupon_id'], unique=False)
    op.create_index(op.f('ix_coupon_usages_coupon_id'), 'coupon_usages', ['coupon_id'], unique=False)
    op.create_index(op.f('ix_coupon_usages_user_id'), 'coupon_usages', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_coupon_usages_user_id'), table_name='coupon_usages')
    op.drop_index(op.f('ix_coupon_usages_coupon_id'), table_name='coupon_usages')
    op.drop_index('idx_coupon_usages_user', table_name='coupon_usages')
    op.drop_index('idx_coupon_usages_subscription', table_name='coupon_usages')
    op.drop_table('coupon_usages')

    op.drop_index(op.f('ix_coupons_code'), table_name='coupons')
    op.drop_index('idx_coupons_validity', table_name='coupons')
    op.drop_index('idx_coupons_active_code', table_name='coupons')
    op.drop_table('coupons')

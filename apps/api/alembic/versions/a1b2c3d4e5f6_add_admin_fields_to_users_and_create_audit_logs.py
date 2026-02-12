"""Add admin_role and deleted_at to users, create audit_logs table

Revision ID: a1b2c3d4e5f6
Revises: f5c3a7b2e1d9
Create Date: 2026-02-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'f5c3a7b2e1d9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add admin_role and deleted_at to users table
    op.add_column('users', sa.Column('admin_role', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('deleted_at', sa.DateTime(), nullable=True))

    # Create partial index for admin users
    op.execute(
        "CREATE INDEX idx_users_admin_role ON users(admin_role) "
        "WHERE admin_role IS NOT NULL"
    )

    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('admin_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('resource_type', sa.String(length=50), nullable=False),
        sa.Column('resource_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('old_values', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('new_values', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('request_id', sa.String(length=100), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['admin_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes on audit_logs
    op.create_index('idx_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.create_index('idx_audit_logs_resource', 'audit_logs', ['resource_type', 'resource_id'])
    op.create_index('idx_audit_logs_admin_user', 'audit_logs', ['admin_user_id', 'created_at'])


def downgrade() -> None:
    # Drop audit_logs indexes
    op.drop_index('idx_audit_logs_admin_user', table_name='audit_logs')
    op.drop_index('idx_audit_logs_resource', table_name='audit_logs')
    op.drop_index('idx_audit_logs_created_at', table_name='audit_logs')

    # Drop audit_logs table
    op.drop_table('audit_logs')

    # Drop users admin index
    op.drop_index('idx_users_admin_role', table_name='users')

    # Drop admin columns from users
    op.drop_column('users', 'deleted_at')
    op.drop_column('users', 'admin_role')

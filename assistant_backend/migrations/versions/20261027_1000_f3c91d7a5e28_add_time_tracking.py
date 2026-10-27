"""time tracking: estimates on tasks, worklogs, workload schemes, time off

Revision ID: f3c91d7a5e28
Revises: e5a1c8f07b29
Create Date: 2026-10-27 10:00:00.000000+00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f3c91d7a5e28'
down_revision = 'e5a1c8f07b29'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('original_estimate_minutes', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('remaining_estimate_minutes', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('time_spent_minutes', sa.Integer(), nullable=False, server_default='0'))

    op.create_table(
        'worklogs',
        sa.Column('worklog_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.task_id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('work_date', sa.Date(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_worklogs_workspace_id', 'worklogs', ['workspace_id'])
    op.create_index('ix_worklogs_task_id', 'worklogs', ['task_id'])
    op.create_index('ix_worklogs_user_id', 'worklogs', ['user_id'])
    op.create_index('ix_worklogs_work_date', 'worklogs', ['work_date'])

    op.create_table(
        'member_capacity',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('minutes_per_day', sa.Integer(), nullable=False),
        sa.Column('working_days', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('workspace_id', 'user_id', name='uq_member_capacity'),
    )

    op.create_table(
        'time_off',
        sa.Column('time_off_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('kind', sa.String(), nullable=False),
        sa.Column('note', sa.String(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_time_off_workspace_id', 'time_off', ['workspace_id'])


def downgrade() -> None:
    op.drop_index('ix_time_off_workspace_id', table_name='time_off')
    op.drop_table('time_off')
    op.drop_table('member_capacity')
    for column in ('work_date', 'user_id', 'task_id', 'workspace_id'):
        op.drop_index(f'ix_worklogs_{column}', table_name='worklogs')
    op.drop_table('worklogs')
    op.drop_column('tasks', 'time_spent_minutes')
    op.drop_column('tasks', 'remaining_estimate_minutes')
    op.drop_column('tasks', 'original_estimate_minutes')

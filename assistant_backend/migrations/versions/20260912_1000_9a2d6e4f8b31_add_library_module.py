"""add library module

Revision ID: 9a2d6e4f8b31
Revises: e9c4a71f3b0d
Create Date: 2026-09-12 10:00:00.000000+00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '9a2d6e4f8b31'
down_revision = 'e9c4a71f3b0d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'lib_seats',
        sa.Column('seat_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('seat_number', sa.String(), nullable=False),
        sa.Column('section', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true()),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'lib_shifts',
        sa.Column('shift_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=True),
        sa.Column('end_time', sa.Time(), nullable=True),
        sa.Column('is_full_day', sa.Boolean(), server_default=sa.false()),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'lib_members',
        sa.Column('member_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('joined_on', sa.Date(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'lib_bookings',
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('member_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('lib_members.member_id', ondelete='CASCADE'), nullable=False),
        sa.Column('seat_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('lib_seats.seat_id', ondelete='CASCADE'), nullable=False),
        sa.Column('shift_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('lib_shifts.shift_id', ondelete='CASCADE'), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('fee_amount', sa.Numeric(12, 2), nullable=True),
        sa.Column('payment_status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_lib_bookings_seat_shift', 'lib_bookings', ['seat_id', 'shift_id'])

    op.create_table(
        'lib_attendance',
        sa.Column('attendance_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('lib_bookings.booking_id', ondelete='CASCADE'), nullable=False),
        sa.Column('member_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('lib_members.member_id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('check_in_at', sa.DateTime(), nullable=True),
        sa.Column('check_out_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('booking_id', 'date', name='uq_lib_attendance_booking_date'),
    )


def downgrade() -> None:
    op.drop_table('lib_attendance')
    op.drop_index('ix_lib_bookings_seat_shift', table_name='lib_bookings')
    op.drop_table('lib_bookings')
    op.drop_table('lib_members')
    op.drop_table('lib_shifts')
    op.drop_table('lib_seats')

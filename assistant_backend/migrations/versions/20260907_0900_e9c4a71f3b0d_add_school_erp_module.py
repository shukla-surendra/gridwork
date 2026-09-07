"""add school erp module

Revision ID: e9c4a71f3b0d
Revises: d4a8f21c9b33
Create Date: 2026-09-07 09:00:00.000000+00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'e9c4a71f3b0d'
down_revision = 'd4a8f21c9b33'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'school_teachers',
        sa.Column('teacher_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('first_name', sa.String(), nullable=False),
        sa.Column('last_name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('subject_specialization', sa.String(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'school_classes',
        sa.Column('class_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('academic_year', sa.String(), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=True),
        sa.Column('homeroom_teacher_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('school_teachers.teacher_id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'school_students',
        sa.Column('student_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('first_name', sa.String(), nullable=False),
        sa.Column('last_name', sa.String(), nullable=False),
        sa.Column('admission_number', sa.String(), nullable=False),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('gender', sa.String(), nullable=True),
        sa.Column('class_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('school_classes.class_id', ondelete='SET NULL'), nullable=True),
        sa.Column('guardian_name', sa.String(), nullable=True),
        sa.Column('guardian_contact', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true()),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('workspace_id', 'admission_number', name='uq_school_students_workspace_admission_number'),
    )

    op.create_table(
        'school_attendance',
        sa.Column('attendance_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('school_students.student_id', ondelete='CASCADE'), nullable=False),
        sa.Column('class_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('school_classes.class_id', ondelete='SET NULL'), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('marked_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('student_id', 'date', name='uq_school_attendance_student_date'),
    )

    op.create_table(
        'school_fee_structures',
        sa.Column('fee_structure_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('class_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('school_classes.class_id', ondelete='SET NULL'), nullable=True),
        sa.Column('academic_year', sa.String(), nullable=False),
        sa.Column('term', sa.String(), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'school_fee_payments',
        sa.Column('payment_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('school_students.student_id', ondelete='CASCADE'), nullable=False),
        sa.Column('fee_structure_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('school_fee_structures.fee_structure_id', ondelete='SET NULL'), nullable=True),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('payment_date', sa.Date(), nullable=False),
        sa.Column('payment_method', sa.String(), nullable=False, server_default='cash'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'school_exams',
        sa.Column('exam_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('class_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('school_classes.class_id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('subject', sa.String(), nullable=False),
        sa.Column('exam_date', sa.Date(), nullable=True),
        sa.Column('max_marks', sa.Numeric(10, 2), nullable=False),
        sa.Column('academic_year', sa.String(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'school_exam_results',
        sa.Column('result_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('school_exams.exam_id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('school_students.student_id', ondelete='CASCADE'), nullable=False),
        sa.Column('marks_obtained', sa.Numeric(10, 2), nullable=False),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('exam_id', 'student_id', name='uq_school_exam_results_exam_student'),
    )


def downgrade() -> None:
    op.drop_table('school_exam_results')
    op.drop_table('school_exams')
    op.drop_table('school_fee_payments')
    op.drop_table('school_fee_structures')
    op.drop_table('school_attendance')
    op.drop_table('school_students')
    op.drop_table('school_classes')
    op.drop_table('school_teachers')

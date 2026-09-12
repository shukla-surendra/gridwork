"""add crm leads and deal quote_id

Revision ID: d8f3b6c15a2e
Revises: c4e1a7d92f6b
Create Date: 2026-09-13 12:00:00.000000+00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'd8f3b6c15a2e'
down_revision = 'c4e1a7d92f6b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'leads',
        sa.Column('lead_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id'), nullable=False),
        sa.Column('first_name', sa.String(), nullable=False),
        sa.Column('last_name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('company_name', sa.String(), nullable=True),
        sa.Column('job_title', sa.String(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='new'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('tags', postgresql.JSONB(), nullable=True),
        sa.Column('properties', postgresql.JSONB(), nullable=True),
        sa.Column('converted_at', sa.DateTime(), nullable=True),
        sa.Column('converted_contact_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('contacts.contact_id'), nullable=True),
        sa.Column('converted_company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.company_id'), nullable=True),
        sa.Column('converted_deal_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('deals.deal_id'), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_leads_workspace', 'leads', ['workspace_id'])

    op.create_table(
        'lead_activities',
        sa.Column('activity_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id'), nullable=False),
        sa.Column('lead_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('leads.lead_id'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('properties', postgresql.JSONB(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_lead_activities_lead', 'lead_activities', ['lead_id'])

    # Soft reference to bill_quotes.quote_id -- no FK constraint since
    # Billing is a separate, independently-toggleable module (see
    # DealBase.quote_id in modules/crm/commands.py).
    op.add_column('deals', sa.Column('quote_id', postgresql.UUID(as_uuid=True), nullable=True))


def downgrade() -> None:
    op.drop_column('deals', 'quote_id')
    op.drop_index('ix_lead_activities_lead', table_name='lead_activities')
    op.drop_table('lead_activities')
    op.drop_index('ix_leads_workspace', table_name='leads')
    op.drop_table('leads')

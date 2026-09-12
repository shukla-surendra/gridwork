"""add billing module

Revision ID: c4e1a7d92f6b
Revises: 9a2d6e4f8b31
Create Date: 2026-09-13 09:00:00.000000+00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c4e1a7d92f6b'
down_revision = '9a2d6e4f8b31'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'bill_customers',
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('billing_address', sa.String(), nullable=True),
        sa.Column('tax_id', sa.String(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'bill_items',
        sa.Column('item_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('tax_rate', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'bill_sequences',
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), primary_key=True),
        sa.Column('next_quote_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('next_invoice_number', sa.Integer(), nullable=False, server_default='1'),
    )

    op.create_table(
        'bill_quotes',
        sa.Column('quote_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bill_customers.customer_id', ondelete='CASCADE'), nullable=False),
        sa.Column('quote_number', sa.Integer(), nullable=False),
        sa.Column('issue_date', sa.Date(), nullable=False),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='draft'),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('tax_total', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('total', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_bill_quotes_workspace', 'bill_quotes', ['workspace_id'])

    op.create_table(
        'bill_quote_lines',
        sa.Column('line_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('quote_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bill_quotes.quote_id', ondelete='CASCADE'), nullable=False),
        sa.Column('item_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bill_items.item_id'), nullable=True),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('quantity', sa.Numeric(12, 2), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('tax_rate', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('line_total', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
    )

    op.create_table(
        'bill_invoices',
        sa.Column('invoice_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bill_customers.customer_id', ondelete='CASCADE'), nullable=False),
        sa.Column('quote_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bill_quotes.quote_id'), nullable=True),
        sa.Column('invoice_number', sa.Integer(), nullable=False),
        sa.Column('issue_date', sa.Date(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='draft'),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('tax_total', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('total', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_bill_invoices_workspace', 'bill_invoices', ['workspace_id'])

    op.create_table(
        'bill_invoice_lines',
        sa.Column('line_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('invoice_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bill_invoices.invoice_id', ondelete='CASCADE'), nullable=False),
        sa.Column('item_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bill_items.item_id'), nullable=True),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('quantity', sa.Numeric(12, 2), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('tax_rate', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('line_total', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
    )

    op.create_table(
        'bill_payments',
        sa.Column('payment_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False),
        sa.Column('invoice_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bill_invoices.invoice_id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('payment_date', sa.Date(), nullable=False),
        sa.Column('method', sa.String(), nullable=False, server_default='other'),
        sa.Column('reference', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_bill_payments_invoice', 'bill_payments', ['invoice_id'])


def downgrade() -> None:
    op.drop_index('ix_bill_payments_invoice', table_name='bill_payments')
    op.drop_table('bill_payments')
    op.drop_table('bill_invoice_lines')
    op.drop_index('ix_bill_invoices_workspace', table_name='bill_invoices')
    op.drop_table('bill_invoices')
    op.drop_table('bill_quote_lines')
    op.drop_index('ix_bill_quotes_workspace', table_name='bill_quotes')
    op.drop_table('bill_quotes')
    op.drop_table('bill_sequences')
    op.drop_table('bill_items')
    op.drop_table('bill_customers')

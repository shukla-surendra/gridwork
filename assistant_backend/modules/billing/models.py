import datetime
import uuid
from sqlalchemy import Column, String, Numeric, Integer, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from adapters.orm.models.base import Base


class Customer(Base):
    __tablename__ = "bill_customers"

    customer_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    billing_address = Column(String, nullable=True)
    tax_id = Column(String, nullable=True)  # GSTIN/VAT/etc -- free text, no jurisdiction-specific validation
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))


class Item(Base):
    """A saved catalog entry for quick line-item entry -- deliberately its
    own thing, not a reference to modules.inventory.Product, so Billing
    works standalone whether or not Inventory is enabled for this
    workspace (same reasoning as Library's own Member model instead of a
    CRM Contact reference -- see MODULES.md)."""
    __tablename__ = "bill_items"

    item_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)
    tax_rate = Column(Numeric(5, 2), nullable=False, default=0)  # percent, e.g. 18.00 for 18% GST
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))


class BillingSequence(Base):
    """One row per workspace, handing out strictly-increasing quote/invoice
    numbers via atomic UPDATE...RETURNING (see handlers.py) -- the same
    pattern boards.next_task_number uses for ticket numbering."""
    __tablename__ = "bill_sequences"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), primary_key=True)
    next_quote_number = Column(Integer, nullable=False, default=1, server_default="1")
    next_invoice_number = Column(Integer, nullable=False, default=1, server_default="1")


class Quote(Base):
    __tablename__ = "bill_quotes"

    quote_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("bill_customers.customer_id", ondelete="CASCADE"), nullable=False)
    quote_number = Column(Integer, nullable=False)
    issue_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=True)
    status = Column(String, nullable=False, default="draft")  # draft | sent | accepted | declined | expired
    notes = Column(String, nullable=True)
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    tax_total = Column(Numeric(12, 2), nullable=False, default=0)
    total = Column(Numeric(12, 2), nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    customer = relationship("Customer")
    lines = relationship("QuoteLine", cascade="all, delete-orphan", order_by="QuoteLine.sort_order")


class QuoteLine(Base):
    __tablename__ = "bill_quote_lines"

    line_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quote_id = Column(UUID(as_uuid=True), ForeignKey("bill_quotes.quote_id", ondelete="CASCADE"), nullable=False)
    item_id = Column(UUID(as_uuid=True), ForeignKey("bill_items.item_id"), nullable=True)
    description = Column(String, nullable=False)
    quantity = Column(Numeric(12, 2), nullable=False, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)
    tax_rate = Column(Numeric(5, 2), nullable=False, default=0)
    line_total = Column(Numeric(12, 2), nullable=False, default=0)  # quantity * unit_price * (1 + tax_rate/100), server-computed
    sort_order = Column(Integer, nullable=False, default=0)


class Invoice(Base):
    __tablename__ = "bill_invoices"

    invoice_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("bill_customers.customer_id", ondelete="CASCADE"), nullable=False)
    quote_id = Column(UUID(as_uuid=True), ForeignKey("bill_quotes.quote_id"), nullable=True)  # set if converted from a quote
    invoice_number = Column(Integer, nullable=False)
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String, nullable=False, default="draft")  # draft | sent | partially_paid | paid | void
    notes = Column(String, nullable=True)
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    tax_total = Column(Numeric(12, 2), nullable=False, default=0)
    total = Column(Numeric(12, 2), nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    customer = relationship("Customer")
    lines = relationship("InvoiceLine", cascade="all, delete-orphan", order_by="InvoiceLine.sort_order")
    payments = relationship("Payment", cascade="all, delete-orphan")


class InvoiceLine(Base):
    __tablename__ = "bill_invoice_lines"

    line_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("bill_invoices.invoice_id", ondelete="CASCADE"), nullable=False)
    item_id = Column(UUID(as_uuid=True), ForeignKey("bill_items.item_id"), nullable=True)
    description = Column(String, nullable=False)
    quantity = Column(Numeric(12, 2), nullable=False, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)
    tax_rate = Column(Numeric(5, 2), nullable=False, default=0)
    line_total = Column(Numeric(12, 2), nullable=False, default=0)
    sort_order = Column(Integer, nullable=False, default=0)


class Payment(Base):
    __tablename__ = "bill_payments"

    payment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("bill_invoices.invoice_id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_date = Column(Date, nullable=False)
    method = Column(String, nullable=False, default="other")  # cash | bank_transfer | card | upi | other
    reference = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))

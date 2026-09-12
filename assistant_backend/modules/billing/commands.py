from pydantic import BaseModel
from typing import Optional, List
from datetime import date


class CustomerCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    billing_address: Optional[str] = None
    tax_id: Optional[str] = None


class CustomerUpdateCommand(BaseModel):
    customer_id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    billing_address: Optional[str] = None
    tax_id: Optional[str] = None


class ItemCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    name: str
    description: Optional[str] = None
    unit_price: float = 0
    tax_rate: float = 0


class ItemUpdateCommand(BaseModel):
    item_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    unit_price: Optional[float] = None
    tax_rate: Optional[float] = None


class LineInput(BaseModel):
    """One line of a quote or invoice. `line_total` is deliberately not
    accepted here -- the handler always recomputes it from quantity *
    unit_price * (1 + tax_rate/100) server-side rather than trusting
    whatever a client sends, the same principle as Library's seat
    overlap check (never trust client-supplied derived values)."""
    item_id: Optional[str] = None
    description: str
    quantity: float = 1
    unit_price: float = 0
    tax_rate: float = 0


class QuoteCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    customer_id: str
    issue_date: Optional[date] = None  # defaults to today in the handler
    expiry_date: Optional[date] = None
    notes: Optional[str] = None
    lines: List[LineInput] = []


class QuoteUpdateCommand(BaseModel):
    quote_id: Optional[str] = None
    customer_id: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None
    lines: Optional[List[LineInput]] = None  # replaces all lines when provided


class InvoiceCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    customer_id: str
    issue_date: Optional[date] = None  # defaults to today in the handler
    due_date: Optional[date] = None  # defaults to issue_date + 15 days in the handler
    notes: Optional[str] = None
    lines: List[LineInput] = []


class InvoiceUpdateCommand(BaseModel):
    invoice_id: Optional[str] = None
    customer_id: Optional[str] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    lines: Optional[List[LineInput]] = None  # replaces all lines when provided


class PaymentCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    invoice_id: Optional[str] = None  # Set from the URL path by the controller
    amount: float
    payment_date: Optional[date] = None  # defaults to today in the handler
    method: str = "other"  # cash | bank_transfer | card | upi | other
    reference: Optional[str] = None
    notes: Optional[str] = None

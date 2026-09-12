from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class CustomerDto(BaseModel):
    customer_id: str
    workspace_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    billing_address: Optional[str] = None
    tax_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ItemDto(BaseModel):
    item_id: str
    workspace_id: str
    name: str
    description: Optional[str] = None
    unit_price: float
    tax_rate: float
    created_at: datetime
    updated_at: datetime


class LineDto(BaseModel):
    line_id: str
    item_id: Optional[str] = None
    description: str
    quantity: float
    unit_price: float
    tax_rate: float
    line_total: float


class QuoteDto(BaseModel):
    quote_id: str
    workspace_id: str
    customer_id: str
    customer_name: str
    quote_number: int
    display_number: str  # "QUO-0001" -- quote_number formatted for humans
    issue_date: date
    expiry_date: Optional[date] = None
    status: str
    notes: Optional[str] = None
    subtotal: float
    tax_total: float
    total: float
    lines: List[LineDto]
    created_at: datetime
    updated_at: datetime


class InvoiceDto(BaseModel):
    invoice_id: str
    workspace_id: str
    customer_id: str
    customer_name: str
    quote_id: Optional[str] = None
    invoice_number: int
    display_number: str  # "INV-0001"
    issue_date: date
    due_date: date
    status: str
    notes: Optional[str] = None
    subtotal: float
    tax_total: float
    total: float
    amount_paid: float
    balance_due: float
    is_overdue: bool
    lines: List[LineDto]
    created_at: datetime
    updated_at: datetime


class PaymentDto(BaseModel):
    payment_id: str
    workspace_id: str
    invoice_id: str
    amount: float
    payment_date: date
    method: str
    reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime


class BillingSummaryDto(BaseModel):
    """The Zoho-Books-style dashboard strip: what's owed, what's overdue,
    what came in this month, and how many quotes are still awaiting a
    reply -- the numbers a business actually checks first."""
    total_outstanding: float  # sum of balance_due across all non-void, non-fully-paid invoices
    total_overdue: float  # subset of the above where due_date has passed
    overdue_invoice_count: int
    revenue_this_month: float  # sum of payments recorded within the current calendar month
    draft_quote_count: int
    sent_quote_count: int


class BillingDtoMapper:
    @staticmethod
    def map_customer(customer) -> CustomerDto:
        return CustomerDto(
            customer_id=str(customer.customer_id),
            workspace_id=str(customer.workspace_id),
            name=customer.name,
            email=customer.email,
            phone=customer.phone,
            billing_address=customer.billing_address,
            tax_id=customer.tax_id,
            created_at=customer.created_at,
            updated_at=customer.updated_at,
        )

    @staticmethod
    def map_item(item) -> ItemDto:
        return ItemDto(
            item_id=str(item.item_id),
            workspace_id=str(item.workspace_id),
            name=item.name,
            description=item.description,
            unit_price=float(item.unit_price),
            tax_rate=float(item.tax_rate),
            created_at=item.created_at,
            updated_at=item.updated_at,
        )

    @staticmethod
    def map_line(line) -> LineDto:
        return LineDto(
            line_id=str(line.line_id),
            item_id=str(line.item_id) if line.item_id else None,
            description=line.description,
            quantity=float(line.quantity),
            unit_price=float(line.unit_price),
            tax_rate=float(line.tax_rate),
            line_total=float(line.line_total),
        )

    @staticmethod
    def map_quote(quote) -> QuoteDto:
        return QuoteDto(
            quote_id=str(quote.quote_id),
            workspace_id=str(quote.workspace_id),
            customer_id=str(quote.customer_id),
            customer_name=quote.customer.name,
            quote_number=quote.quote_number,
            display_number=f"QUO-{quote.quote_number:04d}",
            issue_date=quote.issue_date,
            expiry_date=quote.expiry_date,
            status=quote.status,
            notes=quote.notes,
            subtotal=float(quote.subtotal),
            tax_total=float(quote.tax_total),
            total=float(quote.total),
            lines=[BillingDtoMapper.map_line(l) for l in quote.lines],
            created_at=quote.created_at,
            updated_at=quote.updated_at,
        )

    @staticmethod
    def map_invoice(invoice, amount_paid: float) -> InvoiceDto:
        total = float(invoice.total)
        balance_due = round(total - amount_paid, 2)
        is_overdue = (
            invoice.status not in ("paid", "void")
            and balance_due > 0
            and invoice.due_date < date.today()
        )
        return InvoiceDto(
            invoice_id=str(invoice.invoice_id),
            workspace_id=str(invoice.workspace_id),
            customer_id=str(invoice.customer_id),
            customer_name=invoice.customer.name,
            quote_id=str(invoice.quote_id) if invoice.quote_id else None,
            invoice_number=invoice.invoice_number,
            display_number=f"INV-{invoice.invoice_number:04d}",
            issue_date=invoice.issue_date,
            due_date=invoice.due_date,
            status=invoice.status,
            notes=invoice.notes,
            subtotal=float(invoice.subtotal),
            tax_total=float(invoice.tax_total),
            total=total,
            amount_paid=amount_paid,
            balance_due=balance_due,
            is_overdue=is_overdue,
            lines=[BillingDtoMapper.map_line(l) for l in invoice.lines],
            created_at=invoice.created_at,
            updated_at=invoice.updated_at,
        )

    @staticmethod
    def map_payment(payment) -> PaymentDto:
        return PaymentDto(
            payment_id=str(payment.payment_id),
            workspace_id=str(payment.workspace_id),
            invoice_id=str(payment.invoice_id),
            amount=float(payment.amount),
            payment_date=payment.payment_date,
            method=payment.method,
            reference=payment.reference,
            notes=payment.notes,
            created_at=payment.created_at,
        )

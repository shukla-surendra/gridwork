import datetime
from uuid import UUID
from sqlalchemy import text, func
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status
from adapters.orm.models.database import SessionLocal
from .models import Customer, Item, BillingSequence, Quote, QuoteLine, Invoice, InvoiceLine, Payment
from .commands import (
    CustomerCommand, CustomerUpdateCommand,
    ItemCommand, ItemUpdateCommand,
    QuoteCommand, QuoteUpdateCommand,
    InvoiceCommand, InvoiceUpdateCommand,
    PaymentCommand,
)
from .dto import BillingSummaryDto
import logging

logger = logging.getLogger(__name__)

QUOTE_STATUSES = ("draft", "sent", "accepted", "declined", "expired")
INVOICE_STATUSES = ("draft", "sent", "partially_paid", "paid", "void")
PAYMENT_METHODS = ("cash", "bank_transfer", "card", "upi", "other")


class BillingHandler:
    def __init__(self):
        self.db = SessionLocal()

    # -- Customers ----------------------------------------------------------

    def create_customer(self, command: CustomerCommand) -> Customer:
        try:
            customer = Customer(
                workspace_id=UUID(command.workspace_id),
                name=command.name,
                email=command.email,
                phone=command.phone,
                billing_address=command.billing_address,
                tax_id=command.tax_id,
            )
            self.db.add(customer)
            self.db.commit()
            self.db.refresh(customer)
            return customer
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating customer: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create customer")

    def list_customers(self, workspace_id: str) -> list[Customer]:
        return self.db.query(Customer).filter(
            Customer.workspace_id == UUID(workspace_id),
            Customer.is_deleted == False
        ).order_by(Customer.name.asc()).all()

    def get_customer(self, customer_id: str) -> Customer:
        customer = self.db.query(Customer).filter(
            Customer.customer_id == UUID(customer_id),
            Customer.is_deleted == False
        ).first()
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        return customer

    def update_customer(self, command: CustomerUpdateCommand) -> Customer:
        try:
            customer = self.get_customer(command.customer_id)
            for field in ("name", "email", "phone", "billing_address", "tax_id"):
                value = getattr(command, field)
                if value is not None:
                    setattr(customer, field, value)
            self.db.commit()
            self.db.refresh(customer)
            return customer
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating customer: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update customer")

    def delete_customer(self, customer_id: str, workspace_id: str):
        try:
            customer = self.db.query(Customer).filter(
                Customer.customer_id == UUID(customer_id),
                Customer.workspace_id == UUID(workspace_id),
                Customer.is_deleted == False
            ).first()
            if not customer:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
            customer.is_deleted = True
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting customer: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete customer")

    # -- Items ----------------------------------------------------------------

    def create_item(self, command: ItemCommand) -> Item:
        try:
            item = Item(
                workspace_id=UUID(command.workspace_id),
                name=command.name,
                description=command.description,
                unit_price=command.unit_price,
                tax_rate=command.tax_rate,
            )
            self.db.add(item)
            self.db.commit()
            self.db.refresh(item)
            return item
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating item: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create item")

    def list_items(self, workspace_id: str) -> list[Item]:
        return self.db.query(Item).filter(
            Item.workspace_id == UUID(workspace_id),
            Item.is_deleted == False
        ).order_by(Item.name.asc()).all()

    def get_item(self, item_id: str) -> Item:
        item = self.db.query(Item).filter(
            Item.item_id == UUID(item_id),
            Item.is_deleted == False
        ).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        return item

    def update_item(self, command: ItemUpdateCommand) -> Item:
        try:
            item = self.get_item(command.item_id)
            if command.name is not None:
                item.name = command.name
            if command.description is not None:
                item.description = command.description
            if command.unit_price is not None:
                item.unit_price = command.unit_price
            if command.tax_rate is not None:
                item.tax_rate = command.tax_rate
            self.db.commit()
            self.db.refresh(item)
            return item
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating item: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update item")

    def delete_item(self, item_id: str, workspace_id: str):
        try:
            item = self.db.query(Item).filter(
                Item.item_id == UUID(item_id),
                Item.workspace_id == UUID(workspace_id),
                Item.is_deleted == False
            ).first()
            if not item:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
            item.is_deleted = True
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting item: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete item")

    # -- Sequences ------------------------------------------------------------

    def _next_number(self, workspace_id: str, column: str) -> int:
        """Atomically hand out the next quote/invoice number for this
        workspace -- INSERT...ON CONFLICT DO NOTHING first so the row
        exists, then UPDATE...RETURNING, the same "row lock serializes
        concurrent increments" pattern boards.next_task_number uses for
        ticket numbering (see handlers/task_handler.py)."""
        self.db.execute(
            text("INSERT INTO bill_sequences (workspace_id) VALUES (:wid) ON CONFLICT (workspace_id) DO NOTHING"),
            {"wid": workspace_id},
        )
        result = self.db.execute(
            text(f"UPDATE bill_sequences SET {column} = {column} + 1 WHERE workspace_id = :wid RETURNING {column}"),
            {"wid": workspace_id},
        )
        return result.scalar() - 1

    # -- Line computation -------------------------------------------------

    def _validate_and_build_lines(self, workspace_id: str, line_model, lines) -> list:
        """Shared by quotes and invoices: validate each referenced item_id
        (if any) belongs to this workspace, and always recompute
        line_total server-side -- never trust a client-sent total."""
        built = []
        for index, line in enumerate(lines):
            if line.item_id:
                item = self.db.query(Item).filter(
                    Item.item_id == UUID(line.item_id),
                    Item.workspace_id == UUID(workspace_id),
                    Item.is_deleted == False
                ).first()
                if not item:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item not found for line {index + 1}")
            line_total = round(float(line.quantity) * float(line.unit_price) * (1 + float(line.tax_rate) / 100), 2)
            built.append(line_model(
                item_id=UUID(line.item_id) if line.item_id else None,
                description=line.description,
                quantity=line.quantity,
                unit_price=line.unit_price,
                tax_rate=line.tax_rate,
                line_total=line_total,
                sort_order=index,
            ))
        return built

    @staticmethod
    def _totals(built_lines) -> tuple:
        subtotal = round(sum(float(l.quantity) * float(l.unit_price) for l in built_lines), 2)
        total = round(sum(float(l.line_total) for l in built_lines), 2)
        tax_total = round(total - subtotal, 2)
        return subtotal, tax_total, total

    # -- Quotes ---------------------------------------------------------------

    def _quote_query(self):
        """Every Quote the API returns needs .customer/.lines for the DTO
        (dto.py's map_quote) -- joinedload them so that data comes back
        in this query instead of a lazy load after this handler's session
        has already closed (see modules/library/handlers.py's
        _booking_query for the full explanation of why that matters)."""
        return self.db.query(Quote).options(joinedload(Quote.customer), joinedload(Quote.lines))

    def _get_customer_or_404(self, workspace_id: str, customer_id: str) -> Customer:
        customer = self.db.query(Customer).filter(
            Customer.customer_id == UUID(customer_id),
            Customer.workspace_id == UUID(workspace_id),
            Customer.is_deleted == False
        ).first()
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        return customer

    def create_quote(self, command: QuoteCommand) -> Quote:
        try:
            self._get_customer_or_404(command.workspace_id, command.customer_id)
            lines = self._validate_and_build_lines(command.workspace_id, QuoteLine, command.lines)
            subtotal, tax_total, total = self._totals(lines)

            quote = Quote(
                workspace_id=UUID(command.workspace_id),
                customer_id=UUID(command.customer_id),
                quote_number=self._next_number(command.workspace_id, "next_quote_number"),
                issue_date=command.issue_date or datetime.date.today(),
                expiry_date=command.expiry_date,
                notes=command.notes,
                subtotal=subtotal,
                tax_total=tax_total,
                total=total,
                lines=lines,
            )
            self.db.add(quote)
            self.db.commit()
            return self._quote_query().filter(Quote.quote_id == quote.quote_id).one()
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating quote: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create quote")

    def list_quotes(self, workspace_id: str, status_filter: str = None, customer_id: str = None) -> list[Quote]:
        query = self._quote_query().filter(Quote.workspace_id == UUID(workspace_id))
        if status_filter:
            query = query.filter(Quote.status == status_filter)
        if customer_id:
            query = query.filter(Quote.customer_id == UUID(customer_id))
        return query.order_by(Quote.quote_number.desc()).all()

    def get_quote(self, quote_id: str) -> Quote:
        quote = self._quote_query().filter(Quote.quote_id == UUID(quote_id)).first()
        if not quote:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
        return quote

    def update_quote(self, command: QuoteUpdateCommand) -> Quote:
        try:
            quote = self.get_quote(command.quote_id)
            if quote.status != "draft":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft quotes can be edited")

            if command.customer_id is not None:
                self._get_customer_or_404(str(quote.workspace_id), command.customer_id)
                quote.customer_id = UUID(command.customer_id)
            if command.issue_date is not None:
                quote.issue_date = command.issue_date
            if command.expiry_date is not None:
                quote.expiry_date = command.expiry_date
            if command.notes is not None:
                quote.notes = command.notes
            if command.lines is not None:
                lines = self._validate_and_build_lines(str(quote.workspace_id), QuoteLine, command.lines)
                quote.lines = lines
                quote.subtotal, quote.tax_total, quote.total = self._totals(lines)

            self.db.commit()
            return self._quote_query().filter(Quote.quote_id == quote.quote_id).one()
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating quote: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update quote")

    def delete_quote(self, quote_id: str, workspace_id: str):
        try:
            quote = self.db.query(Quote).filter(
                Quote.quote_id == UUID(quote_id),
                Quote.workspace_id == UUID(workspace_id),
            ).first()
            if not quote:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
            if quote.status != "draft":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft quotes can be deleted -- decline it instead")
            self.db.delete(quote)
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting quote: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete quote")

    def _transition_quote(self, quote_id: str, workspace_id: str, allowed_from: tuple, to_status: str) -> Quote:
        quote = self.db.query(Quote).filter(
            Quote.quote_id == UUID(quote_id),
            Quote.workspace_id == UUID(workspace_id),
        ).first()
        if not quote:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
        if quote.status not in allowed_from:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Quote must be {' or '.join(allowed_from)} (currently {quote.status})")
        quote.status = to_status
        self.db.commit()
        return self._quote_query().filter(Quote.quote_id == quote.quote_id).one()

    def send_quote(self, quote_id: str, workspace_id: str) -> Quote:
        return self._transition_quote(quote_id, workspace_id, ("draft",), "sent")

    def accept_quote(self, quote_id: str, workspace_id: str) -> Quote:
        return self._transition_quote(quote_id, workspace_id, ("sent",), "accepted")

    def decline_quote(self, quote_id: str, workspace_id: str) -> Quote:
        return self._transition_quote(quote_id, workspace_id, ("sent",), "declined")

    def convert_quote_to_invoice(self, quote_id: str, workspace_id: str, due_date=None) -> Invoice:
        try:
            quote = self._quote_query().filter(
                Quote.quote_id == UUID(quote_id),
                Quote.workspace_id == UUID(workspace_id),
            ).first()
            if not quote:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
            if quote.status != "accepted":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only accepted quotes can be converted to an invoice")

            issue_date = datetime.date.today()
            invoice_lines = [
                InvoiceLine(
                    item_id=l.item_id, description=l.description, quantity=l.quantity,
                    unit_price=l.unit_price, tax_rate=l.tax_rate, line_total=l.line_total,
                    sort_order=l.sort_order,
                )
                for l in quote.lines
            ]
            invoice = Invoice(
                workspace_id=quote.workspace_id,
                customer_id=quote.customer_id,
                quote_id=quote.quote_id,
                invoice_number=self._next_number(workspace_id, "next_invoice_number"),
                issue_date=issue_date,
                due_date=due_date or (issue_date + datetime.timedelta(days=15)),
                notes=quote.notes,
                subtotal=quote.subtotal,
                tax_total=quote.tax_total,
                total=quote.total,
                lines=invoice_lines,
            )
            self.db.add(invoice)
            self.db.commit()
            return self._invoice_query().filter(Invoice.invoice_id == invoice.invoice_id).one()
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error converting quote to invoice: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to convert quote to invoice")

    # -- Invoices ---------------------------------------------------------

    def _invoice_query(self):
        return self.db.query(Invoice).options(joinedload(Invoice.customer), joinedload(Invoice.lines))

    def amount_paid(self, invoice_id: str) -> float:
        total = self.db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.invoice_id == UUID(invoice_id)
        ).scalar()
        return round(float(total), 2)

    def create_invoice(self, command: InvoiceCommand) -> Invoice:
        try:
            self._get_customer_or_404(command.workspace_id, command.customer_id)
            lines = self._validate_and_build_lines(command.workspace_id, InvoiceLine, command.lines)
            subtotal, tax_total, total = self._totals(lines)
            issue_date = command.issue_date or datetime.date.today()

            invoice = Invoice(
                workspace_id=UUID(command.workspace_id),
                customer_id=UUID(command.customer_id),
                invoice_number=self._next_number(command.workspace_id, "next_invoice_number"),
                issue_date=issue_date,
                due_date=command.due_date or (issue_date + datetime.timedelta(days=15)),
                notes=command.notes,
                subtotal=subtotal,
                tax_total=tax_total,
                total=total,
                lines=lines,
            )
            self.db.add(invoice)
            self.db.commit()
            return self._invoice_query().filter(Invoice.invoice_id == invoice.invoice_id).one()
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating invoice: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create invoice")

    def list_invoices(self, workspace_id: str, status_filter: str = None, customer_id: str = None) -> list[Invoice]:
        query = self._invoice_query().filter(Invoice.workspace_id == UUID(workspace_id))
        if status_filter:
            query = query.filter(Invoice.status == status_filter)
        if customer_id:
            query = query.filter(Invoice.customer_id == UUID(customer_id))
        return query.order_by(Invoice.invoice_number.desc()).all()

    def get_invoice(self, invoice_id: str) -> Invoice:
        invoice = self._invoice_query().filter(Invoice.invoice_id == UUID(invoice_id)).first()
        if not invoice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
        return invoice

    def update_invoice(self, command: InvoiceUpdateCommand) -> Invoice:
        try:
            invoice = self.get_invoice(command.invoice_id)
            if invoice.status != "draft":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft invoices can be edited -- void it instead")

            if command.customer_id is not None:
                self._get_customer_or_404(str(invoice.workspace_id), command.customer_id)
                invoice.customer_id = UUID(command.customer_id)
            if command.issue_date is not None:
                invoice.issue_date = command.issue_date
            if command.due_date is not None:
                invoice.due_date = command.due_date
            if command.notes is not None:
                invoice.notes = command.notes
            if command.lines is not None:
                lines = self._validate_and_build_lines(str(invoice.workspace_id), InvoiceLine, command.lines)
                invoice.lines = lines
                invoice.subtotal, invoice.tax_total, invoice.total = self._totals(lines)

            self.db.commit()
            return self._invoice_query().filter(Invoice.invoice_id == invoice.invoice_id).one()
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating invoice: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update invoice")

    def delete_invoice(self, invoice_id: str, workspace_id: str):
        try:
            invoice = self.db.query(Invoice).filter(
                Invoice.invoice_id == UUID(invoice_id),
                Invoice.workspace_id == UUID(workspace_id),
            ).first()
            if not invoice:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
            if invoice.status != "draft":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft invoices can be deleted -- void it instead")
            self.db.delete(invoice)
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting invoice: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete invoice")

    def send_invoice(self, invoice_id: str, workspace_id: str) -> Invoice:
        invoice = self.db.query(Invoice).filter(
            Invoice.invoice_id == UUID(invoice_id),
            Invoice.workspace_id == UUID(workspace_id),
        ).first()
        if not invoice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
        if invoice.status != "draft":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invoice must be draft (currently {invoice.status})")
        invoice.status = "sent"
        self.db.commit()
        return self._invoice_query().filter(Invoice.invoice_id == invoice.invoice_id).one()

    def void_invoice(self, invoice_id: str, workspace_id: str) -> Invoice:
        invoice = self.db.query(Invoice).filter(
            Invoice.invoice_id == UUID(invoice_id),
            Invoice.workspace_id == UUID(workspace_id),
        ).first()
        if not invoice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
        if invoice.status == "void":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invoice is already void")
        invoice.status = "void"
        self.db.commit()
        return self._invoice_query().filter(Invoice.invoice_id == invoice.invoice_id).one()

    def _sync_invoice_status_from_payments(self, invoice: Invoice):
        """Recompute paid/partially_paid/sent purely from money actually
        recorded -- called after both recording AND deleting a payment, so
        removing a mistaken payment correctly downgrades a "paid" invoice
        back to "partially_paid" or "sent" instead of leaving it stuck."""
        if invoice.status == "void":
            return
        paid = self.amount_paid(str(invoice.invoice_id))
        total = float(invoice.total)
        if paid >= total and total > 0:
            invoice.status = "paid"
        elif paid > 0:
            invoice.status = "partially_paid"
        elif invoice.status in ("paid", "partially_paid"):
            invoice.status = "sent"

    # -- Payments -------------------------------------------------------------

    def record_payment(self, command: PaymentCommand) -> Payment:
        try:
            if command.amount <= 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="amount must be positive")
            if command.method not in PAYMENT_METHODS:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"method must be one of {PAYMENT_METHODS}")

            invoice = self.db.query(Invoice).filter(
                Invoice.invoice_id == UUID(command.invoice_id),
                Invoice.workspace_id == UUID(command.workspace_id),
            ).first()
            if not invoice:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
            if invoice.status in ("draft", "void"):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot record a payment on a {invoice.status} invoice")

            payment = Payment(
                workspace_id=UUID(command.workspace_id),
                invoice_id=UUID(command.invoice_id),
                amount=command.amount,
                payment_date=command.payment_date or datetime.date.today(),
                method=command.method,
                reference=command.reference,
                notes=command.notes,
            )
            self.db.add(payment)
            self.db.flush()  # so amount_paid's aggregate query below sees this row
            self._sync_invoice_status_from_payments(invoice)
            self.db.commit()
            self.db.refresh(payment)
            return payment
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error recording payment: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to record payment")

    def list_payments(self, invoice_id: str) -> list[Payment]:
        return self.db.query(Payment).filter(
            Payment.invoice_id == UUID(invoice_id)
        ).order_by(Payment.payment_date.desc()).all()

    def delete_payment(self, payment_id: str, workspace_id: str):
        try:
            payment = self.db.query(Payment).filter(
                Payment.payment_id == UUID(payment_id),
                Payment.workspace_id == UUID(workspace_id),
            ).first()
            if not payment:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
            invoice = self.db.query(Invoice).filter(Invoice.invoice_id == payment.invoice_id).first()
            self.db.delete(payment)
            self.db.flush()
            if invoice:
                self._sync_invoice_status_from_payments(invoice)
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting payment: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete payment")

    # -- Summary --------------------------------------------------------------

    def get_summary(self, workspace_id: str) -> BillingSummaryDto:
        invoices = self.db.query(Invoice).filter(
            Invoice.workspace_id == UUID(workspace_id),
            Invoice.status.notin_(["draft", "void"]),
        ).all()

        total_outstanding = 0.0
        total_overdue = 0.0
        overdue_count = 0
        today = datetime.date.today()
        for invoice in invoices:
            paid = self.amount_paid(str(invoice.invoice_id))
            balance = round(float(invoice.total) - paid, 2)
            if balance <= 0:
                continue
            total_outstanding += balance
            if invoice.due_date < today:
                total_overdue += balance
                overdue_count += 1

        month_start = today.replace(day=1)
        revenue_this_month = self.db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.workspace_id == UUID(workspace_id),
            Payment.payment_date >= month_start,
        ).scalar()

        draft_quote_count = self.db.query(func.count(Quote.quote_id)).filter(
            Quote.workspace_id == UUID(workspace_id), Quote.status == "draft"
        ).scalar()
        sent_quote_count = self.db.query(func.count(Quote.quote_id)).filter(
            Quote.workspace_id == UUID(workspace_id), Quote.status == "sent"
        ).scalar()

        return BillingSummaryDto(
            total_outstanding=round(total_outstanding, 2),
            total_overdue=round(total_overdue, 2),
            overdue_invoice_count=overdue_count,
            revenue_this_month=round(float(revenue_this_month), 2),
            draft_quote_count=draft_quote_count,
            sent_quote_count=sent_quote_count,
        )

    def __del__(self):
        self.db.close()

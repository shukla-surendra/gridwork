from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import date
from starlette.responses import Response
from modules.access import require_module_enabled
from .commands import (
    CustomerCommand, CustomerUpdateCommand,
    ItemCommand, ItemUpdateCommand,
    QuoteCommand, QuoteUpdateCommand,
    InvoiceCommand, InvoiceUpdateCommand,
    PaymentCommand,
)
from .dto import CustomerDto, ItemDto, QuoteDto, InvoiceDto, PaymentDto, BillingSummaryDto, BillingDtoMapper
from .handlers import BillingHandler
from config import logger

MODULE_KEY = "billing"

router = APIRouter(
    prefix="/api/v1/workspaces/{workspace_id}/billing",
    tags=["Billing"],
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Internal server error"},
        status.HTTP_403_FORBIDDEN: {"description": "Operation not permitted"},
        status.HTTP_400_BAD_REQUEST: {"description": "Bad request"},
    },
)

gate = require_module_enabled(MODULE_KEY, default_enabled=False)


# -- Customers --------------------------------------------------------------

@router.post("/customers", response_model=CustomerDto, status_code=status.HTTP_201_CREATED)
async def create_customer(workspace_id: str, command: CustomerCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        customer = BillingHandler().create_customer(command)
        return BillingDtoMapper.map_customer(customer)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customers", response_model=List[CustomerDto])
async def list_customers(workspace_id: str, user: dict = Depends(gate)):
    try:
        customers = BillingHandler().list_customers(workspace_id)
        return [BillingDtoMapper.map_customer(c) for c in customers]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing customers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/customers/{customer_id}", response_model=CustomerDto)
async def update_customer(workspace_id: str, customer_id: str, command: CustomerUpdateCommand, user: dict = Depends(gate)):
    command.customer_id = customer_id
    try:
        customer = BillingHandler().update_customer(command)
        return BillingDtoMapper.map_customer(customer)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(workspace_id: str, customer_id: str, user: dict = Depends(gate)):
    try:
        BillingHandler().delete_customer(customer_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Items --------------------------------------------------------------------

@router.post("/items", response_model=ItemDto, status_code=status.HTTP_201_CREATED)
async def create_item(workspace_id: str, command: ItemCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        item = BillingHandler().create_item(command)
        return BillingDtoMapper.map_item(item)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/items", response_model=List[ItemDto])
async def list_items(workspace_id: str, user: dict = Depends(gate)):
    try:
        items = BillingHandler().list_items(workspace_id)
        return [BillingDtoMapper.map_item(i) for i in items]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/items/{item_id}", response_model=ItemDto)
async def update_item(workspace_id: str, item_id: str, command: ItemUpdateCommand, user: dict = Depends(gate)):
    command.item_id = item_id
    try:
        item = BillingHandler().update_item(command)
        return BillingDtoMapper.map_item(item)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(workspace_id: str, item_id: str, user: dict = Depends(gate)):
    try:
        BillingHandler().delete_item(item_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Quotes ---------------------------------------------------------------

@router.post("/quotes", response_model=QuoteDto, status_code=status.HTTP_201_CREATED)
async def create_quote(workspace_id: str, command: QuoteCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        quote = BillingHandler().create_quote(command)
        return BillingDtoMapper.map_quote(quote)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating quote: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quotes", response_model=List[QuoteDto])
async def list_quotes(
    workspace_id: str,
    status_filter: Optional[str] = None,
    customer_id: Optional[str] = None,
    user: dict = Depends(gate),
):
    try:
        quotes = BillingHandler().list_quotes(workspace_id, status_filter, customer_id)
        return [BillingDtoMapper.map_quote(q) for q in quotes]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing quotes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quotes/{quote_id}", response_model=QuoteDto)
async def get_quote(workspace_id: str, quote_id: str, user: dict = Depends(gate)):
    try:
        quote = BillingHandler().get_quote(quote_id)
        if str(quote.workspace_id) != str(workspace_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
        return BillingDtoMapper.map_quote(quote)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting quote: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/quotes/{quote_id}", response_model=QuoteDto)
async def update_quote(workspace_id: str, quote_id: str, command: QuoteUpdateCommand, user: dict = Depends(gate)):
    command.quote_id = quote_id
    try:
        quote = BillingHandler().update_quote(command)
        return BillingDtoMapper.map_quote(quote)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating quote: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/quotes/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote(workspace_id: str, quote_id: str, user: dict = Depends(gate)):
    try:
        BillingHandler().delete_quote(quote_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting quote: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quotes/{quote_id}/send", response_model=QuoteDto)
async def send_quote(workspace_id: str, quote_id: str, user: dict = Depends(gate)):
    try:
        quote = BillingHandler().send_quote(quote_id, workspace_id)
        return BillingDtoMapper.map_quote(quote)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending quote: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quotes/{quote_id}/accept", response_model=QuoteDto)
async def accept_quote(workspace_id: str, quote_id: str, user: dict = Depends(gate)):
    try:
        quote = BillingHandler().accept_quote(quote_id, workspace_id)
        return BillingDtoMapper.map_quote(quote)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accepting quote: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quotes/{quote_id}/decline", response_model=QuoteDto)
async def decline_quote(workspace_id: str, quote_id: str, user: dict = Depends(gate)):
    try:
        quote = BillingHandler().decline_quote(quote_id, workspace_id)
        return BillingDtoMapper.map_quote(quote)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error declining quote: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quotes/{quote_id}/convert-to-invoice", response_model=InvoiceDto, status_code=status.HTTP_201_CREATED)
async def convert_quote_to_invoice(workspace_id: str, quote_id: str, due_date: Optional[date] = None, user: dict = Depends(gate)):
    try:
        handler = BillingHandler()
        invoice = handler.convert_quote_to_invoice(quote_id, workspace_id, due_date)
        return BillingDtoMapper.map_invoice(invoice, handler.amount_paid(str(invoice.invoice_id)))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error converting quote to invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Invoices -----------------------------------------------------------------

@router.post("/invoices", response_model=InvoiceDto, status_code=status.HTTP_201_CREATED)
async def create_invoice(workspace_id: str, command: InvoiceCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        handler = BillingHandler()
        invoice = handler.create_invoice(command)
        return BillingDtoMapper.map_invoice(invoice, handler.amount_paid(str(invoice.invoice_id)))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invoices", response_model=List[InvoiceDto])
async def list_invoices(
    workspace_id: str,
    status_filter: Optional[str] = None,
    customer_id: Optional[str] = None,
    user: dict = Depends(gate),
):
    try:
        handler = BillingHandler()
        invoices = handler.list_invoices(workspace_id, status_filter, customer_id)
        return [BillingDtoMapper.map_invoice(i, handler.amount_paid(str(i.invoice_id))) for i in invoices]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing invoices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invoices/{invoice_id}", response_model=InvoiceDto)
async def get_invoice(workspace_id: str, invoice_id: str, user: dict = Depends(gate)):
    try:
        handler = BillingHandler()
        invoice = handler.get_invoice(invoice_id)
        if str(invoice.workspace_id) != str(workspace_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
        return BillingDtoMapper.map_invoice(invoice, handler.amount_paid(invoice_id))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/invoices/{invoice_id}", response_model=InvoiceDto)
async def update_invoice(workspace_id: str, invoice_id: str, command: InvoiceUpdateCommand, user: dict = Depends(gate)):
    command.invoice_id = invoice_id
    try:
        handler = BillingHandler()
        invoice = handler.update_invoice(command)
        return BillingDtoMapper.map_invoice(invoice, handler.amount_paid(invoice_id))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/invoices/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(workspace_id: str, invoice_id: str, user: dict = Depends(gate)):
    try:
        BillingHandler().delete_invoice(invoice_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invoices/{invoice_id}/send", response_model=InvoiceDto)
async def send_invoice(workspace_id: str, invoice_id: str, user: dict = Depends(gate)):
    try:
        handler = BillingHandler()
        invoice = handler.send_invoice(invoice_id, workspace_id)
        return BillingDtoMapper.map_invoice(invoice, handler.amount_paid(invoice_id))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invoices/{invoice_id}/void", response_model=InvoiceDto)
async def void_invoice(workspace_id: str, invoice_id: str, user: dict = Depends(gate)):
    try:
        handler = BillingHandler()
        invoice = handler.void_invoice(invoice_id, workspace_id)
        return BillingDtoMapper.map_invoice(invoice, handler.amount_paid(invoice_id))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error voiding invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Payments -------------------------------------------------------------

@router.post("/invoices/{invoice_id}/payments", response_model=PaymentDto, status_code=status.HTTP_201_CREATED)
async def record_payment(workspace_id: str, invoice_id: str, command: PaymentCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    command.invoice_id = invoice_id
    try:
        payment = BillingHandler().record_payment(command)
        return BillingDtoMapper.map_payment(payment)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invoices/{invoice_id}/payments", response_model=List[PaymentDto])
async def list_payments(workspace_id: str, invoice_id: str, user: dict = Depends(gate)):
    try:
        payments = BillingHandler().list_payments(invoice_id)
        return [BillingDtoMapper.map_payment(p) for p in payments]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing payments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(workspace_id: str, payment_id: str, user: dict = Depends(gate)):
    try:
        BillingHandler().delete_payment(payment_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Summary ------------------------------------------------------------------

@router.get("/summary", response_model=BillingSummaryDto)
async def get_summary(workspace_id: str, user: dict = Depends(gate)):
    try:
        return BillingHandler().get_summary(workspace_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting billing summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


billing_router = router

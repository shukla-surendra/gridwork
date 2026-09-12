from fastapi import status


def _enable_billing(client, workspace_id, headers):
    resp = client.put(
        f"/api/v1/workspaces/{workspace_id}/modules/billing",
        headers=headers,
        json={"enabled": True},
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text


def _create_customer(client, workspace_id, headers, name="Acme Corp"):
    resp = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/customers",
        headers=headers,
        json={"name": name, "email": "billing@acme.test", "tax_id": "GSTIN123"},
    )
    assert resp.status_code == status.HTTP_201_CREATED, resp.text
    return resp.json()


def _create_item(client, workspace_id, headers, name="Consulting Hour"):
    resp = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/items",
        headers=headers,
        json={"name": name, "unit_price": 100, "tax_rate": 18},
    )
    assert resp.status_code == status.HTTP_201_CREATED, resp.text
    return resp.json()


def _quote_lines(item_id=None):
    return [
        {"item_id": item_id, "description": "Consulting Hour", "quantity": 2, "unit_price": 100, "tax_rate": 18},
        {"description": "Setup fee", "quantity": 1, "unit_price": 50, "tax_rate": 0},
    ]


def test_customer_and_item_crud(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    _enable_billing(client, workspace_id, headers)

    customer = _create_customer(client, workspace_id, headers)
    listed = client.get(f"/api/v1/workspaces/{workspace_id}/billing/customers", headers=headers)
    assert customer["customer_id"] in [c["customer_id"] for c in listed.json()]

    updated = client.put(
        f"/api/v1/workspaces/{workspace_id}/billing/customers/{customer['customer_id']}",
        headers=headers,
        json={"phone": "9998887777"},
    )
    assert updated.status_code == status.HTTP_200_OK, updated.text
    assert updated.json()["phone"] == "9998887777"

    item = _create_item(client, workspace_id, headers)
    assert item["unit_price"] == 100.0
    assert item["tax_rate"] == 18.0

    deleted = client.delete(f"/api/v1/workspaces/{workspace_id}/billing/items/{item['item_id']}", headers=headers)
    assert deleted.status_code == status.HTTP_204_NO_CONTENT


def test_quote_totals_are_computed_server_side(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    _enable_billing(client, workspace_id, headers)

    customer = _create_customer(client, workspace_id, headers)
    item = _create_item(client, workspace_id, headers)

    quote = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/quotes",
        headers=headers,
        json={"customer_id": customer["customer_id"], "lines": _quote_lines(item["item_id"])},
    )
    assert quote.status_code == status.HTTP_201_CREATED, quote.text
    body = quote.json()

    # Line 1: 2 * 100 * 1.18 = 236.0; Line 2: 1 * 50 * 1.0 = 50.0
    assert body["lines"][0]["line_total"] == 236.0
    assert body["lines"][1]["line_total"] == 50.0
    assert body["subtotal"] == 250.0  # 2*100 + 1*50
    assert body["tax_total"] == 36.0
    assert body["total"] == 286.0
    assert body["status"] == "draft"
    assert body["quote_number"] == 1
    assert body["display_number"] == "QUO-0001"


def test_quote_numbers_increment_per_workspace(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    _enable_billing(client, workspace_id, headers)
    customer = _create_customer(client, workspace_id, headers)

    first = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/quotes",
        headers=headers,
        json={"customer_id": customer["customer_id"], "lines": [{"description": "A", "quantity": 1, "unit_price": 10}]},
    ).json()
    second = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/quotes",
        headers=headers,
        json={"customer_id": customer["customer_id"], "lines": [{"description": "B", "quantity": 1, "unit_price": 10}]},
    ).json()
    assert first["quote_number"] == 1
    assert second["quote_number"] == 2


def test_quote_lifecycle_and_edit_lock(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    _enable_billing(client, workspace_id, headers)
    customer = _create_customer(client, workspace_id, headers)

    quote = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/quotes",
        headers=headers,
        json={"customer_id": customer["customer_id"], "lines": [{"description": "Work", "quantity": 1, "unit_price": 100}]},
    ).json()
    quote_id = quote["quote_id"]

    # Can't accept a draft directly -- must be sent first.
    bad_accept = client.post(f"/api/v1/workspaces/{workspace_id}/billing/quotes/{quote_id}/accept", headers=headers)
    assert bad_accept.status_code == status.HTTP_400_BAD_REQUEST

    sent = client.post(f"/api/v1/workspaces/{workspace_id}/billing/quotes/{quote_id}/send", headers=headers)
    assert sent.status_code == status.HTTP_200_OK, sent.text
    assert sent.json()["status"] == "sent"

    # A sent quote can no longer be edited or deleted.
    edit_attempt = client.put(
        f"/api/v1/workspaces/{workspace_id}/billing/quotes/{quote_id}",
        headers=headers,
        json={"notes": "trying to edit"},
    )
    assert edit_attempt.status_code == status.HTTP_400_BAD_REQUEST

    delete_attempt = client.delete(f"/api/v1/workspaces/{workspace_id}/billing/quotes/{quote_id}", headers=headers)
    assert delete_attempt.status_code == status.HTTP_400_BAD_REQUEST

    accepted = client.post(f"/api/v1/workspaces/{workspace_id}/billing/quotes/{quote_id}/accept", headers=headers)
    assert accepted.status_code == status.HTTP_200_OK, accepted.text
    assert accepted.json()["status"] == "accepted"


def test_convert_accepted_quote_to_invoice(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    _enable_billing(client, workspace_id, headers)
    customer = _create_customer(client, workspace_id, headers)

    quote = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/quotes",
        headers=headers,
        json={"customer_id": customer["customer_id"], "lines": [{"description": "Work", "quantity": 3, "unit_price": 100, "tax_rate": 10}]},
    ).json()
    quote_id = quote["quote_id"]

    # Can't convert before it's accepted.
    too_early = client.post(f"/api/v1/workspaces/{workspace_id}/billing/quotes/{quote_id}/convert-to-invoice", headers=headers)
    assert too_early.status_code == status.HTTP_400_BAD_REQUEST

    client.post(f"/api/v1/workspaces/{workspace_id}/billing/quotes/{quote_id}/send", headers=headers)
    client.post(f"/api/v1/workspaces/{workspace_id}/billing/quotes/{quote_id}/accept", headers=headers)

    converted = client.post(f"/api/v1/workspaces/{workspace_id}/billing/quotes/{quote_id}/convert-to-invoice", headers=headers)
    assert converted.status_code == status.HTTP_201_CREATED, converted.text
    invoice = converted.json()
    assert invoice["quote_id"] == quote_id
    assert invoice["total"] == quote["total"]
    assert invoice["status"] == "draft"
    assert invoice["invoice_number"] == 1
    assert len(invoice["lines"]) == 1


def test_invoice_payments_update_status_and_can_be_reversed(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    _enable_billing(client, workspace_id, headers)
    customer = _create_customer(client, workspace_id, headers)

    invoice = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/invoices",
        headers=headers,
        json={"customer_id": customer["customer_id"], "lines": [{"description": "Work", "quantity": 1, "unit_price": 200}]},
    ).json()
    invoice_id = invoice["invoice_id"]
    assert invoice["total"] == 200.0

    # Can't pay a draft invoice.
    early_payment = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/invoices/{invoice_id}/payments",
        headers=headers,
        json={"amount": 50},
    )
    assert early_payment.status_code == status.HTTP_400_BAD_REQUEST

    client.post(f"/api/v1/workspaces/{workspace_id}/billing/invoices/{invoice_id}/send", headers=headers)

    partial = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/invoices/{invoice_id}/payments",
        headers=headers,
        json={"amount": 80, "method": "upi"},
    )
    assert partial.status_code == status.HTTP_201_CREATED, partial.text
    payment_id = partial.json()["payment_id"]

    after_partial = client.get(f"/api/v1/workspaces/{workspace_id}/billing/invoices/{invoice_id}", headers=headers).json()
    assert after_partial["status"] == "partially_paid"
    assert after_partial["amount_paid"] == 80.0
    assert after_partial["balance_due"] == 120.0

    full = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/invoices/{invoice_id}/payments",
        headers=headers,
        json={"amount": 120, "method": "bank_transfer"},
    )
    assert full.status_code == status.HTTP_201_CREATED, full.text

    after_full = client.get(f"/api/v1/workspaces/{workspace_id}/billing/invoices/{invoice_id}", headers=headers).json()
    assert after_full["status"] == "paid"
    assert after_full["balance_due"] == 0.0

    # Reversing the first payment should downgrade the status back down.
    removed = client.delete(f"/api/v1/workspaces/{workspace_id}/billing/payments/{payment_id}", headers=headers)
    assert removed.status_code == status.HTTP_204_NO_CONTENT

    after_removal = client.get(f"/api/v1/workspaces/{workspace_id}/billing/invoices/{invoice_id}", headers=headers).json()
    assert after_removal["status"] == "partially_paid"
    assert after_removal["amount_paid"] == 120.0


def test_void_invoice_blocks_further_payment(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    _enable_billing(client, workspace_id, headers)
    customer = _create_customer(client, workspace_id, headers)

    invoice = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/invoices",
        headers=headers,
        json={"customer_id": customer["customer_id"], "lines": [{"description": "Work", "quantity": 1, "unit_price": 100}]},
    ).json()
    invoice_id = invoice["invoice_id"]
    client.post(f"/api/v1/workspaces/{workspace_id}/billing/invoices/{invoice_id}/send", headers=headers)

    voided = client.post(f"/api/v1/workspaces/{workspace_id}/billing/invoices/{invoice_id}/void", headers=headers)
    assert voided.status_code == status.HTTP_200_OK, voided.text
    assert voided.json()["status"] == "void"

    double_void = client.post(f"/api/v1/workspaces/{workspace_id}/billing/invoices/{invoice_id}/void", headers=headers)
    assert double_void.status_code == status.HTTP_400_BAD_REQUEST

    blocked_payment = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/invoices/{invoice_id}/payments",
        headers=headers,
        json={"amount": 10},
    )
    assert blocked_payment.status_code == status.HTTP_400_BAD_REQUEST


def test_billing_summary(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    _enable_billing(client, workspace_id, headers)
    customer = _create_customer(client, workspace_id, headers)

    # A fully-paid invoice, due in the past -- should NOT count as outstanding/overdue.
    paid_invoice = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/invoices",
        headers=headers,
        json={"customer_id": customer["customer_id"], "due_date": "2020-01-01", "lines": [{"description": "Work", "quantity": 1, "unit_price": 100}]},
    ).json()
    client.post(f"/api/v1/workspaces/{workspace_id}/billing/invoices/{paid_invoice['invoice_id']}/send", headers=headers)
    client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/invoices/{paid_invoice['invoice_id']}/payments",
        headers=headers,
        json={"amount": 100},
    )

    # An overdue, unpaid invoice.
    overdue_invoice = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/invoices",
        headers=headers,
        json={"customer_id": customer["customer_id"], "due_date": "2020-01-01", "lines": [{"description": "Work", "quantity": 1, "unit_price": 300}]},
    ).json()
    client.post(f"/api/v1/workspaces/{workspace_id}/billing/invoices/{overdue_invoice['invoice_id']}/send", headers=headers)

    # A draft quote and a sent quote, for the quote counters.
    client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/quotes",
        headers=headers,
        json={"customer_id": customer["customer_id"], "lines": [{"description": "Q1", "quantity": 1, "unit_price": 10}]},
    )
    sent_quote = client.post(
        f"/api/v1/workspaces/{workspace_id}/billing/quotes",
        headers=headers,
        json={"customer_id": customer["customer_id"], "lines": [{"description": "Q2", "quantity": 1, "unit_price": 10}]},
    ).json()
    client.post(f"/api/v1/workspaces/{workspace_id}/billing/quotes/{sent_quote['quote_id']}/send", headers=headers)

    summary = client.get(f"/api/v1/workspaces/{workspace_id}/billing/summary", headers=headers)
    assert summary.status_code == status.HTTP_200_OK, summary.text
    body = summary.json()
    assert body["total_outstanding"] == 300.0
    assert body["total_overdue"] == 300.0
    assert body["overdue_invoice_count"] == 1
    assert body["revenue_this_month"] == 100.0
    assert body["draft_quote_count"] == 1
    assert body["sent_quote_count"] == 1


def test_billing_module_disabled_by_default(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    resp = client.get(f"/api/v1/workspaces/{workspace_id}/billing/customers", headers=headers)
    assert resp.status_code == status.HTTP_403_FORBIDDEN

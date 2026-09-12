"""
CRM flow: contact -> deal -> contact activity. Real paths (all nested under
/api/v1/workspaces/{workspace_id}/crm/...) and real payload shapes, verified
against commands/crm_cmd.py and controllers/crm_controller.py -- the
original version of this file used /api/crm/* paths and a generic
/api/crm/activities/ list endpoint that don't exist anywhere in this app.

Tests below still send workspace_id/contact_id/user_id explicitly in
request bodies -- that continues to work, but as of this change the
controller now overwrites all of them from the URL path / auth token
regardless of what's sent (see create_contact/create_deal/
create_contact_activity/create_deal_activity in controller.py). That fixed
a real bug: the actual frontend (contactsSlice.js/dealsSlice.js) never
sent workspace_id at all, so every real "Create Contact"/"Create Deal" was
422ing outright. See test_contact_and_deal_create_without_workspace_id_in_body
below for the shape that matters.
"""
from fastapi import status


def test_create_contact(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    resp = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/contacts",
        headers=signed_up_user["headers"],
        json={
            "workspace_id": workspace_id,
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "phone": "+1234567890",
            "company": "Test Company",
            "job_title": "CEO",
        },
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text
    body = resp.json()
    assert body["first_name"] == "John"
    assert body["workspace_id"] == workspace_id


def test_list_contacts_includes_created_one(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    created = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/contacts",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "first_name": "Jane",
            "last_name": "Smith",
        },
    )
    assert created.status_code == status.HTTP_200_OK, created.text
    contact_id = created.json()["contact_id"]

    listed = client.get(f"/api/v1/workspaces/{workspace_id}/crm/contacts", headers=headers)
    assert listed.status_code == status.HTTP_200_OK, listed.text
    ids = [c["contact_id"] for c in listed.json()]
    assert contact_id in ids


def test_create_deal_for_contact(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    contact = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/contacts",
        headers=headers,
        json={"workspace_id": workspace_id, "first_name": "Deal", "last_name": "Contact"},
    ).json()

    resp = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/deals",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "contact_id": contact["contact_id"],
            "title": "Test Deal",
            "value": 10000,
            "stage": "proposal",
            "probability": 75,
        },
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text
    deal = resp.json()
    assert deal["title"] == "Test Deal"
    assert deal["contact_id"] == contact["contact_id"]


def test_create_and_list_contact_activity(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    user_id = signed_up_user["user_id"]
    headers = signed_up_user["headers"]

    contact = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/contacts",
        headers=headers,
        json={"workspace_id": workspace_id, "first_name": "Activity", "last_name": "Contact"},
    ).json()
    contact_id = contact["contact_id"]

    activity = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/contacts/{contact_id}/activities",
        headers=headers,
        json={
            "workspace_id": workspace_id,
            "contact_id": contact_id,
            "user_id": user_id,
            "type": "call",
            "title": "Follow-up call",
            "description": "Discuss project timeline",
        },
    )
    assert activity.status_code == status.HTTP_200_OK, activity.text
    assert activity.json()["title"] == "Follow-up call"

    listed = client.get(
        f"/api/v1/workspaces/{workspace_id}/crm/contacts/{contact_id}/activities",
        headers=headers,
    )
    assert listed.status_code == status.HTTP_200_OK, listed.text
    assert len(listed.json()) >= 1


def test_contact_and_deal_create_without_workspace_id_in_body(client, signed_up_user):
    """The real frontend shape -- contactsSlice.js's addContact and
    dealsSlice.js's addDeal never send workspace_id at all. Before the
    controller started overwriting it from the URL path, this 422'd."""
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    contact = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/contacts",
        headers=headers,
        json={"first_name": "NoBody", "last_name": "Workspace"},
    )
    assert contact.status_code == status.HTTP_200_OK, contact.text
    assert contact.json()["workspace_id"] == workspace_id

    deal = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/deals",
        headers=headers,
        json={"contact_id": contact.json()["contact_id"], "title": "No Workspace Id Deal", "stage": "new"},
    )
    assert deal.status_code == status.HTTP_200_OK, deal.text
    assert deal.json()["workspace_id"] == workspace_id


def test_create_ignores_a_spoofed_workspace_id_in_the_body(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    contact = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/contacts",
        headers=headers,
        json={"first_name": "Spoofed", "last_name": "Workspace", "workspace_id": "00000000-0000-0000-0000-000000000000"},
    )
    assert contact.status_code == status.HTTP_200_OK, contact.text
    assert contact.json()["workspace_id"] == workspace_id


def test_lead_crud(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    created = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/leads",
        headers=headers,
        json={"first_name": "Lee", "last_name": "Adkins", "email": "lee@example.com", "company_name": "Acme", "source": "website"},
    )
    assert created.status_code == status.HTTP_200_OK, created.text
    lead = created.json()
    assert lead["status"] == "new"
    assert lead["workspace_id"] == workspace_id
    lead_id = lead["lead_id"]

    listed = client.get(f"/api/v1/workspaces/{workspace_id}/crm/leads", headers=headers)
    assert listed.status_code == status.HTTP_200_OK, listed.text
    assert lead_id in [l["lead_id"] for l in listed.json()]

    updated = client.put(
        f"/api/v1/workspaces/{workspace_id}/crm/leads/{lead_id}",
        headers=headers,
        json={"status": "contacted"},
    )
    assert updated.status_code == status.HTTP_200_OK, updated.text
    assert updated.json()["status"] == "contacted"

    filtered = client.get(f"/api/v1/workspaces/{workspace_id}/crm/leads?status_filter=contacted", headers=headers)
    assert lead_id in [l["lead_id"] for l in filtered.json()]

    deleted = client.delete(f"/api/v1/workspaces/{workspace_id}/crm/leads/{lead_id}", headers=headers)
    assert deleted.status_code == status.HTTP_200_OK, deleted.text

    gone = client.get(f"/api/v1/workspaces/{workspace_id}/crm/leads/{lead_id}", headers=headers)
    assert gone.status_code == status.HTTP_404_NOT_FOUND


def test_lead_activity_crud(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    lead = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/leads",
        headers=headers,
        json={"first_name": "Act", "last_name": "Ivity"},
    ).json()

    activity = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/leads/{lead['lead_id']}/activities",
        headers=headers,
        json={"type": "call", "title": "Intro call"},
    )
    assert activity.status_code == status.HTTP_200_OK, activity.text
    assert activity.json()["lead_id"] == lead["lead_id"]
    assert activity.json()["workspace_id"] == workspace_id

    listed = client.get(f"/api/v1/workspaces/{workspace_id}/crm/leads/{lead['lead_id']}/activities", headers=headers)
    assert len(listed.json()) == 1


def test_convert_lead_creates_company_contact_and_deal(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    lead = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/leads",
        headers=headers,
        json={"first_name": "Sam", "last_name": "Prospect", "email": "sam@newco.example.com", "company_name": "NewCo", "source": "referral"},
    ).json()

    converted = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/leads/{lead['lead_id']}/convert",
        headers=headers,
        json={"deal_title": "NewCo Opportunity", "deal_value": 5000, "deal_stage": "qualified"},
    )
    assert converted.status_code == status.HTTP_200_OK, converted.text
    body = converted.json()
    assert body["lead"]["status"] == "converted"
    assert body["contact"]["first_name"] == "Sam"
    assert body["company"]["name"] == "NewCo"
    assert body["deal"]["title"] == "NewCo Opportunity"
    assert body["deal"]["value"] == 5000
    assert body["deal"]["contact_id"] == body["contact"]["contact_id"]
    assert body["contact"]["company_id"] == body["company"]["company_id"]

    # The lead itself records what conversion created.
    refreshed = client.get(f"/api/v1/workspaces/{workspace_id}/crm/leads/{lead['lead_id']}", headers=headers).json()
    assert refreshed["converted_contact_id"] == body["contact"]["contact_id"]
    assert refreshed["converted_company_id"] == body["company"]["company_id"]
    assert refreshed["converted_deal_id"] == body["deal"]["deal_id"]

    # A converted lead can't be edited or converted again.
    edit_attempt = client.put(
        f"/api/v1/workspaces/{workspace_id}/crm/leads/{lead['lead_id']}",
        headers=headers,
        json={"notes": "too late"},
    )
    assert edit_attempt.status_code == status.HTTP_400_BAD_REQUEST

    reconvert_attempt = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/leads/{lead['lead_id']}/convert",
        headers=headers,
        json={},
    )
    assert reconvert_attempt.status_code == status.HTTP_400_BAD_REQUEST


def test_convert_lead_can_link_existing_company_and_skip_deal(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    company = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/companies",
        headers=headers,
        json={"name": "Existing Co"},
    ).json()

    lead = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/leads",
        headers=headers,
        json={"first_name": "Val", "last_name": "Existing", "company_name": "Some Other Name"},
    ).json()

    converted = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/leads/{lead['lead_id']}/convert",
        headers=headers,
        json={"company_id": company["company_id"], "create_deal": False},
    )
    assert converted.status_code == status.HTTP_200_OK, converted.text
    body = converted.json()
    assert body["company"]["company_id"] == company["company_id"]
    assert body["deal"] is None


def test_deal_can_be_linked_to_a_billing_quote(client, signed_up_user):
    """quote_id is a soft reference (no FK) to a Billing Quote -- CRM
    itself never validates it, since Billing may not even be enabled for
    this workspace. This just confirms the field round-trips."""
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    contact = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/contacts",
        headers=headers,
        json={"first_name": "Quote", "last_name": "Linked"},
    ).json()
    deal = client.post(
        f"/api/v1/workspaces/{workspace_id}/crm/deals",
        headers=headers,
        json={"contact_id": contact["contact_id"], "title": "Quotable Deal", "stage": "new"},
    ).json()
    assert deal["quote_id"] is None

    fake_quote_id = "11111111-1111-1111-1111-111111111111"
    updated = client.put(
        f"/api/v1/workspaces/{workspace_id}/crm/deals/{deal['deal_id']}",
        headers=headers,
        json={"quote_id": fake_quote_id},
    )
    assert updated.status_code == status.HTTP_200_OK, updated.text
    assert updated.json()["quote_id"] == fake_quote_id

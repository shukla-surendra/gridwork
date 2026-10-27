"""
Broad, shallow sweep: does each router's list endpoint respond without a
server error, for a brand-new workspace that legitimately has zero items of
that type yet? This is the fast "is anything obviously broken" signal --
depth (real CRUD, real assertions) belongs in test_core_flow.py instead.

Endpoints deliberately left out, with why:
  - comments -- no plain list route exists (only /{comment_id} and
    /tasks/{task_id}); nothing equivalent to smoke-test here.
"""
import pytest
from fastapi import status

LIST_ENDPOINTS = [
    "activities",
    "chats",
    "crm/contacts",
    "crm/deals",
    "databases",
    "notifications",
    "pages",
    "reminders",
    "templates",
    "settings",
    "boards",
]


@pytest.mark.parametrize("resource", LIST_ENDPOINTS)
def test_list_endpoint_does_not_error(client, signed_up_user, resource):
    workspace_id = signed_up_user["workspace_id"]
    resp = client.get(
        f"/api/v1/workspaces/{workspace_id}/{resource}/",
        headers=signed_up_user["headers"],
    )
    assert resp.status_code < 500, f"{resource}: {resp.status_code} {resp.text}"


def test_list_workspaces(client, signed_up_user):
    resp = client.get("/api/v1/workspaces/", headers=signed_up_user["headers"])
    assert resp.status_code == status.HTTP_200_OK, resp.text
    workspace_ids = [w["workspace_id"] for w in resp.json()]
    assert signed_up_user["workspace_id"] in workspace_ids


def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["database"] == "healthy"

import uuid
from fastapi import status


def test_list_modules_shows_correct_defaults(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    resp = client.get(f"/api/v1/workspaces/{workspace_id}/modules/", headers=headers)
    assert resp.status_code == status.HTTP_200_OK, resp.text
    by_key = {m["key"]: m["enabled"] for m in resp.json()}

    # Every module -- packaged (Inventory, HR, School ERP) and adopted
    # (CRM, Wiki, etc.) -- defaults to enabled, so a fresh workspace gets
    # the full feature set without anyone having to opt in module by
    # module. A workspace can still explicitly disable one via the toggle
    # endpoint (see test_owner_can_toggle_a_module below).
    assert by_key["inventory"] is True
    assert by_key["crm"] is True
    assert by_key["wiki"] is True


def test_owner_can_toggle_a_module(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    enabled = client.put(
        f"/api/v1/workspaces/{workspace_id}/modules/inventory",
        headers=headers,
        json={"enabled": True},
    )
    assert enabled.status_code == status.HTTP_200_OK, enabled.text
    assert enabled.json()["enabled"] is True

    disabled = client.put(
        f"/api/v1/workspaces/{workspace_id}/modules/crm",
        headers=headers,
        json={"enabled": False},
    )
    assert disabled.status_code == status.HTTP_200_OK, disabled.text
    assert disabled.json()["enabled"] is False

    resp = client.get(f"/api/v1/workspaces/{workspace_id}/modules/", headers=headers)
    by_key = {m["key"]: m["enabled"] for m in resp.json()}
    assert by_key["inventory"] is True
    assert by_key["crm"] is False


def test_disabled_module_routes_403(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    # Inventory is enabled by default now -- explicitly disable it first so
    # this test actually exercises the 403 enforcement path instead of
    # relying on a default that no longer exists.
    disabled = client.put(
        f"/api/v1/workspaces/{workspace_id}/modules/inventory",
        headers=headers,
        json={"enabled": False},
    )
    assert disabled.status_code == status.HTTP_200_OK, disabled.text

    resp = client.get(f"/api/v1/workspaces/{workspace_id}/inventory/products", headers=headers)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_unknown_module_key_404s(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    resp = client.put(
        f"/api/v1/workspaces/{workspace_id}/modules/does-not-exist",
        headers=headers,
        json={"enabled": True},
    )
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_non_owner_cannot_toggle_modules(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    owner_headers = signed_up_user["headers"]

    member_email = f"member-{uuid.uuid4()}@example.com"
    member_password = "TestPass123!"
    signup = client.post(
        "/api/v1/users/signup",
        json={"email": member_email, "password": member_password, "first_name": "Member", "last_name": "User"},
    )
    assert signup.status_code == status.HTTP_201_CREATED, signup.text

    invited = client.post(
        f"/api/v1/workspaces/{workspace_id}/invite",
        headers=owner_headers,
        json={"email": member_email, "role": "member"},
    )
    assert invited.status_code == status.HTTP_200_OK, invited.text

    member_login = client.post("/api/v1/users/login", json={"email": member_email, "password": member_password})
    assert member_login.status_code == status.HTTP_200_OK, member_login.text
    member_headers = {"Authorization": f"Bearer {member_login.json()['access_token']}"}

    resp = client.put(
        f"/api/v1/workspaces/{workspace_id}/modules/inventory",
        headers=member_headers,
        json={"enabled": True},
    )
    assert resp.status_code == status.HTTP_403_FORBIDDEN

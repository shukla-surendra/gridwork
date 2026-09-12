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
    assert by_key["activity"] is True
    assert by_key["comments"] is True
    assert by_key["epics"] is True
    assert by_key["sprints"] is True
    assert by_key["timeblocks"] is True
    assert by_key["task_links"] is True
    assert by_key["assistant"] is True
    assert by_key["tasks"] is True
    assert by_key["boards"] is True
    assert by_key["notes"] is True
    assert by_key["calendar"] is True


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


def test_disabling_newly_adopted_modules_blocks_their_routes(client, signed_up_user):
    """Same 403-on-disable enforcement as test_disabled_module_routes_403,
    exercised for every feature adopted into the registry in this change
    (activity, comments, epics, sprints, task_links, assistant) -- one
    representative GET/POST per module is enough since they all share the
    same require_module_enabled gate (or, for assistant, the equivalent
    manual check -- see controllers/assistant_controller.py). Tasks,
    Boards, Calendar, and Timeblocks are NOT in this list -- they're
    "nav-only" modules (modules/registry.py's NAV_ONLY_MODULES) whose API
    stays reachable regardless of the toggle; see
    test_nav_only_modules_stay_reachable_when_disabled below."""
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    checks = [
        ("activity", "GET", f"/api/v1/workspaces/{workspace_id}/activities/"),
        ("comments", "GET", f"/api/v1/workspaces/{workspace_id}/comments/tasks/dummy-task-id"),
        ("epics", "GET", f"/api/v1/workspaces/{workspace_id}/boards/dummy-board-id/epics/"),
        ("sprints", "GET", f"/api/v1/workspaces/{workspace_id}/boards/dummy-board-id/sprints/"),
        ("task_links", "GET", f"/api/v1/workspaces/{workspace_id}/tasks/dummy-task-id/links/"),
    ]

    for module_key, method, path in checks:
        disabled = client.put(
            f"/api/v1/workspaces/{workspace_id}/modules/{module_key}",
            headers=headers,
            json={"enabled": False},
        )
        assert disabled.status_code == status.HTTP_200_OK, disabled.text

        resp = client.request(method, path, headers=headers)
        assert resp.status_code == status.HTTP_403_FORBIDDEN, f"{module_key}: {resp.text}"

    disabled_assistant = client.put(
        f"/api/v1/workspaces/{workspace_id}/modules/assistant",
        headers=headers,
        json={"enabled": False},
    )
    assert disabled_assistant.status_code == status.HTTP_200_OK, disabled_assistant.text

    assistant_resp = client.post(
        "/api/v1/assistant/command",
        headers=headers,
        json={"command": "list my tasks", "workspace_id": workspace_id},
    )
    assert assistant_resp.status_code == status.HTTP_403_FORBIDDEN, assistant_resp.text


def test_nav_only_modules_stay_reachable_when_disabled(client, signed_up_user):
    """Tasks, Boards, Notes, Calendar, and Timeblocks are "nav-only"
    toggles (modules/registry.py's NAV_ONLY_MODULES) -- disabling one
    only hides the frontend nav entry/page (assistant_web_next's
    FeatureDisabledPage + selectIsModuleEnabled), it must NOT 403 the
    underlying API, since Notes/Comments/Epics/Sprints/Task Links all
    depend on Tasks/Boards staying reachable regardless of this toggle."""
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    for module_key in ["tasks", "boards", "notes", "calendar", "timeblocks"]:
        disabled = client.put(
            f"/api/v1/workspaces/{workspace_id}/modules/{module_key}",
            headers=headers,
            json={"enabled": False},
        )
        assert disabled.status_code == status.HTTP_200_OK, disabled.text

    # Tasks (and the Timeblock/Notes features built on top of it) stay
    # fully functional even with every one of those toggles off.
    created = client.post(
        f"/api/v1/workspaces/{workspace_id}/tasks",
        headers=headers,
        json={"title": "Still works", "task_type": "TASK"},
    )
    assert created.status_code == status.HTTP_201_CREATED, created.text

    listed = client.get(f"/api/v1/workspaces/{workspace_id}/tasks", headers=headers)
    assert listed.status_code == status.HTTP_200_OK, listed.text

    boards_resp = client.get(f"/api/v1/workspaces/{workspace_id}/boards/", headers=headers)
    assert boards_resp.status_code == status.HTTP_200_OK, boards_resp.text

    notes_resp = client.post(
        f"/api/v1/workspaces/{workspace_id}/tasks",
        headers=headers,
        json={"title": "Still-working note", "task_type": "NOTE"},
    )
    assert notes_resp.status_code == status.HTTP_201_CREATED, notes_resp.text

    notes_listed = client.get(f"/api/v1/workspaces/{workspace_id}/tasks?task_type=NOTE", headers=headers)
    assert notes_listed.status_code == status.HTTP_200_OK, notes_listed.text


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

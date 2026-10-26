import re

from fastapi import status


def _create_task(client, workspace_id, headers, **body):
    resp = client.post(f"/api/v1/workspaces/{workspace_id}/tasks", headers=headers, json={"title": "t", "task_type": "task", **body})
    assert resp.status_code == status.HTTP_201_CREATED, resp.text
    return resp.json()


def test_boardless_tasks_get_sequential_workspace_keys(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    first = _create_task(client, workspace_id, headers, title="First")
    second = _create_task(client, workspace_id, headers, title="Second")

    assert re.fullmatch(r"[A-Z0-9]+-\d+", first["ticket_key"]), first["ticket_key"]
    prefix = first["ticket_key"].split("-")[0]
    assert second["ticket_key"] == f"{prefix}-{first['task_number'] + 1}"


def test_notes_are_not_numbered(client, signed_up_user):
    note = _create_task(client, signed_up_user["workspace_id"], signed_up_user["headers"], task_type="note")
    assert note["task_number"] is None
    assert note["ticket_key"] is None


def test_get_task_by_key_case_insensitive(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    task = _create_task(client, workspace_id, headers, title="Find me")

    got = client.get(f"/api/v1/workspaces/{workspace_id}/tasks/key/{task['ticket_key'].lower()}", headers=headers)
    assert got.status_code == status.HTTP_200_OK, got.text
    assert got.json()["task_id"] == task["task_id"]

    missing = client.get(f"/api/v1/workspaces/{workspace_id}/tasks/key/NOPE-999", headers=headers)
    assert missing.status_code == status.HTTP_404_NOT_FOUND
    garbage = client.get(f"/api/v1/workspaces/{workspace_id}/tasks/key/not-a-key", headers=headers)
    assert garbage.status_code == status.HTTP_404_NOT_FOUND


def test_moving_task_to_another_board_rekeys_it(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    boards = []
    for name in ("Platform Engineering", "Mobile App"):
        resp = client.post(f"/api/v1/workspaces/{workspace_id}/boards/", headers=headers, json={"name": name})
        assert resp.status_code == status.HTTP_201_CREATED, resp.text
        boards.append(resp.json())
    source, target = boards

    # Target already has ticket #1, so the moved task must not reuse it.
    existing = _create_task(client, workspace_id, headers, board_id=target["board_id"])
    moving = _create_task(client, workspace_id, headers, board_id=source["board_id"])
    assert moving["ticket_key"] == f"{source['key']}-1"
    assert existing["ticket_key"] == f"{target['key']}-1"

    moved = client.put(
        f"/api/v1/workspaces/{workspace_id}/tasks/{moving['task_id']}",
        headers=headers,
        json={"board_id": target["board_id"]},
    )
    assert moved.status_code == status.HTTP_200_OK, moved.text
    assert moved.json()["ticket_key"] == f"{target['key']}-2"


def test_board_key_never_collides_with_workspace_key(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    task = _create_task(client, workspace_id, headers)
    workspace_key = task["ticket_key"].split("-")[0]

    # A board whose name would generate exactly the workspace's key.
    resp = client.post(f"/api/v1/workspaces/{workspace_id}/boards/", headers=headers, json={"name": workspace_key})
    assert resp.status_code == status.HTTP_201_CREATED, resp.text
    assert resp.json()["key"] != workspace_key

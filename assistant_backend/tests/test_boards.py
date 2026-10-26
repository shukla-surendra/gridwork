from fastapi import status


def test_create_list_get_update_delete_board(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    created = client.post(
        f"/api/v1/workspaces/{workspace_id}/boards/",
        headers=headers,
        json={"name": "Sprint Board", "description": "Team board"},
    )
    assert created.status_code == status.HTTP_201_CREATED, created.text
    board = created.json()
    assert board["name"] == "Sprint Board"
    board_id = board["board_id"]

    listed = client.get(f"/api/v1/workspaces/{workspace_id}/boards/", headers=headers)
    assert listed.status_code == status.HTTP_200_OK, listed.text
    assert board_id in [b["board_id"] for b in listed.json()]

    got = client.get(f"/api/v1/workspaces/{workspace_id}/boards/{board_id}", headers=headers)
    assert got.status_code == status.HTTP_200_OK, got.text

    updated = client.put(
        f"/api/v1/workspaces/{workspace_id}/boards/{board_id}",
        headers=headers,
        # board_id is required by BoardUpdateCommand even though the
        # controller overwrites it from the URL path afterward -- same
        # accepted pattern as several other *UpdateCommand classes in
        # this app.
        json={"board_id": board_id, "name": "Renamed Board"},
    )
    assert updated.status_code == status.HTTP_200_OK, updated.text
    assert updated.json()["name"] == "Renamed Board"

    deleted = client.delete(f"/api/v1/workspaces/{workspace_id}/boards/{board_id}", headers=headers)
    assert deleted.status_code == status.HTTP_204_NO_CONTENT, deleted.text

    after_delete = client.get(f"/api/v1/workspaces/{workspace_id}/boards/{board_id}", headers=headers)
    assert after_delete.status_code == status.HTTP_404_NOT_FOUND


def test_board_requires_auth(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    resp = client.get(f"/api/v1/workspaces/{workspace_id}/boards/")
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_partial_task_update_keeps_labels_and_meta_data(client, signed_up_user):
    """A Kanban drag only PUTs {status, order, board_id} -- that must not
    wipe fields the body didn't mention (labels/watchers/meta_data used to
    default to []/{} on TaskUpdateCommand and get overwritten)."""
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    created = client.post(
        f"/api/v1/workspaces/{workspace_id}/tasks",
        headers=headers,
        json={
            "title": "Keep my labels",
            "task_type": "task",
            "labels": ["backend"],
            "meta_data": {"issue_type": "bug"},
        },
    )
    assert created.status_code == status.HTTP_201_CREATED, created.text
    task_id = created.json()["task_id"]

    moved = client.put(
        f"/api/v1/workspaces/{workspace_id}/tasks/{task_id}",
        headers=headers,
        json={"status": "in_progress", "order": 0},
    )
    assert moved.status_code == status.HTTP_200_OK, moved.text

    got = client.get(f"/api/v1/workspaces/{workspace_id}/tasks/{task_id}", headers=headers)
    assert got.status_code == status.HTTP_200_OK, got.text
    body = got.json()
    assert body["status"] == "in_progress"
    assert body["labels"] == ["backend"]
    assert body["meta_data"] == {"issue_type": "bug"}

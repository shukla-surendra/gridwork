"""Work items are shared with every workspace member (Jira-style); notes,
quick notes and time blocks stay private to their author."""
from fastapi import status


def _invite(client, owner, member, role="member"):
    resp = client.post(
        f"/api/v1/workspaces/{owner['workspace_id']}/invite",
        headers=owner["headers"],
        json={"email": member["email"], "role": role},
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text


def _create(client, user, workspace_id, **body):
    resp = client.post(f"/api/v1/workspaces/{workspace_id}/tasks", headers=user["headers"], json={"title": "x", **body})
    assert resp.status_code == status.HTTP_201_CREATED, resp.text
    return resp.json()


def test_member_sees_and_updates_work_items_but_not_private_notes(client, signed_up_user, other_user):
    ws = signed_up_user["workspace_id"]
    _invite(client, signed_up_user, other_user)
    work = _create(client, signed_up_user, ws, title="Shared bug", task_type="bug", assignee_id=other_user["user_id"])
    note = _create(client, signed_up_user, ws, title="My private note", task_type="note")

    listed = client.get(f"/api/v1/workspaces/{ws}/tasks?page_size=200", headers=other_user["headers"])
    assert listed.status_code == status.HTTP_200_OK, listed.text
    ids = {t["task_id"] for t in listed.json()}
    assert work["task_id"] in ids
    assert note["task_id"] not in ids

    assert client.get(f"/api/v1/workspaces/{ws}/tasks/{note['task_id']}", headers=other_user["headers"]).status_code == status.HTTP_404_NOT_FOUND
    assert client.get(f"/api/v1/workspaces/{ws}/tasks/key/{work['ticket_key']}", headers=other_user["headers"]).status_code == status.HTTP_200_OK

    moved = client.put(f"/api/v1/workspaces/{ws}/tasks/{work['task_id']}", headers=other_user["headers"], json={"status": "in_progress"})
    assert moved.status_code == status.HTTP_200_OK, moved.text
    assert moved.json()["status"] == "in_progress"


def test_non_member_is_forbidden(client, signed_up_user, other_user):
    ws = signed_up_user["workspace_id"]
    work = _create(client, signed_up_user, ws, task_type="task")
    h = other_user["headers"]
    assert client.get(f"/api/v1/workspaces/{ws}/tasks", headers=h).status_code == status.HTTP_403_FORBIDDEN
    assert client.get(f"/api/v1/workspaces/{ws}/tasks/{work['task_id']}", headers=h).status_code == status.HTTP_403_FORBIDDEN
    assert client.put(f"/api/v1/workspaces/{ws}/tasks/{work['task_id']}", headers=h, json={"title": "pwned"}).status_code == status.HTTP_403_FORBIDDEN
    assert client.post(f"/api/v1/workspaces/{ws}/tasks", headers=h, json={"title": "injected"}).status_code == status.HTTP_403_FORBIDDEN


def test_only_creator_or_admin_can_delete_work_items(client, signed_up_user, other_user):
    ws = signed_up_user["workspace_id"]
    _invite(client, signed_up_user, other_user, role="member")
    work = _create(client, signed_up_user, ws, task_type="task")

    denied = client.delete(f"/api/v1/workspaces/{ws}/tasks/{work['task_id']}", headers=other_user["headers"])
    assert denied.status_code == status.HTTP_403_FORBIDDEN

    # Member's own item: fine.
    own = _create(client, other_user, ws, task_type="task")
    assert client.delete(f"/api/v1/workspaces/{ws}/tasks/{own['task_id']}", headers=other_user["headers"]).status_code == status.HTTP_204_NO_CONTENT
    # Workspace owner can delete the member's item too.
    theirs = _create(client, other_user, ws, task_type="task")
    assert client.delete(f"/api/v1/workspaces/{ws}/tasks/{theirs['task_id']}", headers=signed_up_user["headers"]).status_code == status.HTTP_204_NO_CONTENT


def test_search_by_title_or_ticket_key(client, signed_up_user):
    ws, h = signed_up_user["workspace_id"], signed_up_user["headers"]
    a = client.post(f"/api/v1/workspaces/{ws}/tasks", headers=h, json={"title": "Fix 100% CPU spike", "task_type": "task"}).json()
    client.post(f"/api/v1/workspaces/{ws}/tasks", headers=h, json={"title": "Write docs", "task_type": "task"})

    def search(q):
        resp = client.get(f"/api/v1/workspaces/{ws}/tasks", headers=h, params={"q": q})
        assert resp.status_code == 200, resp.text
        return [t["task_id"] for t in resp.json()]

    assert search("cpu") == [a["task_id"]]
    assert search(a["ticket_key"].lower()) == [a["task_id"]]
    assert search("100%") == [a["task_id"]]
    assert search("%") == [a["task_id"]]  # literal, not a wildcard

"""A member of one workspace must not reach another workspace's board data
by putting a foreign board/sprint/epic id under their own workspace_id."""
from fastapi import status


def _board_with_sprint_and_epic(client, owner):
    ws, headers = owner["workspace_id"], owner["headers"]
    board = client.post(f"/api/v1/workspaces/{ws}/boards/", headers=headers, json={"name": "Private Board"}).json()
    base = f"/api/v1/workspaces/{ws}/boards/{board['board_id']}"
    sprint = client.post(f"{base}/sprints/", headers=headers, json={"name": "S1"}).json()
    epic = client.post(f"{base}/epics/", headers=headers, json={"title": "E1"}).json()
    return board, sprint, epic


def test_foreign_board_sprints_and_epics_are_not_reachable(client, signed_up_user, other_user):
    board, sprint, epic = _board_with_sprint_and_epic(client, signed_up_user)
    # Attacker uses THEIR OWN workspace id (passes the membership check)
    # with the victim's board id.
    base = f"/api/v1/workspaces/{other_user['workspace_id']}/boards/{board['board_id']}"
    h = other_user["headers"]

    attempts = [
        client.get(f"{base}/sprints/", headers=h),
        client.get(f"{base}/epics/", headers=h),
        client.put(f"{base}/sprints/{sprint['sprint_id']}", headers=h, json={"name": "pwned"}),
        client.post(f"{base}/sprints/{sprint['sprint_id']}/start", headers=h),
        client.post(f"{base}/sprints/", headers=h, json={"name": "injected"}),
        client.put(f"{base}/epics/{epic['epic_id']}", headers=h, json={"title": "pwned"}),
        client.get(f"/api/v1/workspaces/{other_user['workspace_id']}/boards/{board['board_id']}", headers=h),
    ]
    for resp in attempts:
        assert resp.status_code == status.HTTP_404_NOT_FOUND, (resp.request.method, resp.request.url, resp.status_code)

    # And nothing changed for the owner.
    owner_base = f"/api/v1/workspaces/{signed_up_user['workspace_id']}/boards/{board['board_id']}"
    sprints = client.get(f"{owner_base}/sprints/", headers=signed_up_user["headers"]).json()
    assert [(s["name"], s["status"]) for s in sprints] == [("S1", "planned")]


def test_sprint_from_another_board_is_not_reachable(client, signed_up_user):
    """Same workspace, wrong board in the URL -- update/start must 404."""
    ws, headers = signed_up_user["workspace_id"], signed_up_user["headers"]
    _, sprint, _ = _board_with_sprint_and_epic(client, signed_up_user)
    other_board = client.post(f"/api/v1/workspaces/{ws}/boards/", headers=headers, json={"name": "Other"}).json()
    base = f"/api/v1/workspaces/{ws}/boards/{other_board['board_id']}"
    assert client.post(f"{base}/sprints/{sprint['sprint_id']}/start", headers=headers).status_code == status.HTTP_404_NOT_FOUND
    assert client.put(f"{base}/sprints/{sprint['sprint_id']}", headers=headers, json={"name": "x"}).status_code == status.HTTP_404_NOT_FOUND


def test_malformed_board_id_is_404_not_500(client, signed_up_user):
    ws, headers = signed_up_user["workspace_id"], signed_up_user["headers"]
    resp = client.get(f"/api/v1/workspaces/{ws}/boards/not-a-uuid/sprints/", headers=headers)
    assert resp.status_code == status.HTTP_404_NOT_FOUND

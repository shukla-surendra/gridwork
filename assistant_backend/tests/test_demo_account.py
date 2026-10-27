"""The "Try demo" button is the first thing most visitors click -- the seed
must succeed and land them in a workspace that shows off the real features."""
from fastapi import status


def test_demo_account_is_seeded_with_live_features(client):
    resp = client.post("/api/v1/users/demo")
    assert resp.status_code == status.HTTP_200_OK, resp.text
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    workspaces = client.get("/api/v1/workspaces/", headers=headers).json()
    workspaces = workspaces if isinstance(workspaces, list) else workspaces.get("items", workspaces)
    ws = workspaces[0]["workspace_id"]

    notes = client.get(f"/api/v1/workspaces/{ws}/notifications/", headers=headers).json()
    assert {n["type"] for n in notes} <= {"assigned", "comment", "status_changed", "reminder"}
    assert any(not n["is_read"] for n in notes)
    assert all(n["properties"].get("ticket_key") and n["properties"]["ticket_key"] in n["title"] for n in notes)
    assert [n["created_at"] for n in notes] == sorted((n["created_at"] for n in notes), reverse=True)

    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    cal = client.get(f"/api/v1/workspaces/{ws}/calendar", headers=headers,
                     params={"start": now.isoformat(), "end": (now + timedelta(days=20)).isoformat()}).json()
    assert {"event", "focus", "due"} <= {e["kind"] for e in cal}

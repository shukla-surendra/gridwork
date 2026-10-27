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

    # Time tracking: a filled-in team timesheet and a sprint with real workload.
    today = now.date()
    monday = today - timedelta(days=today.weekday() + 7)
    team = client.get(f"/api/v1/workspaces/{ws}/timesheet/team", headers=headers,
                      params={"start": monday.isoformat(), "end": (monday + timedelta(days=6)).isoformat()}).json()
    assert len(team["members"]) == 4
    assert all(m["total_logged_minutes"] > 0 for m in team["members"])
    sprints = client.get(f"/api/v1/workspaces/{ws}/capacity/sprints", headers=headers).json()
    active = next(s for s in sprints if s["status"] == "active")
    load = client.get(f"/api/v1/workspaces/{ws}/capacity/sprints/{active['sprint_id']}", headers=headers).json()
    assert sum(1 for m in load["members"] if m["allocated_minutes"] > 0) >= 3
    assert load["unassigned"]["issue_count"] >= 1
    issues = client.get(f"/api/v1/workspaces/{ws}/tasks", headers=headers, params={"page_size": 100}).json()
    issues = issues if isinstance(issues, list) else issues.get("items", [])
    assert any(t["time_spent_minutes"] > 0 and t["original_estimate_minutes"] for t in issues)


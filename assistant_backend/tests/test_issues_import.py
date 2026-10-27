"""Issue comments (edit/delete), issue history, epic progress and the
CSV issue import."""
import csv
import io

from fastapi import status


def _url(user, path):
    return f"/api/v1/workspaces/{user['workspace_id']}{path}"


def _invite(client, owner, member):
    resp = client.post(_url(owner, "/invite"), headers=owner["headers"], json={"email": member["email"], "role": "member"})
    assert resp.status_code == status.HTTP_200_OK, resp.text


def _board(client, user, name="Web"):
    resp = client.post(_url(user, "/boards/"), headers=user["headers"], json={"name": name})
    assert resp.status_code == status.HTTP_201_CREATED, resp.text
    return resp.json()


def _issue(client, user, **body):
    resp = client.post(_url(user, "/tasks"), headers=user["headers"], json={"task_type": "task", **body})
    assert resp.status_code == status.HTTP_201_CREATED, resp.text
    return resp.json()


def _comment(client, user, ws_user, task_id, content, expect=status.HTTP_201_CREATED):
    resp = client.post(_url(ws_user, "/comments/"), headers=user["headers"], json={"task_id": task_id, "content": content})
    assert resp.status_code == expect, resp.text
    return resp.json()


def test_comment_edit_and_delete_permissions(client, signed_up_user, other_user):
    owner, member = signed_up_user, other_user
    _invite(client, owner, member)
    issue = _issue(client, owner, title="Discuss me")
    first = _comment(client, owner, owner, issue["task_id"], "  Owner's note  ")
    assert first["content"] == "Owner's note" and first["edited"] is False
    second = _comment(client, member, owner, issue["task_id"], "Member reply")
    _comment(client, member, owner, issue["task_id"], "   ", expect=status.HTTP_422_UNPROCESSABLE_ENTITY)

    listed = client.get(_url(owner, f"/comments/tasks/{issue['task_id']}"), headers=member["headers"], params={"order": "oldest"}).json()
    assert [c["content"] for c in listed] == ["Owner's note", "Member reply"]

    # Only the author can reword a comment -- an admin can't either.
    resp = client.put(_url(owner, f"/comments/{second['comment_id']}"), headers=owner["headers"], json={"content": "hijacked"})
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    resp = client.put(_url(owner, f"/comments/{second['comment_id']}"), headers=member["headers"], json={"content": "Member reply, fixed typo"})
    assert resp.status_code == status.HTTP_200_OK and resp.json()["edited"] is True

    # Members can't delete others' comments; admins can moderate.
    resp = client.delete(_url(owner, f"/comments/{first['comment_id']}"), headers=member["headers"])
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    resp = client.delete(_url(owner, f"/comments/{second['comment_id']}"), headers=owner["headers"])
    assert resp.status_code == status.HTTP_204_NO_CONTENT
    listed = client.get(_url(owner, f"/comments/tasks/{issue['task_id']}"), headers=owner["headers"]).json()
    assert [c["comment_id"] for c in listed] == [first["comment_id"]]


def test_comments_on_another_workspace_issue_are_hidden(client, signed_up_user, other_user):
    issue = _issue(client, signed_up_user, title="Private")
    resp = client.get(_url(other_user, f"/comments/tasks/{issue['task_id']}"), headers=other_user["headers"])
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_issue_history_and_epic_progress(client, signed_up_user):
    owner = signed_up_user
    board = _board(client, owner)
    epic = client.post(_url(owner, f"/boards/{board['board_id']}/epics/"), headers=owner["headers"], json={"title": "Launch"}).json()
    done = _issue(client, owner, title="Done one", board_id=board["board_id"], epic_id=epic["epic_id"], story_points=3, status="done")
    _issue(client, owner, title="Open one", board_id=board["board_id"], epic_id=epic["epic_id"], story_points=5)
    _issue(client, owner, title="Child", board_id=board["board_id"], epic_id=epic["epic_id"], parent_task_id=done["task_id"])

    epics = client.get(_url(owner, f"/boards/{board['board_id']}/epics/"), headers=owner["headers"]).json()
    assert {k: epics[0][k] for k in ("issue_count", "done_count", "points_total", "points_done")} == \
        {"issue_count": 2, "done_count": 1, "points_total": 8, "points_done": 3}

    resp = client.put(_url(owner, f"/tasks/{done['task_id']}"), headers=owner["headers"], json={"priority": "high", "story_points": 5})
    assert resp.status_code == status.HTTP_200_OK, resp.text
    history = client.get(_url(owner, "/activities/"), headers=owner["headers"], params={"entity_id": done["task_id"]}).json()
    changes = history[0]["properties"]["changes"]
    assert changes["priority"] == {"from": "medium", "to": "high"}
    assert changes["story_points"] == {"from": 3, "to": 5}
    assert all(a["entity_id"] == done["task_id"] for a in history)


def _export_csv(member_email):
    header = ["Summary", "Issue key", "Issue id", "Issue Type", "Status", "Priority", "Assignee", "Assignee Id",
              "Reporter", "Reporter Id", "Created", "Description", "Labels", "Labels", "Sprint",
              "Custom field (Story Points)", "Parent", "Original Estimate", "Time Spent",
              "Outward issue link (Blocks)", "Comment", "Comment", "Log Work"]
    rows = [
        ["Payments", "PAY-1", "100", "Epic", "In Progress", "High", "", "", "Casey Outside", "acc-casey",
         "02/Sep/26 9:00 AM", "Epic body", "", "", "", "", "", "", "", "", "", "", ""],
        ["Card form", "PAY-2", "101", "Story", "In Review", "Highest", member_email, "acc-member",
         "Casey Outside", "acc-casey", "03/Sep/26 10:00 AM", "h2. Goal\nPay *fast*\n* one\n* two", "web", "checkout",
         "Sprint 4", "5", "100", "28800", "7200", "PAY-3",
         "21/Oct/26 2:15 PM;acc-casey;Looks good; ship it [~accountid:acc-member]",
         "22/Oct/26 9:40 AM;acc-member;Thanks!", "Built form;21/Oct/26 9:00 AM;acc-member;3600"],
        ["API for card form", "PAY-3", "102", "Sub-task", "Done", "Medium", member_email, "acc-member",
         "Casey Outside", "acc-casey", "04/Sep/26 9:00 AM", "", "", "", "", "", "101", "", "", "", "", "", ""],
        ["Old cleanup", "PAY-4", "103", "Task", "Closed", "Low", "", "", "Casey Outside", "acc-casey",
         "01/Aug/26 9:00 AM", "", "", "", "Sprint 3", "2", "", "", "", "", "", "", ""],
    ]
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(header)
    writer.writerows(rows)
    return out.getvalue()


def test_csv_issue_import(client, signed_up_user, other_user):
    owner, member = signed_up_user, other_user
    _invite(client, owner, member)
    board = _board(client, owner, name="Payments")
    url = _url(owner, f"/boards/{board['board_id']}/import")
    data = _export_csv(member["email"])

    # Members can't import; a preview saves nothing.
    assert client.post(url, headers=member["headers"], json={"csv": data}).status_code == status.HTTP_403_FORBIDDEN
    preview = client.post(url, headers=owner["headers"], json={"csv": data, "dry_run": True})
    assert preview.status_code == status.HTTP_200_OK, preview.text
    preview = preview.json()
    assert preview["dry_run"] is True
    assert preview["issues"]["by_type"] == {"epic": 1, "story": 1, "subtask": 1, "task": 1}
    assert preview["created"] == {"issues": 3, "epics": 1, "subtasks": 1, "sprints": 2, "comments": 2, "worklogs": 1, "links": 1}
    assert preview["unmatched_people"] == ["Casey Outside"]
    tasks_url = _url(owner, "/tasks")
    assert client.get(tasks_url, headers=owner["headers"], params={"board_id": board["board_id"]}).json() == []

    result = client.post(url, headers=owner["headers"], json={"csv": data, "dry_run": False}).json()
    assert result["created"] == preview["created"]

    tasks = client.get(tasks_url, headers=owner["headers"], params={"board_id": board["board_id"], "page_size": 50}).json()
    by_key = {t["meta_data"]["imported"]["key"]: t for t in tasks}
    story, sub, old = by_key["PAY-2"], by_key["PAY-3"], by_key["PAY-4"]
    epics = client.get(_url(owner, f"/boards/{board['board_id']}/epics/"), headers=owner["headers"]).json()
    assert [e["title"] for e in epics] == ["Payments"] and epics[0]["status"] == "open"
    assert story["epic_id"] == epics[0]["epic_id"] and sub["epic_id"] == epics[0]["epic_id"]
    assert sub["parent_task_id"] == story["task_id"]
    assert story["status"] == "review" and story["priority"] == "urgent" and old["status"] == "done"
    assert story["assignee_id"] == member["user_id"] and story["story_points"] == 5
    assert story["labels"] == ["web", "checkout"] and story["meta_data"]["issue_type"] == "story"
    assert story["description"] == "<h3>Goal</h3><p>Pay <strong>fast</strong></p><ul><li>one</li><li>two</li></ul>"
    assert story["ticket_key"].startswith(board["key"] + "-")
    assert story["original_estimate_minutes"] == 480 and story["time_spent_minutes"] == 120

    sprints = {s["name"]: s for s in client.get(_url(owner, f"/boards/{board['board_id']}/sprints/"), headers=owner["headers"]).json()}
    assert sprints["Sprint 3"]["status"] == "completed" and sprints["Sprint 4"]["status"] == "planned"
    assert story["sprint_id"] == sprints["Sprint 4"]["sprint_id"] and sub["sprint_id"] == story["sprint_id"]

    comments = client.get(_url(owner, f"/comments/tasks/{story['task_id']}"), headers=owner["headers"], params={"order": "oldest"}).json()
    assert comments[0]["author_name"] == "Casey Outside" and comments[0]["user_id"] == owner["user_id"]
    assert comments[0]["content"] == "Looks good; ship it @Pytest User"
    assert comments[1]["author_name"] is None and comments[1]["user_id"] == member["user_id"]
    assert comments[0]["created_at"].startswith("2026-10-21T14:15")

    worklogs = client.get(_url(owner, f"/tasks/{story['task_id']}/worklogs"), headers=owner["headers"]).json()["worklogs"]
    assert [(w["user_id"], w["duration_minutes"], w["work_date"]) for w in worklogs] == [(member["user_id"], 60, "2026-10-21")]

    links = client.get(_url(owner, f"/tasks/{story['task_id']}/links"), headers=owner["headers"]).json()
    assert [(l["link_type"], l["related_task"]["task_id"]) for l in links] == [("blocks", sub["task_id"])]

    # Importing the same file again doesn't duplicate anything.
    again = client.post(url, headers=owner["headers"], json={"csv": data, "dry_run": False}).json()
    assert again["created"]["issues"] == 0 and again["created"]["epics"] == 0 and again["skipped_count"] == 4


def test_import_rejects_files_that_are_not_issue_exports(client, signed_up_user):
    owner = signed_up_user
    board = _board(client, owner)
    url = _url(owner, f"/boards/{board['board_id']}/import")
    resp = client.post(url, headers=owner["headers"], json={"csv": "name,email\nA,a@example.com\n"})
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "Summary" in resp.json()["detail"]

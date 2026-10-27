"""Worklogs, estimates, timesheets, workload schemes, time off and
sprint capacity."""
from datetime import date, timedelta

from fastapi import status


def _invite(client, owner, member):
    resp = client.post(f"/api/v1/workspaces/{owner['workspace_id']}/invite", headers=owner["headers"],
                       json={"email": member["email"], "role": "member"})
    assert resp.status_code == status.HTTP_200_OK, resp.text


def _url(user, path):
    return f"/api/v1/workspaces/{user['workspace_id']}{path}"


def _issue(client, user, **body):
    resp = client.post(_url(user, "/tasks"), headers=user["headers"], json={"task_type": "task", **body})
    assert resp.status_code == status.HTTP_201_CREATED, resp.text
    return resp.json()


def _log(client, user, ws_user, task_id, minutes, work_date=None, expect=status.HTTP_201_CREATED, **extra):
    resp = client.post(_url(ws_user, f"/tasks/{task_id}/worklogs"), headers=user["headers"], json={
        "work_date": (work_date or date.today()).isoformat(), "duration_minutes": minutes, **extra,
    })
    assert resp.status_code == expect, resp.text
    return resp.json()


def _monday(day=None):
    day = day or date.today()
    return day - timedelta(days=day.weekday())


def test_logging_work_counts_down_the_estimate(client, signed_up_user):
    owner = signed_up_user
    issue = _issue(client, owner, title="Build export", original_estimate_minutes=480)
    assert issue["original_estimate_minutes"] == 480
    assert issue["remaining_estimate_minutes"] == 480 and issue["time_spent_minutes"] == 0

    logged = _log(client, owner, owner, issue["task_id"], 90, description="Spike")
    assert logged["task"] == {"task_id": issue["task_id"], "original_estimate_minutes": 480,
                              "remaining_estimate_minutes": 390, "time_spent_minutes": 90}
    assert logged["worklog"]["ticket_key"] == issue["ticket_key"]

    # Re-estimating the remaining time sticks, and later logs count it down.
    est = client.put(_url(owner, f"/tasks/{issue['task_id']}/estimate"), headers=owner["headers"],
                     json={"remaining_estimate_minutes": 600})
    assert est.json()["remaining_estimate_minutes"] == 600
    second = _log(client, owner, owner, issue["task_id"], 60)
    assert second["task"]["remaining_estimate_minutes"] == 540 and second["task"]["time_spent_minutes"] == 150

    # Editing and deleting a worklog give the time back.
    wid = second["worklog"]["worklog_id"]
    edited = client.put(_url(owner, f"/worklogs/{wid}"), headers=owner["headers"], json={"duration_minutes": 30})
    assert edited.json()["task"]["time_spent_minutes"] == 120 and edited.json()["task"]["remaining_estimate_minutes"] == 570
    deleted = client.delete(_url(owner, f"/worklogs/{wid}"), headers=owner["headers"])
    assert deleted.json()["task"]["time_spent_minutes"] == 90

    # Clearing the remaining estimate goes back to original minus spent.
    reset = client.put(_url(owner, f"/tasks/{issue['task_id']}/estimate"), headers=owner["headers"],
                       json={"remaining_estimate_minutes": None})
    assert reset.json()["remaining_estimate_minutes"] == 390

    fetched = client.get(_url(owner, f"/tasks/{issue['task_id']}"), headers=owner["headers"]).json()
    assert fetched["time_spent_minutes"] == 90 and fetched["remaining_estimate_minutes"] == 390
    worklogs = client.get(_url(owner, f"/tasks/{issue['task_id']}/worklogs"), headers=owner["headers"]).json()["worklogs"]
    assert [w["duration_minutes"] for w in worklogs] == [90] and worklogs[0]["description"] == "Spike"


def test_worklog_validation(client, signed_up_user):
    owner = signed_up_user
    issue = _issue(client, owner, title="Validate me")
    _log(client, owner, owner, issue["task_id"], 0, expect=status.HTTP_422_UNPROCESSABLE_ENTITY)
    _log(client, owner, owner, issue["task_id"], 24 * 60 + 1, expect=status.HTTP_422_UNPROCESSABLE_ENTITY)
    _log(client, owner, owner, issue["task_id"], 60, work_date=date.today() + timedelta(days=5),
         expect=status.HTTP_422_UNPROCESSABLE_ENTITY)
    note = client.post(_url(owner, "/tasks"), headers=owner["headers"], json={"title": "n", "task_type": "note"}).json()
    _log(client, owner, owner, note["task_id"], 30, expect=status.HTTP_422_UNPROCESSABLE_ENTITY)


def test_only_author_or_admin_changes_a_worklog(client, signed_up_user, other_user):
    owner, member = signed_up_user, other_user
    _invite(client, owner, member)
    issue = _issue(client, owner, title="Shared work")
    owner_log = _log(client, owner, owner, issue["task_id"], 60)["worklog"]
    member_log = _log(client, member, owner, issue["task_id"], 45)["worklog"]
    assert member_log["user_id"] == member["user_id"]

    resp = client.delete(_url(owner, f"/worklogs/{owner_log['worklog_id']}"), headers=member["headers"])
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    # The workspace owner can fix a teammate's log, and log on their behalf.
    resp = client.put(_url(owner, f"/worklogs/{member_log['worklog_id']}"), headers=owner["headers"],
                      json={"description": "Pairing"})
    assert resp.status_code == status.HTTP_200_OK, resp.text
    _log(client, owner, owner, issue["task_id"], 30, user_id=member["user_id"])
    _log(client, member, owner, issue["task_id"], 30, user_id=owner["user_id"], expect=status.HTTP_403_FORBIDDEN)


def test_outsider_cannot_see_or_log_time(client, signed_up_user, other_user):
    owner, outsider = signed_up_user, other_user
    issue = _issue(client, owner, title="Private to the workspace")
    _log(client, outsider, owner, issue["task_id"], 30, expect=status.HTTP_403_FORBIDDEN)
    resp = client.get(_url(owner, "/timesheet/team"), headers=outsider["headers"],
                      params={"start": "2026-11-02", "end": "2026-11-08"})
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    # A worklog id from another workspace isn't reachable through your own.
    wid = _log(client, owner, owner, issue["task_id"], 30)["worklog"]["worklog_id"]
    resp = client.delete(_url(outsider, f"/worklogs/{wid}"), headers=outsider["headers"])
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_timesheet_days_follow_scheme_and_time_off(client, signed_up_user, other_user):
    owner, member = signed_up_user, other_user
    _invite(client, owner, member)
    monday = _monday() - timedelta(days=7)  # last week, so every day is loggable
    sunday = monday + timedelta(days=6)

    # Member works 6h Mon-Thu; owner keeps the 8h Mon-Fri default.
    resp = client.put(_url(owner, f"/capacity/members/{member['user_id']}"), headers=owner["headers"],
                      json={"minutes_per_day": 360, "working_days": [0, 1, 2, 3]})
    assert resp.status_code == status.HTTP_200_OK, resp.text
    resp = client.put(_url(owner, f"/capacity/members/{owner['user_id']}"), headers=member["headers"],
                      json={"minutes_per_day": 60, "working_days": [0]})
    assert resp.status_code == status.HTTP_403_FORBIDDEN  # members can't change schemes

    # Member takes Tuesday off; the owner declares Wednesday a holiday for everyone.
    tue, wed = monday + timedelta(days=1), monday + timedelta(days=2)
    resp = client.post(_url(owner, "/time-off"), headers=member["headers"], json={
        "user_id": member["user_id"], "start_date": tue.isoformat(), "end_date": tue.isoformat(), "kind": "sick"})
    assert resp.status_code == status.HTTP_201_CREATED, resp.text
    resp = client.post(_url(owner, "/time-off"), headers=member["headers"], json={
        "start_date": wed.isoformat(), "end_date": wed.isoformat(), "kind": "holiday"})
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    resp = client.post(_url(owner, "/time-off"), headers=owner["headers"], json={
        "start_date": wed.isoformat(), "end_date": wed.isoformat(), "kind": "holiday", "note": "Founders day"})
    assert resp.status_code == status.HTTP_201_CREATED and resp.json()["user_name"] == "Everyone"

    issue = _issue(client, owner, title="Timesheet work")
    _log(client, member, owner, issue["task_id"], 300, work_date=monday)
    _log(client, member, owner, issue["task_id"], 60, work_date=monday)

    sheet = client.get(_url(owner, "/timesheet"), headers=member["headers"],
                       params={"start": monday.isoformat(), "end": sunday.isoformat()}).json()
    days = {d["date"]: d for d in sheet["days"]}
    assert [days[(monday + timedelta(days=i)).isoformat()]["capacity_minutes"] for i in range(7)] == [360, 0, 0, 360, 0, 0, 0]
    assert days[tue.isoformat()]["time_off"] == "sick" and days[wed.isoformat()]["time_off"] == "holiday"
    assert days[monday.isoformat()]["logged_minutes"] == 360
    assert sheet["total_logged_minutes"] == 360 and sheet["total_capacity_minutes"] == 720
    assert len(sheet["worklogs"]) == 2

    team = client.get(_url(owner, "/timesheet/team"), headers=owner["headers"],
                      params={"start": monday.isoformat(), "end": sunday.isoformat()}).json()
    by_user = {m["user_id"]: m for m in team["members"]}
    assert set(by_user) == {owner["user_id"], member["user_id"]}  # the owner counts as a member
    assert by_user[owner["user_id"]]["role"] == "owner"
    assert by_user[owner["user_id"]]["total_capacity_minutes"] == 4 * 480  # holiday on Wednesday
    assert by_user[member["user_id"]]["total_logged_minutes"] == 360

    resp = client.get(_url(owner, "/timesheet"), headers=owner["headers"],
                      params={"start": monday.isoformat(), "end": (monday + timedelta(days=90)).isoformat()})
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_sprint_workload(client, signed_up_user, other_user):
    owner, member = signed_up_user, other_user
    _invite(client, owner, member)
    board = client.post(_url(owner, "/boards/"), headers=owner["headers"], json={"name": "Capacity Board"}).json()
    start = _monday() + timedelta(days=7)  # next week: the whole sprint is still ahead
    sprint = client.post(_url(owner, f"/boards/{board['board_id']}/sprints/"), headers=owner["headers"], json={
        "name": "Sprint 1", "start_date": f"{start.isoformat()}T00:00:00Z",
        "end_date": f"{(start + timedelta(days=11)).isoformat()}T00:00:00Z"}).json()

    def sprint_issue(title, assignee=None, estimate=None, **extra):
        return _issue(client, owner, title=title, board_id=board["board_id"], sprint_id=sprint["sprint_id"],
                      assignee_id=assignee, original_estimate_minutes=estimate, **extra)

    sprint_issue("Owner A", owner["user_id"], 600, story_points=3)
    sprint_issue("Owner B", owner["user_id"], 300)
    sprint_issue("Member A", member["user_id"], 1200)
    sprint_issue("Member unestimated", member["user_id"])
    sprint_issue("Member done", member["user_id"], 480, status="done")
    sprint_issue("Nobody's", None, 120)
    client.post(_url(owner, "/time-off"), headers=member["headers"], json={
        "user_id": member["user_id"], "start_date": start.isoformat(),
        "end_date": (start + timedelta(days=1)).isoformat(), "kind": "vacation"})

    sprints = client.get(_url(owner, "/capacity/sprints"), headers=member["headers"]).json()
    assert sprint["sprint_id"] in [s["sprint_id"] for s in sprints]

    load = client.get(_url(owner, f"/capacity/sprints/{sprint['sprint_id']}"), headers=member["headers"]).json()
    by_user = {m["user_id"]: m for m in load["members"]}
    mine, theirs = by_user[owner["user_id"]], by_user[member["user_id"]]
    # Mon..Fri of the second week: 10 working days for the owner, 8 for the member.
    assert mine["remaining_capacity_minutes"] == 10 * 480
    assert theirs["remaining_capacity_minutes"] == 8 * 480 and len(theirs["days_off"]) == 2
    assert mine["allocated_minutes"] == 900 and mine["story_points"] == 3 and mine["issue_count"] == 2
    assert theirs["allocated_minutes"] == 1200 and theirs["unestimated_count"] == 1
    assert theirs["open_issue_count"] == 2 and theirs["issue_count"] == 3
    assert theirs["load_percent"] == round(100 * 1200 / (8 * 480))
    assert load["unassigned"]["allocated_minutes"] == 120
    assert load["totals"]["allocated_minutes"] == 900 + 1200 + 120

    other_ws = client.get(f"/api/v1/workspaces/{member['workspace_id']}/capacity/sprints/{sprint['sprint_id']}",
                          headers=member["headers"])
    assert other_ws.status_code == status.HTTP_404_NOT_FOUND


def test_members_only_see_their_own_hours(client, signed_up_user, other_user):
    """Hours someone logged and why they're off are private to them and
    workspace admins; planning data (estimates, capacity, being away)
    is shared."""
    owner, member = signed_up_user, other_user
    _invite(client, owner, member)
    week = {"start": (_monday() - timedelta(days=7)).isoformat(), "end": (_monday() - timedelta(days=1)).isoformat()}
    issue = _issue(client, owner, title="Shared issue", original_estimate_minutes=600)
    _log(client, owner, owner, issue["task_id"], 120, work_date=_monday() - timedelta(days=7))
    _log(client, member, owner, issue["task_id"], 60, work_date=_monday() - timedelta(days=7))

    # Someone else's timesheet and the team view are admin-only.
    resp = client.get(_url(owner, "/timesheet"), headers=member["headers"], params={**week, "user_id": owner["user_id"]})
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    resp = client.get(_url(owner, "/timesheet/team"), headers=member["headers"], params=week)
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert client.get(_url(owner, "/timesheet"), headers=member["headers"], params=week).status_code == status.HTTP_200_OK
    resp = client.get(_url(owner, "/timesheet"), headers=owner["headers"], params={**week, "user_id": member["user_id"]})
    assert resp.status_code == status.HTTP_200_OK and resp.json()["total_logged_minutes"] == 60

    # On the issue: a member sees only their own worklogs, but the total.
    mine = client.get(_url(owner, f"/tasks/{issue['task_id']}/worklogs"), headers=member["headers"]).json()
    assert mine["can_view_all"] is False
    assert [w["user_id"] for w in mine["worklogs"]] == [member["user_id"]]
    everyone = client.get(_url(owner, f"/tasks/{issue['task_id']}/worklogs"), headers=owner["headers"]).json()
    assert everyone["can_view_all"] is True and len(everyone["worklogs"]) == 2
    task = client.get(_url(owner, f"/tasks/{issue['task_id']}"), headers=member["headers"]).json()
    assert task["time_spent_minutes"] == 180

    # Time off: teammates see that the owner is away, not that they're sick.
    day = (_monday() + timedelta(days=7)).isoformat()
    client.post(_url(owner, "/time-off"), headers=owner["headers"], json={
        "user_id": owner["user_id"], "start_date": day, "end_date": day, "kind": "sick", "note": "Dentist"})
    client.post(_url(owner, "/time-off"), headers=owner["headers"], json={
        "start_date": day, "end_date": day, "kind": "holiday", "note": "Founders day"})
    span = {"start": day, "end": day}
    seen = {(e["user_id"], e["kind"], e["note"]) for e in
            client.get(_url(owner, "/time-off"), headers=member["headers"], params=span).json()}
    assert seen == {(owner["user_id"], "away", None), (None, "holiday", "Founders day")}
    own = client.get(_url(owner, "/time-off"), headers=owner["headers"], params=span).json()
    assert ("sick", "Dentist") in {(e["kind"], e["note"]) for e in own}

    # Sprint workload: planning numbers for all, logged hours only your own.
    board = client.post(_url(owner, "/boards/"), headers=owner["headers"], json={"name": "Private Board"}).json()
    sprint = client.post(_url(owner, f"/boards/{board['board_id']}/sprints/"), headers=owner["headers"], json={
        "name": "S", "start_date": f"{_monday().isoformat()}T00:00:00Z",
        "end_date": f"{(_monday() + timedelta(days=11)).isoformat()}T00:00:00Z"}).json()
    client.put(_url(owner, f"/tasks/{issue['task_id']}"), headers=owner["headers"],
               json={"board_id": board["board_id"], "sprint_id": sprint["sprint_id"], "assignee_id": owner["user_id"]})
    load = client.get(_url(owner, f"/capacity/sprints/{sprint['sprint_id']}"), headers=member["headers"]).json()
    rows = {m["user_id"]: m for m in load["members"]}
    assert rows[owner["user_id"]]["logged_minutes"] is None and rows[member["user_id"]]["logged_minutes"] == 60
    assert rows[owner["user_id"]]["allocated_minutes"] == 600 - 180
    assert all(d["kind"] == "away" for d in rows[owner["user_id"]]["days_off"] if d["kind"] != "holiday")
    assert load["totals"]["logged_minutes"] is None and load["can_view_all"] is False
    admin_view = client.get(_url(owner, f"/capacity/sprints/{sprint['sprint_id']}"), headers=owner["headers"]).json()
    assert admin_view["members"][0]["logged_minutes"] is not None and admin_view["totals"]["logged_minutes"] == 180

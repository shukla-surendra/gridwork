"""The calendar feed: shared events, private focus blocks, due dates,
reminders and sprints for one visible range."""
from fastapi import status

RANGE = {"start": "2026-11-01T00:00:00Z", "end": "2026-12-01T00:00:00Z"}


def _invite(client, owner, member):
    resp = client.post(f"/api/v1/workspaces/{owner['workspace_id']}/invite", headers=owner["headers"],
                       json={"email": member["email"], "role": "member"})
    assert resp.status_code == status.HTTP_200_OK, resp.text


def _calendar(client, user, ws, **params):
    resp = client.get(f"/api/v1/workspaces/{ws}/calendar", headers=user["headers"], params={**RANGE, **params})
    assert resp.status_code == status.HTTP_200_OK, resp.text
    return {(e["kind"], e["title"]): e for e in resp.json()}


def _task(client, user, ws, **body):
    resp = client.post(f"/api/v1/workspaces/{ws}/tasks", headers=user["headers"], json=body)
    assert resp.status_code == status.HTTP_201_CREATED, resp.text
    return resp.json()


def test_feed_shows_events_focus_due_and_reminders(client, signed_up_user, other_user):
    owner, member = signed_up_user, other_user
    ws = owner["workspace_id"]
    _invite(client, owner, member)

    event = _task(client, owner, ws, title="Planning", task_type="meeting",
                  start_time="2026-11-10T09:00:00Z", end_time="2026-11-10T10:00:00Z",
                  meta_data={"location": "Room 1", "color": "#805AD5"}, watchers=[member["user_id"]])
    assert event["ticket_key"] is None  # events aren't work items
    _task(client, owner, ws, title="Deep work", task_type="time_block",
          start_time="2026-11-11T13:00:00Z", end_time="2026-11-11T15:00:00Z")
    issue = _task(client, owner, ws, title="Ship it", task_type="task", due_on="2026-11-20T00:00:00Z")
    _task(client, owner, ws, title="Outside range", task_type="meeting",
          start_time="2026-12-05T09:00:00Z", end_time="2026-12-05T10:00:00Z")
    client.post(f"/api/v1/workspaces/{ws}/reminders/", headers=owner["headers"],
                json={"title": "Renew domain", "due_date": "2026-11-15T08:00:00Z"})

    mine = _calendar(client, owner, ws)
    assert set(mine) == {("event", "Planning"), ("focus", "Deep work"), ("due", "Ship it"), ("reminder", "Renew domain")}
    planning = mine[("event", "Planning")]
    assert planning["start"].startswith("2026-11-10T09:00:00") and planning["start"].endswith("+00:00")
    assert planning["location"] == "Room 1" and planning["attendees"] == [member["user_id"]]
    assert mine[("due", "Ship it")]["ticket_key"] == issue["ticket_key"]

    # A teammate sees the shared event and due date, not the owner's focus block or reminder.
    assert set(_calendar(client, member, ws)) == {("event", "Planning"), ("due", "Ship it")}


def test_event_spanning_range_start_is_included(client, signed_up_user):
    ws = signed_up_user["workspace_id"]
    _task(client, signed_up_user, ws, title="Offsite", task_type="meeting",
          start_time="2026-10-31T20:00:00Z", end_time="2026-11-01T02:00:00Z")
    assert ("event", "Offsite") in _calendar(client, signed_up_user, ws)


def test_rescheduling_moves_an_event(client, signed_up_user):
    ws = signed_up_user["workspace_id"]
    event = _task(client, signed_up_user, ws, title="1:1", task_type="meeting",
                  start_time="2026-11-03T09:00:00Z", end_time="2026-11-03T09:30:00Z")
    resp = client.put(f"/api/v1/workspaces/{ws}/tasks/{event['task_id']}", headers=signed_up_user["headers"],
                      json={"start_time": "2026-11-04T10:00:00Z", "end_time": "2026-11-04T10:30:00Z"})
    assert resp.status_code == status.HTTP_200_OK, resp.text
    assert _calendar(client, signed_up_user, ws)[("event", "1:1")]["start"].startswith("2026-11-04T10:00:00")


def test_range_is_validated_and_membership_required(client, signed_up_user, other_user):
    ws = signed_up_user["workspace_id"]
    h = signed_up_user["headers"]
    url = f"/api/v1/workspaces/{ws}/calendar"
    assert client.get(url, headers=h, params={"start": "2026-11-02T00:00:00Z", "end": "2026-11-01T00:00:00Z"}).status_code == 422
    assert client.get(url, headers=h, params={"start": "2026-01-01T00:00:00Z", "end": "2026-12-01T00:00:00Z"}).status_code == 422
    assert client.get(url, headers=other_user["headers"], params=RANGE).status_code in (403, 404)


def test_reminders_are_private_and_reschedule_rearms(client, signed_up_user, other_user):
    owner, member = signed_up_user, other_user
    ws = owner["workspace_id"]
    _invite(client, owner, member)
    base = f"/api/v1/workspaces/{ws}/reminders/"
    rid = client.post(base, headers=owner["headers"], json={"title": "Pay", "due_date": "2020-01-01T00:00:00Z"}).json()["reminder_id"]

    assert client.put(f"{base}{rid}", headers=member["headers"], json={"title": "hijacked"}).status_code == status.HTTP_404_NOT_FOUND
    assert client.delete(f"{base}{rid}", headers=member["headers"]).status_code == status.HTTP_404_NOT_FOUND

    notes = f"/api/v1/workspaces/{ws}/notifications/"
    assert len(client.get(notes, headers=owner["headers"]).json()) == 1  # delivered once
    client.put(f"{base}{rid}", headers=owner["headers"], json={"due_date": "2020-02-01T00:00:00Z"})
    assert len(client.get(notes, headers=owner["headers"]).json()) == 2  # moved, so it fires again

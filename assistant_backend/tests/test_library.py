from fastapi import status


def _enable_library(client, workspace_id, headers):
    resp = client.put(
        f"/api/v1/workspaces/{workspace_id}/modules/library",
        headers=headers,
        json={"enabled": True},
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text


def _create_seat(client, workspace_id, headers, seat_number="A1"):
    resp = client.post(
        f"/api/v1/workspaces/{workspace_id}/library/seats",
        headers=headers,
        json={"seat_number": seat_number, "section": "Silent Zone"},
    )
    assert resp.status_code == status.HTTP_201_CREATED, resp.text
    return resp.json()


def _create_shift(client, workspace_id, headers, name="Morning"):
    resp = client.post(
        f"/api/v1/workspaces/{workspace_id}/library/shifts",
        headers=headers,
        json={"name": name, "start_time": "06:00:00", "end_time": "14:00:00"},
    )
    assert resp.status_code == status.HTTP_201_CREATED, resp.text
    return resp.json()


def _create_member(client, workspace_id, headers, name="Asha Patel"):
    resp = client.post(
        f"/api/v1/workspaces/{workspace_id}/library/members",
        headers=headers,
        json={"name": name, "phone": "9990001111", "joined_on": "2026-09-01"},
    )
    assert resp.status_code == status.HTTP_201_CREATED, resp.text
    return resp.json()


def test_seat_shift_member_crud(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    _enable_library(client, workspace_id, headers)

    seat = _create_seat(client, workspace_id, headers, "A1")

    duplicate_seat = client.post(
        f"/api/v1/workspaces/{workspace_id}/library/seats",
        headers=headers,
        json={"seat_number": "A1"},
    )
    assert duplicate_seat.status_code == status.HTTP_400_BAD_REQUEST

    listed = client.get(f"/api/v1/workspaces/{workspace_id}/library/seats", headers=headers)
    assert seat["seat_id"] in [s["seat_id"] for s in listed.json()]

    updated = client.put(
        f"/api/v1/workspaces/{workspace_id}/library/seats/{seat['seat_id']}",
        headers=headers,
        json={"is_active": False},
    )
    assert updated.status_code == status.HTTP_200_OK, updated.text
    assert updated.json()["is_active"] is False

    shift = _create_shift(client, workspace_id, headers)
    assert shift["is_full_day"] is False

    member = _create_member(client, workspace_id, headers)
    assert member["status"] == "active"

    deleted = client.delete(f"/api/v1/workspaces/{workspace_id}/library/members/{member['member_id']}", headers=headers)
    assert deleted.status_code == status.HTTP_204_NO_CONTENT

    got_deleted = client.get(f"/api/v1/workspaces/{workspace_id}/library/members/{member['member_id']}", headers=headers)
    assert got_deleted.status_code == status.HTTP_404_NOT_FOUND


def test_booking_conflict_on_same_seat_and_shift(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    _enable_library(client, workspace_id, headers)

    seat = _create_seat(client, workspace_id, headers)
    shift = _create_shift(client, workspace_id, headers)
    member_a = _create_member(client, workspace_id, headers, "Member A")
    member_b = _create_member(client, workspace_id, headers, "Member B")

    booking = client.post(
        f"/api/v1/workspaces/{workspace_id}/library/bookings",
        headers=headers,
        json={
            "member_id": member_a["member_id"],
            "seat_id": seat["seat_id"],
            "shift_id": shift["shift_id"],
            "start_date": "2026-09-01",
            "end_date": "2026-09-30",
            "fee_amount": 1500,
        },
    )
    assert booking.status_code == status.HTTP_201_CREATED, booking.text
    assert booking.json()["status"] == "active"
    assert booking.json()["payment_status"] == "pending"

    # Overlapping date range on the same seat+shift must be rejected.
    conflicting = client.post(
        f"/api/v1/workspaces/{workspace_id}/library/bookings",
        headers=headers,
        json={
            "member_id": member_b["member_id"],
            "seat_id": seat["seat_id"],
            "shift_id": shift["shift_id"],
            "start_date": "2026-09-15",
            "end_date": "2026-10-15",
        },
    )
    assert conflicting.status_code == status.HTTP_400_BAD_REQUEST

    # A non-overlapping date range on the same seat+shift is fine.
    later = client.post(
        f"/api/v1/workspaces/{workspace_id}/library/bookings",
        headers=headers,
        json={
            "member_id": member_b["member_id"],
            "seat_id": seat["seat_id"],
            "shift_id": shift["shift_id"],
            "start_date": "2026-10-01",
            "end_date": "2026-10-31",
        },
    )
    assert later.status_code == status.HTTP_201_CREATED, later.text

    # A different shift on the same seat, same dates, is also fine.
    other_shift = _create_shift(client, workspace_id, headers, "Evening")
    other_shift_booking = client.post(
        f"/api/v1/workspaces/{workspace_id}/library/bookings",
        headers=headers,
        json={
            "member_id": member_b["member_id"],
            "seat_id": seat["seat_id"],
            "shift_id": other_shift["shift_id"],
            "start_date": "2026-09-01",
            "end_date": "2026-09-30",
        },
    )
    assert other_shift_booking.status_code == status.HTTP_201_CREATED, other_shift_booking.text


def test_cancelling_a_booking_frees_the_seat(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    _enable_library(client, workspace_id, headers)

    seat = _create_seat(client, workspace_id, headers)
    shift = _create_shift(client, workspace_id, headers)
    member = _create_member(client, workspace_id, headers)

    booking = client.post(
        f"/api/v1/workspaces/{workspace_id}/library/bookings",
        headers=headers,
        json={
            "member_id": member["member_id"],
            "seat_id": seat["seat_id"],
            "shift_id": shift["shift_id"],
            "start_date": "2026-09-01",
            "end_date": "2026-09-30",
        },
    ).json()

    cancelled = client.post(f"/api/v1/workspaces/{workspace_id}/library/bookings/{booking['booking_id']}/cancel", headers=headers)
    assert cancelled.status_code == status.HTTP_200_OK, cancelled.text
    assert cancelled.json()["status"] == "cancelled"

    rebooked = client.post(
        f"/api/v1/workspaces/{workspace_id}/library/bookings",
        headers=headers,
        json={
            "member_id": member["member_id"],
            "seat_id": seat["seat_id"],
            "shift_id": shift["shift_id"],
            "start_date": "2026-09-10",
            "end_date": "2026-09-20",
        },
    )
    assert rebooked.status_code == status.HTTP_201_CREATED, rebooked.text


def test_seat_map_reflects_active_bookings(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    _enable_library(client, workspace_id, headers)

    occupied_seat = _create_seat(client, workspace_id, headers, "A1")
    free_seat = _create_seat(client, workspace_id, headers, "A2")
    shift = _create_shift(client, workspace_id, headers)
    member = _create_member(client, workspace_id, headers)

    client.post(
        f"/api/v1/workspaces/{workspace_id}/library/bookings",
        headers=headers,
        json={
            "member_id": member["member_id"],
            "seat_id": occupied_seat["seat_id"],
            "shift_id": shift["shift_id"],
            "start_date": "2026-09-01",
            "end_date": "2026-09-30",
        },
    )

    seat_map = client.get(
        f"/api/v1/workspaces/{workspace_id}/library/seat-map",
        headers=headers,
        params={"shift_id": shift["shift_id"], "on_date": "2026-09-15"},
    )
    assert seat_map.status_code == status.HTTP_200_OK, seat_map.text
    by_seat = {row["seat_id"]: row for row in seat_map.json()}
    assert by_seat[occupied_seat["seat_id"]]["is_occupied"] is True
    assert by_seat[occupied_seat["seat_id"]]["member_name"] == member["name"]
    assert by_seat[free_seat["seat_id"]]["is_occupied"] is False

    # Outside the booking's date range, the seat is free again.
    seat_map_before = client.get(
        f"/api/v1/workspaces/{workspace_id}/library/seat-map",
        headers=headers,
        params={"shift_id": shift["shift_id"], "on_date": "2026-08-15"},
    )
    by_seat_before = {row["seat_id"]: row for row in seat_map_before.json()}
    assert by_seat_before[occupied_seat["seat_id"]]["is_occupied"] is False


def test_check_in_check_out_and_mark_absent(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    _enable_library(client, workspace_id, headers)

    seat = _create_seat(client, workspace_id, headers)
    shift = _create_shift(client, workspace_id, headers)
    member = _create_member(client, workspace_id, headers)

    booking = client.post(
        f"/api/v1/workspaces/{workspace_id}/library/bookings",
        headers=headers,
        json={
            "member_id": member["member_id"],
            "seat_id": seat["seat_id"],
            "shift_id": shift["shift_id"],
            "start_date": "2026-09-01",
            "end_date": "2026-09-30",
        },
    ).json()

    check_in = client.post(
        f"/api/v1/workspaces/{workspace_id}/library/attendance/check-in",
        headers=headers,
        json={"booking_id": booking["booking_id"], "on_date": "2026-09-05"},
    )
    assert check_in.status_code == status.HTTP_201_CREATED, check_in.text
    assert check_in.json()["status"] == "present"
    assert check_in.json()["check_in_at"] is not None

    check_out = client.post(
        f"/api/v1/workspaces/{workspace_id}/library/attendance/{booking['booking_id']}/check-out",
        headers=headers,
        params={"on_date": "2026-09-05"},
    )
    assert check_out.status_code == status.HTTP_200_OK, check_out.text
    assert check_out.json()["check_out_at"] is not None

    # A date outside the booking's range is rejected.
    out_of_range = client.post(
        f"/api/v1/workspaces/{workspace_id}/library/attendance/check-in",
        headers=headers,
        json={"booking_id": booking["booking_id"], "on_date": "2026-10-05"},
    )
    assert out_of_range.status_code == status.HTTP_400_BAD_REQUEST

    absent = client.post(
        f"/api/v1/workspaces/{workspace_id}/library/attendance/mark-absent",
        headers=headers,
        json={"booking_id": booking["booking_id"], "on_date": "2026-09-06"},
    )
    assert absent.status_code == status.HTTP_201_CREATED, absent.text
    assert absent.json()["status"] == "absent"

    history = client.get(
        f"/api/v1/workspaces/{workspace_id}/library/attendance",
        headers=headers,
        params={"member_id": member["member_id"]},
    )
    assert history.status_code == status.HTTP_200_OK, history.text
    statuses_by_date = {row["on_date"]: row["status"] for row in history.json()}
    assert statuses_by_date["2026-09-05"] == "present"
    assert statuses_by_date["2026-09-06"] == "absent"


def test_library_module_disabled_by_default(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    # A fresh workspace hasn't opted in yet -- library is a brand-new
    # module (default_enabled=False), unlike the adopted always-on ones.
    resp = client.get(f"/api/v1/workspaces/{workspace_id}/library/seats", headers=headers)
    assert resp.status_code == status.HTTP_403_FORBIDDEN

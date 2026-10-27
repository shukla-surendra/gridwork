from fastapi import status

NEW = "N3w-Passw0rd!"


def _change(client, user, current, new):
    return client.post("/api/v1/users/me/password", headers=user["headers"],
                       json={"current_password": current, "new_password": new})


def test_change_password_then_login_with_new_one(client, signed_up_user):
    resp = _change(client, signed_up_user, signed_up_user["password"], NEW)
    assert resp.status_code == status.HTTP_200_OK, resp.text

    old = client.post("/api/v1/users/login", json={"email": signed_up_user["email"], "password": signed_up_user["password"]})
    assert old.status_code != status.HTTP_200_OK
    new = client.post("/api/v1/users/login", json={"email": signed_up_user["email"], "password": NEW})
    assert new.status_code == status.HTTP_200_OK, new.text


def test_wrong_current_password_is_rejected(client, signed_up_user):
    resp = _change(client, signed_up_user, "not-my-password", NEW)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "incorrect" in resp.json()["detail"].lower()


def test_weak_or_unchanged_new_password_is_rejected(client, signed_up_user):
    weak = _change(client, signed_up_user, signed_up_user["password"], "short")
    assert weak.status_code == status.HTTP_400_BAD_REQUEST
    same = _change(client, signed_up_user, signed_up_user["password"], signed_up_user["password"])
    assert same.status_code == status.HTTP_400_BAD_REQUEST


def test_change_password_requires_auth(client):
    resp = client.post("/api/v1/users/me/password", json={"current_password": "a", "new_password": NEW})
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

"""
Runs against the real local Postgres (the same 'productify' DB docker-compose
brings up) rather than a mocked DB or a separate async test DB.

Why: the whole app is synchronous (plain SQLAlchemy Session + psycopg2), not
async — handlers each open their own SessionLocal() bound to a single
module-level engine created at import time from config.database_url. That
means DATABASE_URL can't be swapped per-test via env vars or FastAPI
dependency overrides (most routers don't even use Depends(get_db) — they
instantiate handlers directly, which bind to the real engine themselves).
A previous version of this file tried an async engine against a separate
'postgres' database with asyncpg; that dependency was never installed in
the image and the paths didn't match anything real. See PROGRESS notes for
the case-sensitivity bug in config.py (Settings.Config.case_sensitive=True
against lowercase field names) that makes DB_* env-var overrides silently
no-op — that's why "point tests at a separate DB via env var" isn't a
realistic option right now without fixing that first.

Tradeoff accepted deliberately: init_db() (drop_all + create_all) runs once
per test session for a clean slate, and every test creates its own
uniquely-emailed user, so tests don't collide with each other or with
whatever the interactive dev backend currently has in the DB. Don't run
this against a database that has real data you care about.

Schema creation is Alembic's job in the app itself now (main.py's startup
event no longer calls init_db() -- see PROGRESS notes on why rebuilding the
schema on every app boot was actively destructive). Tests still want a full
disposable reset, so this file calls init_db() directly instead of relying
on it happening as a side effect of app startup.
"""
import uuid

import pytest
import redis
from fastapi.testclient import TestClient

from adapters.orm.models.database import init_db
from config import settings
from main import app


@pytest.fixture(scope="session")
def client():
    init_db()  # drop_all + create_all -- one clean-slate reset for the whole test run
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    """Redis is used by this app for nothing but rate limiting (middleware/
    rate_limit.py), so flushing it is safe. Needed because every request from
    Starlette's TestClient shares one fake client identity (no real IP), so
    without this, unauthenticated endpoints like signup share a single
    counter across the whole test run and trip the real 20-req/min limit
    well before the suite finishes -- not a bug in the limiter, just a
    byproduct of every test looking like the same caller to it.
    """
    redis.from_url(settings.REDIS_URL).flushdb()


@pytest.fixture
def signed_up_user(client):
    """Fresh user + auth headers + the default workspace auto-created on signup.

    A unique email per call so tests never collide on the DB's unique
    constraint, even though they all share one un-reset database for the
    whole session.
    """
    return _sign_up(client)


@pytest.fixture
def other_user(client):
    """A second, unrelated account -- for cross-workspace access tests."""
    return _sign_up(client)


def _sign_up(client):
    email = f"pytest-{uuid.uuid4()}@example.com"
    password = "TestPass123!"

    signup = client.post(
        "/api/v1/users/signup",
        json={
            "email": email,
            "password": password,
            "first_name": "Pytest",
            "last_name": "User",
        },
    )
    assert signup.status_code == 201, signup.text

    login = client.post(
        "/api/v1/users/login",
        json={"email": email, "password": password},
    )
    assert login.status_code == 200, login.text
    body = login.json()

    return {
        "email": email,
        "password": password,
        "user_id": body["user"]["user_id"],
        "workspace_id": body["user"]["default_workspace"]["workspace_id"],
        "token": body["access_token"],
        "headers": {"Authorization": f"Bearer {body['access_token']}"},
    }

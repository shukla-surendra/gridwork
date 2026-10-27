from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from starlette import status

from adapters.orm.models.database import SessionLocal
from authorization.auth import get_auth_details
from handlers.calendar_handler import calendar_entries
from handlers.workspace_handlers import WorkspaceHandler

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}", tags=["Calendar"])


@router.get("/calendar", status_code=status.HTTP_200_OK)
async def get_calendar(workspace_id: str, start: datetime, end: datetime, user: dict = Depends(get_auth_details)):
    """Events, focus blocks, due dates, reminders and sprints in [start, end)."""
    user_id = user.get("user_id")
    WorkspaceHandler().get_workspace(workspace_id, user_id)
    db = SessionLocal()
    try:
        return calendar_entries(db, workspace_id, user_id, start, end)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    finally:
        db.close()


calendar_router = router

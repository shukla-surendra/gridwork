from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from starlette import status
from starlette.responses import Response

from adapters.orm.models.database import SessionLocal
from handlers import time_tracking_handler as tt
from modules.access import require_module_enabled

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}", tags=["Time tracking"])
gate = require_module_enabled("time_tracking", default_enabled=True)


class WorklogCreate(BaseModel):
    work_date: date
    duration_minutes: int
    description: Optional[str] = None
    user_id: Optional[str] = None  # admins can log for someone else


class WorklogUpdate(BaseModel):
    work_date: Optional[date] = None
    duration_minutes: Optional[int] = None
    description: Optional[str] = None


class EstimateUpdate(BaseModel):
    # Only the keys sent are changed; null clears.
    original_estimate_minutes: Optional[int] = None
    remaining_estimate_minutes: Optional[int] = None


class SchemeUpdate(BaseModel):
    minutes_per_day: int
    working_days: List[int]


class TimeOffCreate(BaseModel):
    user_id: Optional[str] = None  # null with kind "holiday" = everyone
    start_date: date
    end_date: date
    kind: str = "vacation"
    note: Optional[str] = None


def _run(fn, *args, **kwargs):
    db = SessionLocal()
    try:
        return fn(db, *args, **kwargs)
    finally:
        db.close()


# ---- Worklogs and estimates on an issue ---------------------------------------

@router.get("/tasks/{task_id}/worklogs")
async def list_task_worklogs(workspace_id: str, task_id: str, user: dict = Depends(gate)):
    return _run(tt.task_worklogs, workspace_id, task_id, user.get("user_id"))


@router.post("/tasks/{task_id}/worklogs", status_code=status.HTTP_201_CREATED)
async def log_work(workspace_id: str, task_id: str, body: WorklogCreate, user: dict = Depends(gate)):
    return _run(tt.log_work, workspace_id, user.get("user_id"), task_id, body.work_date,
                body.duration_minutes, body.description, body.user_id)


@router.put("/tasks/{task_id}/estimate")
async def set_estimate(workspace_id: str, task_id: str, body: EstimateUpdate, user: dict = Depends(gate)):
    return _run(tt.set_estimate, workspace_id, task_id, body.model_dump(exclude_unset=True))


@router.put("/worklogs/{worklog_id}")
async def update_worklog(workspace_id: str, worklog_id: str, body: WorklogUpdate, user: dict = Depends(gate)):
    return _run(tt.update_worklog, workspace_id, user.get("user_id"), worklog_id, body.model_dump(exclude_unset=True))


@router.delete("/worklogs/{worklog_id}")
async def delete_worklog(workspace_id: str, worklog_id: str, user: dict = Depends(gate)):
    return _run(tt.delete_worklog, workspace_id, user.get("user_id"), worklog_id)


# ---- Timesheets -----------------------------------------------------------------

@router.get("/timesheet")
async def get_timesheet(workspace_id: str, start: date, end: date, user_id: Optional[str] = None,
                        user: dict = Depends(gate)):
    return _run(tt.timesheet, workspace_id, user.get("user_id"), user_id or user.get("user_id"), start, end)


@router.get("/timesheet/team")
async def get_team_timesheet(workspace_id: str, start: date, end: date, user: dict = Depends(gate)):
    return _run(tt.team_timesheet, workspace_id, user.get("user_id"), start, end)


# ---- Capacity ---------------------------------------------------------------------

@router.get("/capacity/members")
async def get_member_schemes(workspace_id: str, user: dict = Depends(gate)):
    return _run(tt.member_schemes, workspace_id, user.get("user_id"))


@router.put("/capacity/members/{member_id}")
async def set_member_scheme(workspace_id: str, member_id: str, body: SchemeUpdate, user: dict = Depends(gate)):
    return _run(tt.set_scheme, workspace_id, user.get("user_id"), member_id, body.minutes_per_day, body.working_days)


@router.get("/capacity/sprints")
async def get_open_sprints(workspace_id: str, user: dict = Depends(gate)):
    return _run(tt.open_sprints, workspace_id)


@router.get("/capacity/sprints/{sprint_id}")
async def get_sprint_workload(workspace_id: str, sprint_id: str, user: dict = Depends(gate)):
    return _run(tt.sprint_workload, workspace_id, sprint_id, user.get("user_id"))


@router.get("/time-off")
async def list_time_off(workspace_id: str, start: date, end: date, user: dict = Depends(gate)):
    def _list(db):
        # Wider than the timesheet limit: the Time off tab plans months ahead.
        if end < start or (end - start).days > 400:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="range must be 0-400 days")
        return tt.list_time_off(db, workspace_id, user.get("user_id"), start, end)
    return _run(_list)


@router.post("/time-off", status_code=status.HTTP_201_CREATED)
async def add_time_off(workspace_id: str, body: TimeOffCreate, user: dict = Depends(gate)):
    return _run(tt.add_time_off, workspace_id, user.get("user_id"), body.user_id, body.start_date,
                body.end_date, body.kind, body.note)


@router.delete("/time-off/{time_off_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_time_off(workspace_id: str, time_off_id: str, user: dict = Depends(gate)):
    _run(tt.delete_time_off, workspace_id, user.get("user_id"), time_off_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


time_tracking_router = router

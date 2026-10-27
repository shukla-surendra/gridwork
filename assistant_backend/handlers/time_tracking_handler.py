"""Tempo-style time tracking and team capacity.

- Worklogs: time a member spent on a work item on a given day.
  Task.time_spent_minutes is kept in step with them, and a task's
  remaining estimate counts down as work is logged (Jira's "adjust
  automatically"); deleting or shrinking a worklog gives the time back.
- Capacity: a member's workload scheme (minutes per working day, which
  weekdays) minus their time off and workspace-wide holidays. Members
  without a scheme get DEFAULT_MINUTES_PER_DAY on DEFAULT_WORKING_DAYS.
- Sprint workload: per assignee, the remaining estimate of their open
  sprint issues against the capacity left in the sprint.

Who sees what (Tempo's default permissions): hours a person logged and
the reason for their time off are theirs. Members see their own
timesheet and worklogs; workspace owners/admins see everyone's. Planning
data -- estimates, capacity, that someone is away -- is visible to the
whole workspace, since the team plans sprints around it.

Everything here takes an open session; callers own commit/close.
"""
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select

from adapters.orm.models.pg_models import (
    Board, MemberCapacity, Sprint, Task, TimeOff, User, Workspace, Worklog, workspace_users,
)
from constants import TaskStatus, UNTICKETED_TASK_TYPES
from dto.task_dto import TaskDtoMapper

DEFAULT_MINUTES_PER_DAY = 480
DEFAULT_WORKING_DAYS = [0, 1, 2, 3, 4]  # Mon-Fri
MAX_WORKLOG_MINUTES = 24 * 60
MAX_ESTIMATE_MINUTES = 1000 * 60
MAX_RANGE_DAYS = 62
TIME_OFF_KINDS = ("vacation", "sick", "holiday", "other")
CLOSED_STATUSES = (TaskStatus.DONE.value, TaskStatus.CANCELLED.value, TaskStatus.ARCHIVED.value)
MANAGER_ROLES = ("owner", "admin")


def _not_found(what):
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{what} not found")


def _forbidden(detail):
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def _bad_request(detail):
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


def _days(start: date, end: date):
    """Inclusive date range."""
    return [start + timedelta(days=i) for i in range((end - start).days + 1)]


def check_range(start: date, end: date):
    if end < start:
        raise _bad_request("end must be on or after start")
    if (end - start).days + 1 > MAX_RANGE_DAYS:
        raise _bad_request(f"range too large (max {MAX_RANGE_DAYS} days)")


# ---- Members and roles -------------------------------------------------------

def _display_name(user: User):
    return f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email


def members(db, workspace_id):
    """Everyone in the workspace, owner first. The owner has no
    workspace_users row in workspaces created by signup, so it's added
    from Workspace.owner_id."""
    owner_id = db.query(Workspace.owner_id).filter(Workspace.workspace_id == workspace_id).scalar()
    rows = db.execute(
        select(User, workspace_users.c.role)
        .join(workspace_users, User.user_id == workspace_users.c.user_id)
        .where(workspace_users.c.workspace_id == workspace_id)
    ).all()
    by_id = {str(user.user_id): (user, role) for user, role in rows}
    if owner_id and str(owner_id) not in by_id:
        owner = db.query(User).filter(User.user_id == owner_id).first()
        if owner:
            by_id[str(owner_id)] = (owner, "owner")
    result = []
    for user_id, (user, role) in by_id.items():
        result.append({
            "user_id": user_id,
            "name": _display_name(user),
            "email": user.email,
            "avatar": user.avatar_url,
            "role": "owner" if user_id == str(owner_id) else role,
        })
    result.sort(key=lambda m: (m["role"] != "owner", m["name"].lower()))
    return result


def role_of(db, workspace_id, user_id):
    owner_id = db.query(Workspace.owner_id).filter(Workspace.workspace_id == workspace_id).scalar()
    if str(owner_id) == str(user_id):
        return "owner"
    return db.query(workspace_users.c.role).filter(
        workspace_users.c.workspace_id == workspace_id,
        workspace_users.c.user_id == user_id,
    ).scalar()


def is_manager(db, workspace_id, user_id):
    return role_of(db, workspace_id, user_id) in MANAGER_ROLES


def _require_member(db, workspace_id, user_id):
    if not role_of(db, workspace_id, user_id):
        raise _not_found("Member")


# ---- Estimates -----------------------------------------------------------------

def remaining_minutes(task: Task):
    return TaskDtoMapper.remaining_estimate(task)


def time_fields(task: Task):
    return {
        "task_id": str(task.task_id),
        "original_estimate_minutes": task.original_estimate_minutes,
        "remaining_estimate_minutes": remaining_minutes(task),
        "time_spent_minutes": task.time_spent_minutes or 0,
    }


def _work_item(db, workspace_id, task_id):
    try:
        task = db.query(Task).filter(
            Task.task_id == task_id,
            Task.workspace_id == workspace_id,
            Task.is_deleted == False,
        ).first()
    except Exception:
        task = None  # malformed UUID
    if not task:
        raise _not_found("Task")
    if task.task_type in UNTICKETED_TASK_TYPES:
        raise _bad_request("Time can only be tracked on work items")
    return task


def _check_minutes(value, field, upper):
    if value is None:
        return
    if not isinstance(value, int) or value < 0 or value > upper:
        raise _bad_request(f"{field} must be between 0 and {upper} minutes")


def set_estimate(db, workspace_id, task_id, fields: dict):
    """`fields` holds only what the caller sent: a key present with None
    clears it (a cleared remaining estimate goes back to automatic)."""
    task = _work_item(db, workspace_id, task_id)
    for key in ("original_estimate_minutes", "remaining_estimate_minutes"):
        if key in fields:
            _check_minutes(fields[key], key, MAX_ESTIMATE_MINUTES)
    if "original_estimate_minutes" in fields:
        task.original_estimate_minutes = fields["original_estimate_minutes"] or None
        if "remaining_estimate_minutes" not in fields:
            # A new original estimate restarts the automatic countdown.
            task.remaining_estimate_minutes = None
    if "remaining_estimate_minutes" in fields:
        task.remaining_estimate_minutes = fields["remaining_estimate_minutes"]
    db.commit()
    return time_fields(task)


def _adjust_task(task: Task, delta_minutes: int):
    """Logging more time spends it from the remaining estimate; logging
    less (edit/delete) gives it back."""
    task.time_spent_minutes = max((task.time_spent_minutes or 0) + delta_minutes, 0)
    if task.remaining_estimate_minutes is not None:
        task.remaining_estimate_minutes = max(task.remaining_estimate_minutes - delta_minutes, 0)


# ---- Worklogs ------------------------------------------------------------------

def worklog_dict(worklog: Worklog, task: Task = None, user: User = None):
    task = task or worklog.task
    user = user or worklog.user
    return {
        "worklog_id": str(worklog.worklog_id),
        "task_id": str(worklog.task_id),
        "ticket_key": TaskDtoMapper.ticket_key(task) if task else None,
        "task_title": task.title if task else None,
        "task_status": task.status if task else None,
        "board_id": str(task.board_id) if task and task.board_id else None,
        "user_id": str(worklog.user_id),
        "user_name": _display_name(user) if user else None,
        "work_date": worklog.work_date.isoformat(),
        "duration_minutes": worklog.duration_minutes,
        "description": worklog.description,
        "created_at": worklog.created_at.replace(tzinfo=timezone.utc).isoformat() if worklog.created_at else None,
    }


def _check_duration(minutes):
    if not isinstance(minutes, int) or minutes < 1 or minutes > MAX_WORKLOG_MINUTES:
        raise _bad_request(f"duration_minutes must be between 1 and {MAX_WORKLOG_MINUTES}")


def _check_work_date(work_date: date):
    # A day of slack for members ahead of UTC; nobody logs work next week.
    if work_date > datetime.now(timezone.utc).date() + timedelta(days=1):
        raise _bad_request("Can't log work in the future")


def log_work(db, workspace_id, actor_id, task_id, work_date: date, duration_minutes: int,
             description: str = None, user_id: str = None):
    """Log time for `user_id` (default: the actor). Logging on someone
    else's behalf needs owner/admin, like Tempo's "log work for others"."""
    user_id = str(user_id or actor_id)
    if user_id != str(actor_id):
        if not is_manager(db, workspace_id, actor_id):
            raise _forbidden("Only workspace admins can log time for someone else")
        _require_member(db, workspace_id, user_id)
    _check_duration(duration_minutes)
    _check_work_date(work_date)
    task = _work_item(db, workspace_id, task_id)
    worklog = Worklog(
        workspace_id=workspace_id, task_id=task.task_id, user_id=user_id,
        work_date=work_date, duration_minutes=duration_minutes,
        description=(description or "").strip() or None,
    )
    db.add(worklog)
    _adjust_task(task, duration_minutes)
    db.commit()
    db.refresh(worklog)
    return {"worklog": worklog_dict(worklog, task), "task": time_fields(task)}


def _editable_worklog(db, workspace_id, actor_id, worklog_id):
    try:
        worklog = db.query(Worklog).filter(
            Worklog.worklog_id == worklog_id, Worklog.workspace_id == workspace_id,
        ).first()
    except Exception:
        worklog = None
    if not worklog:
        raise _not_found("Worklog")
    if str(worklog.user_id) != str(actor_id) and not is_manager(db, workspace_id, actor_id):
        raise _forbidden("You can only change your own worklogs")
    return worklog


def update_worklog(db, workspace_id, actor_id, worklog_id, fields: dict):
    worklog = _editable_worklog(db, workspace_id, actor_id, worklog_id)
    task = worklog.task
    if fields.get("duration_minutes") is not None:
        _check_duration(fields["duration_minutes"])
        _adjust_task(task, fields["duration_minutes"] - worklog.duration_minutes)
        worklog.duration_minutes = fields["duration_minutes"]
    if fields.get("work_date") is not None:
        _check_work_date(fields["work_date"])
        worklog.work_date = fields["work_date"]
    if "description" in fields:
        worklog.description = (fields["description"] or "").strip() or None
    db.commit()
    return {"worklog": worklog_dict(worklog, task), "task": time_fields(task)}


def delete_worklog(db, workspace_id, actor_id, worklog_id):
    worklog = _editable_worklog(db, workspace_id, actor_id, worklog_id)
    task = worklog.task
    _adjust_task(task, -worklog.duration_minutes)
    db.delete(worklog)
    db.commit()
    return {"task": time_fields(task)}


def task_worklogs(db, workspace_id, task_id, actor_id):
    """An issue's worklogs: all of them for admins, else just the
    caller's own. The issue's total time spent stays visible to everyone."""
    task = _work_item(db, workspace_id, task_id)
    can_view_all = is_manager(db, workspace_id, actor_id)
    query = db.query(Worklog, User).join(User, User.user_id == Worklog.user_id).filter(Worklog.task_id == task.task_id)
    if not can_view_all:
        query = query.filter(Worklog.user_id == actor_id)
    rows = query.order_by(Worklog.work_date.desc(), Worklog.created_at.desc()).all()
    return {"can_view_all": can_view_all, "worklogs": [worklog_dict(w, task, u) for w, u in rows]}


# ---- Capacity --------------------------------------------------------------------

def schemes(db, workspace_id):
    """user_id -> (minutes_per_day, working_days)."""
    rows = db.query(MemberCapacity).filter(MemberCapacity.workspace_id == workspace_id).all()
    return {str(r.user_id): (r.minutes_per_day, list(r.working_days or [])) for r in rows}


def _scheme_for(scheme_map, user_id):
    return scheme_map.get(str(user_id), (DEFAULT_MINUTES_PER_DAY, DEFAULT_WORKING_DAYS))


def set_scheme(db, workspace_id, actor_id, user_id, minutes_per_day: int, working_days: list):
    if not is_manager(db, workspace_id, actor_id):
        raise _forbidden("Only workspace admins can change workload schemes")
    _require_member(db, workspace_id, user_id)
    if not isinstance(minutes_per_day, int) or not 0 <= minutes_per_day <= MAX_WORKLOG_MINUTES:
        raise _bad_request("minutes_per_day must be between 0 and 1440")
    if not isinstance(working_days, list) or any(d not in range(7) for d in working_days):
        raise _bad_request("working_days must be weekday numbers 0 (Mon) to 6 (Sun)")
    row = db.query(MemberCapacity).filter(
        MemberCapacity.workspace_id == workspace_id, MemberCapacity.user_id == user_id,
    ).first()
    if not row:
        row = MemberCapacity(workspace_id=workspace_id, user_id=user_id)
        db.add(row)
    row.minutes_per_day = minutes_per_day
    row.working_days = sorted(set(working_days))
    db.commit()
    return {"user_id": str(user_id), "minutes_per_day": row.minutes_per_day, "working_days": row.working_days, "is_default": False}


def time_off_in_range(db, workspace_id, start: date, end: date):
    return db.query(TimeOff).filter(
        TimeOff.workspace_id == workspace_id,
        TimeOff.start_date <= end,
        TimeOff.end_date >= start,
    ).order_by(TimeOff.start_date).all()


AWAY = "away"  # what others see instead of vacation/sick/other


def _redact_kind(kind, owner_id, viewer_id, viewer_is_manager):
    """Teammates can see that someone is away (they plan around it), not
    why: sick leave in particular is private. Holidays apply to everyone."""
    if kind == "holiday" or viewer_is_manager or str(owner_id) == str(viewer_id):
        return kind
    return AWAY


def time_off_dict(row: TimeOff, names: dict, viewer_id=None, viewer_is_manager=True):
    kind = _redact_kind(row.kind, row.user_id, viewer_id, viewer_is_manager)
    return {
        "time_off_id": str(row.time_off_id),
        "user_id": str(row.user_id) if row.user_id else None,
        "user_name": names.get(str(row.user_id)) if row.user_id else "Everyone",
        "start_date": row.start_date.isoformat(),
        "end_date": row.end_date.isoformat(),
        "kind": kind,
        "note": row.note if kind == row.kind else None,
    }


def list_time_off(db, workspace_id, actor_id, start: date, end: date):
    manager = is_manager(db, workspace_id, actor_id)
    names = {m["user_id"]: m["name"] for m in members(db, workspace_id)}
    return [time_off_dict(r, names, actor_id, manager) for r in time_off_in_range(db, workspace_id, start, end)]


def add_time_off(db, workspace_id, actor_id, user_id, start_date: date, end_date: date, kind: str, note: str = None):
    """Members add their own time off; admins can add anyone's, and only
    admins can add a workspace-wide holiday (user_id None)."""
    if kind not in TIME_OFF_KINDS:
        raise _bad_request(f"kind must be one of {', '.join(TIME_OFF_KINDS)}")
    if end_date < start_date:
        raise _bad_request("end_date must be on or after start_date")
    if (end_date - start_date).days > 366:
        raise _bad_request("Time off can span at most a year")
    if user_id is None or str(user_id) != str(actor_id):
        if not is_manager(db, workspace_id, actor_id):
            raise _forbidden("Only workspace admins can add time off for others or for everyone")
    if user_id is not None:
        _require_member(db, workspace_id, user_id)
    row = TimeOff(workspace_id=workspace_id, user_id=user_id, start_date=start_date, end_date=end_date,
                  kind=kind, note=(note or "").strip() or None, created_by=actor_id)
    db.add(row)
    db.commit()
    names = {m["user_id"]: m["name"] for m in members(db, workspace_id)}
    return time_off_dict(row, names)


def delete_time_off(db, workspace_id, actor_id, time_off_id):
    try:
        row = db.query(TimeOff).filter(TimeOff.time_off_id == time_off_id, TimeOff.workspace_id == workspace_id).first()
    except Exception:
        row = None
    if not row:
        raise _not_found("Time off")
    if (row.user_id is None or str(row.user_id) != str(actor_id)) and not is_manager(db, workspace_id, actor_id):
        raise _forbidden("You can only remove your own time off")
    db.delete(row)
    db.commit()


def day_capacity(scheme, absences, day: date):
    """(minutes, time-off kind or None) for one member on one day."""
    minutes_per_day, working_days = scheme
    for absence in absences:
        if absence.start_date <= day <= absence.end_date:
            return 0, absence.kind
    if day.weekday() not in working_days:
        return 0, None
    return minutes_per_day, None


def _absences_by_user(time_off_rows):
    """user_id -> that member's absences plus workspace-wide holidays."""
    holidays = [r for r in time_off_rows if r.user_id is None]
    by_user = {}
    for row in time_off_rows:
        if row.user_id is not None:
            by_user.setdefault(str(row.user_id), []).append(row)
    return lambda user_id: by_user.get(str(user_id), []) + holidays


# ---- Timesheets -------------------------------------------------------------------

def timesheet(db, workspace_id, actor_id, user_id, start: date, end: date):
    """One member's days (capacity, logged, time off) and worklogs. Your
    own, or anyone's for an admin."""
    check_range(start, end)
    if str(user_id) != str(actor_id) and not is_manager(db, workspace_id, actor_id):
        raise _forbidden("Only workspace admins can view other members' timesheets")
    _require_member(db, workspace_id, user_id)
    scheme = _scheme_for(schemes(db, workspace_id), user_id)
    absences = _absences_by_user(time_off_in_range(db, workspace_id, start, end))(user_id)
    rows = db.query(Worklog, Task, User).join(Task, Task.task_id == Worklog.task_id).join(
        User, User.user_id == Worklog.user_id,
    ).filter(
        Worklog.workspace_id == workspace_id,
        Worklog.user_id == user_id,
        Worklog.work_date >= start,
        Worklog.work_date <= end,
    ).order_by(Worklog.work_date, Worklog.created_at).all()
    worklogs = [worklog_dict(w, t, u) for w, t, u in rows]

    logged = {}
    for w in worklogs:
        logged[w["work_date"]] = logged.get(w["work_date"], 0) + w["duration_minutes"]
    days = []
    for day in _days(start, end):
        capacity, off = day_capacity(scheme, absences, day)
        days.append({"date": day.isoformat(), "capacity_minutes": capacity,
                     "logged_minutes": logged.get(day.isoformat(), 0), "time_off": off})
    return {
        "user_id": str(user_id),
        "days": days,
        "worklogs": worklogs,
        "total_logged_minutes": sum(d["logged_minutes"] for d in days),
        "total_capacity_minutes": sum(d["capacity_minutes"] for d in days),
    }


def team_timesheet(db, workspace_id, actor_id, start: date, end: date):
    """Logged vs capacity per member per day. Admins only."""
    if not is_manager(db, workspace_id, actor_id):
        raise _forbidden("Only workspace admins can view the team timesheet")
    check_range(start, end)
    scheme_map = schemes(db, workspace_id)
    absences_for = _absences_by_user(time_off_in_range(db, workspace_id, start, end))
    logged = {}
    for user_id, work_date, minutes in db.query(Worklog.user_id, Worklog.work_date, Worklog.duration_minutes).filter(
        Worklog.workspace_id == workspace_id, Worklog.work_date >= start, Worklog.work_date <= end,
    ).all():
        key = (str(user_id), work_date.isoformat())
        logged[key] = logged.get(key, 0) + minutes

    result = []
    for member in members(db, workspace_id):
        scheme = _scheme_for(scheme_map, member["user_id"])
        absences = absences_for(member["user_id"])
        days = []
        for day in _days(start, end):
            capacity, off = day_capacity(scheme, absences, day)
            days.append({"date": day.isoformat(), "capacity_minutes": capacity,
                         "logged_minutes": logged.get((member["user_id"], day.isoformat()), 0), "time_off": off})
        result.append({
            **member,
            "days": days,
            "total_logged_minutes": sum(d["logged_minutes"] for d in days),
            "total_capacity_minutes": sum(d["capacity_minutes"] for d in days),
        })
    return {"days": [d.isoformat() for d in _days(start, end)], "members": result}


# ---- Capacity planning -------------------------------------------------------------

def member_schemes(db, workspace_id, actor_id):
    scheme_map = schemes(db, workspace_id)
    result = []
    for member in members(db, workspace_id):
        minutes_per_day, working_days = _scheme_for(scheme_map, member["user_id"])
        result.append({**member, "minutes_per_day": minutes_per_day, "working_days": working_days,
                       "is_default": member["user_id"] not in scheme_map})
    return {"can_manage": is_manager(db, workspace_id, actor_id), "members": result}


def open_sprints(db, workspace_id):
    rows = db.query(Sprint, Board.name).join(Board, Board.board_id == Sprint.board_id).filter(
        Sprint.workspace_id == workspace_id,
        Sprint.is_deleted == False,
        Board.is_deleted == False,
        Sprint.status != "completed",
    ).order_by(Sprint.status.asc(), Sprint.start_date.asc().nullslast()).all()
    return [_sprint_dict(s, name) for s, name in rows]


def _sprint_dict(sprint: Sprint, board_name):
    return {
        "sprint_id": str(sprint.sprint_id),
        "name": sprint.name,
        "goal": sprint.goal,
        "status": sprint.status,
        "board_id": str(sprint.board_id),
        "board_name": board_name,
        "start_date": sprint.start_date.date().isoformat() if sprint.start_date else None,
        "end_date": sprint.end_date.date().isoformat() if sprint.end_date else None,
    }


def sprint_workload(db, workspace_id, sprint_id, actor_id, today: date = None):
    """Remaining estimate of each assignee's open sprint issues against
    the capacity they have left in the sprint (from today, or from the
    start for a sprint that hasn't begun). Hours logged per person are
    only included for the caller themself, or for everyone if admin."""
    manager = is_manager(db, workspace_id, actor_id)
    try:
        row = db.query(Sprint, Board.name).join(Board, Board.board_id == Sprint.board_id).filter(
            Sprint.sprint_id == sprint_id, Sprint.workspace_id == workspace_id, Sprint.is_deleted == False,
        ).first()
    except Exception:
        row = None
    if not row:
        raise _not_found("Sprint")
    sprint, board_name = row
    if not sprint.start_date or not sprint.end_date:
        raise _bad_request("Give the sprint start and end dates to plan its capacity")
    start, end = sprint.start_date.date(), sprint.end_date.date()
    today = today or datetime.now(timezone.utc).date()
    remaining_from = max(start, today)

    scheme_map = schemes(db, workspace_id)
    absences_for = _absences_by_user(time_off_in_range(db, workspace_id, start, end))
    issues = db.query(Task).filter(
        Task.sprint_id == sprint.sprint_id, Task.is_deleted == False, Task.parent_task_id.is_(None),
    ).all()
    logged = {}
    issue_ids = [t.task_id for t in issues]
    if issue_ids:
        for user_id, minutes in db.query(Worklog.user_id, Worklog.duration_minutes).filter(
            Worklog.task_id.in_(issue_ids),
        ).all():
            logged[str(user_id)] = logged.get(str(user_id), 0) + minutes

    def bucket():
        return {"allocated_minutes": 0, "issue_count": 0, "open_issue_count": 0,
                "unestimated_count": 0, "story_points": 0, "issues": []}

    buckets = {}
    for task in issues:
        b = buckets.setdefault(str(task.assignee_id) if task.assignee_id else None, bucket())
        is_open = task.status not in CLOSED_STATUSES and not task.completed
        remaining = remaining_minutes(task)
        b["issue_count"] += 1
        b["story_points"] += task.story_points or 0
        if is_open:
            b["open_issue_count"] += 1
            if remaining is None:
                b["unestimated_count"] += 1
            else:
                b["allocated_minutes"] += remaining
        b["issues"].append({
            "task_id": str(task.task_id), "ticket_key": TaskDtoMapper.ticket_key(task), "title": task.title,
            "status": task.status, "is_open": is_open, "story_points": task.story_points,
            "original_estimate_minutes": task.original_estimate_minutes,
            "remaining_estimate_minutes": remaining, "time_spent_minutes": task.time_spent_minutes or 0,
        })

    result = []
    for member in members(db, workspace_id):
        scheme = _scheme_for(scheme_map, member["user_id"])
        absences = absences_for(member["user_id"])
        total = remaining = 0
        days_off = []
        for day in _days(start, end):
            capacity, off = day_capacity(scheme, absences, day)
            total += capacity
            if day >= remaining_from:
                remaining += capacity
                if off:
                    days_off.append({"date": day.isoformat(),
                                     "kind": _redact_kind(off, member["user_id"], actor_id, manager)})
        b = buckets.pop(member["user_id"], bucket())
        result.append({
            **member, **b,
            "total_capacity_minutes": total,
            "remaining_capacity_minutes": remaining,
            "logged_minutes": logged.get(member["user_id"], 0) if manager or member["user_id"] == str(actor_id) else None,
            "load_percent": round(100 * b["allocated_minutes"] / remaining) if remaining else (None if b["allocated_minutes"] else 0),
            "days_off": days_off,
        })
    unassigned = buckets.pop(None, bucket())
    # Assignees who have since left the workspace still hold sprint work.
    for b in buckets.values():
        for key in ("allocated_minutes", "issue_count", "open_issue_count", "unestimated_count", "story_points"):
            unassigned[key] += b[key]
        unassigned["issues"].extend(b["issues"])

    return {
        "sprint": _sprint_dict(sprint, board_name),
        "remaining_from": remaining_from.isoformat(),
        "working_days_left": sum(1 for d in _days(remaining_from, end) if d.weekday() < 5) if remaining_from <= end else 0,
        "members": result,
        "unassigned": unassigned,
        "totals": {
            "allocated_minutes": sum(m["allocated_minutes"] for m in result) + unassigned["allocated_minutes"],
            "remaining_capacity_minutes": sum(m["remaining_capacity_minutes"] for m in result),
            "logged_minutes": sum(logged.values()) if manager else None,
        },
        "can_view_all": manager,
    }

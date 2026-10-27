"""Everything with a date that belongs on the caller's calendar, for one
visible range, as one flat list the frontend can render directly:

- event   -- shared meetings (task_type "meeting"), the team calendar
- focus   -- the caller's own time blocks (task_type "time_block")
- due     -- work items with a due date, as all-day markers
- reminder -- the caller's open reminders
- sprint  -- sprint date ranges, as all-day spans

Events and focus blocks are created/edited through the normal /tasks
endpoints; this is the read side only.
"""
from datetime import datetime, timezone, timedelta

from sqlalchemy import or_, and_

from adapters.orm.models.pg_models import Task, Reminder, Sprint, Board
from constants import TaskType, TaskStatus, UNTICKETED_TASK_TYPES
from dto.task_dto import TaskDtoMapper

MAX_RANGE = timedelta(days=62)  # a month view plus its leading/trailing weeks
CLOSED_STATUSES = (TaskStatus.DONE.value, TaskStatus.CANCELLED.value, TaskStatus.ARCHIVED.value)


def _naive_utc(value: datetime) -> datetime:
    """Columns are naive UTC; accept aware input from the query string."""
    return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value


def _iso(value):
    # Explicit zone so browsers don't read stored UTC as local time.
    return value.replace(tzinfo=timezone.utc).isoformat() if value else None


def _overlaps(start_col, end_col, start, end):
    """Rows whose [start, end) intersects the range; a missing end means a point in time."""
    return and_(start_col < end, or_(end_col > start, and_(end_col.is_(None), start_col >= start)))


def calendar_entries(db, workspace_id, user_id, start: datetime, end: datetime) -> list:
    start, end = _naive_utc(start), _naive_utc(end)
    if end <= start:
        raise ValueError("end must be after start")
    if end - start > MAX_RANGE:
        raise ValueError("range too large (max 62 days)")

    live_tasks = db.query(Task).filter(Task.workspace_id == workspace_id, Task.is_deleted == False)
    entries = []

    scheduled = live_tasks.filter(
        or_(
            Task.task_type == TaskType.MEETING.value,
            and_(Task.task_type == TaskType.TIME_BLOCK.value, Task.user_id == user_id),
        ),
        Task.start_time.isnot(None),
        _overlaps(Task.start_time, Task.end_time, start, end),
    ).all()
    for task in scheduled:
        meta = task.meta_data or {}
        is_event = task.task_type == TaskType.MEETING.value
        entries.append({
            "id": f"task:{task.task_id}",
            "kind": "event" if is_event else "focus",
            "title": task.title,
            "start": _iso(task.start_time),
            "end": _iso(task.end_time),
            "all_day": False,
            "task_id": str(task.task_id),
            "owner_id": str(task.user_id),
            "description": task.description,
            "location": meta.get("location"),
            "color": meta.get("color"),
            "attendees": [w for w in (task.watchers or []) if isinstance(w, str)],
            "status": task.status,
        })

    due = live_tasks.filter(
        Task.task_type.notin_(UNTICKETED_TASK_TYPES),
        Task.due_on.isnot(None),
        Task.due_on >= start,
        Task.due_on < end,
    ).all()
    for task in due:
        entries.append({
            "id": f"due:{task.task_id}",
            "kind": "due",
            "title": task.title,
            "start": _iso(task.due_on),
            "end": None,
            "all_day": True,
            "task_id": str(task.task_id),
            "ticket_key": TaskDtoMapper.ticket_key(task),
            "assignee_id": str(task.assignee_id) if task.assignee_id else None,
            "status": task.status,
            "is_closed": task.status in CLOSED_STATUSES or bool(task.completed),
            "board_id": str(task.board_id) if task.board_id else None,
        })

    reminders = db.query(Reminder).filter(
        Reminder.workspace_id == workspace_id,
        Reminder.user_id == user_id,
        Reminder.is_completed == False,
        Reminder.due_date >= start,
        Reminder.due_date < end,
    ).all()
    for reminder in reminders:
        entries.append({
            "id": f"reminder:{reminder.reminder_id}",
            "kind": "reminder",
            "title": reminder.title,
            "start": _iso(reminder.due_date),
            "end": None,
            "all_day": False,
            "reminder_id": str(reminder.reminder_id),
            "repeat": reminder.repeat,
        })

    sprints = db.query(Sprint, Board.name).join(Board, Board.board_id == Sprint.board_id).filter(
        Sprint.workspace_id == workspace_id,
        Sprint.is_deleted == False,
        Board.is_deleted == False,
        Sprint.start_date.isnot(None),
        _overlaps(Sprint.start_date, Sprint.end_date, start, end),
    ).all()
    for sprint, board_name in sprints:
        entries.append({
            "id": f"sprint:{sprint.sprint_id}",
            "kind": "sprint",
            "title": f"{sprint.name} · {board_name}",
            "start": _iso(sprint.start_date),
            "end": _iso(sprint.end_date),
            "all_day": True,
            "board_id": str(sprint.board_id),
            "status": sprint.status,
        })

    return entries

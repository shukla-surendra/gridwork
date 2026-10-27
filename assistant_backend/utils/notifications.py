"""In-app notifications for the events people actually need to hear about:
being assigned, a comment on something they follow, a status change on
something they follow, and their own reminders coming due.

Each recipient can switch any type off from Settings > Notifications; that
choice lives in their UserSettings row for the workspace, in
notification_settings as {type: bool}, with a missing key meaning "on".
"""
import datetime
import logging

from adapters.orm.models.pg_models import Notification, Reminder, User, UserSettings, Workspace, workspace_users

logger = logging.getLogger(__name__)

ASSIGNED = "assigned"
COMMENT = "comment"
STATUS_CHANGED = "status_changed"
REMINDER = "reminder"
NOTIFICATION_TYPES = (ASSIGNED, COMMENT, STATUS_CHANGED, REMINDER)


def display_name(db, user_id) -> str:
    if not user_id:
        return "Someone"
    row = db.query(User.first_name, User.last_name).filter(User.user_id == user_id).first()
    return f"{row[0]} {row[1] or ''}".strip() if row else "Someone"


def followers(task) -> set:
    """Everyone who follows an issue: its creator, assignee and watchers
    (commenters are added to watchers when they comment)."""
    people = {task.user_id, task.assignee_id, *[w for w in (task.watchers or []) if isinstance(w, str)]}
    return {str(p) for p in people if p}


def notify(db, *, workspace_id, recipients, actor_id, type, title, message,
           entity_id=None, entity_type=None, properties=None) -> int:
    """Queue one notification per recipient (on the caller's session -- it
    commits with the change that caused it). Never notifies the actor about
    their own action, skips anyone who's left the workspace, and honours
    each recipient's per-type preference. Returns how many were created."""
    actor = str(actor_id) if actor_id else None
    targets = {str(r) for r in recipients if r} - {actor}
    if not targets:
        return 0

    members = {
        str(row[0]) for row in db.query(workspace_users.c.user_id).filter(
            workspace_users.c.workspace_id == workspace_id,
            workspace_users.c.user_id.in_(targets),
        ).all()
    }
    # The owner has no workspace_users row (ownership lives on the workspace).
    owner = db.query(Workspace.owner_id).filter(Workspace.workspace_id == workspace_id).scalar()
    if owner and str(owner) in targets:
        members.add(str(owner))
    prefs = {
        str(uid): (ns or {}) for uid, ns in db.query(UserSettings.user_id, UserSettings.notification_settings)
        .filter(UserSettings.workspace_id == workspace_id, UserSettings.user_id.in_(members)).all()
    } if members else {}

    created = 0
    for user_id in members:
        if prefs.get(user_id, {}).get(type) is False:
            continue
        db.add(Notification(
            workspace_id=workspace_id,
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            entity_id=entity_id,
            entity_type=entity_type,
            properties=properties or {},
        ))
        created += 1
    return created


_REPEAT_STEP = {
    "daily": datetime.timedelta(days=1),
    "weekly": datetime.timedelta(weeks=1),
}


def _next_due(due, repeat):
    if repeat in _REPEAT_STEP:
        return due + _REPEAT_STEP[repeat]
    if repeat == "monthly":
        month = due.month % 12 + 1
        year = due.year + (due.month == 12)
        day = min(due.day, 28)
        return due.replace(year=year, month=month, day=day)
    return None


def deliver_due_reminders(db, workspace_id, user_id) -> int:
    """Turn the caller's reminders that have come due into notifications.

    Runs when the user fetches notifications (the bell polls), so reminders
    fire without a background scheduler. A one-off reminder is marked as
    delivered; a repeating one rolls forward to its next occurrence.
    """
    now = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
    due = db.query(Reminder).filter(
        Reminder.workspace_id == workspace_id,
        Reminder.user_id == user_id,
        Reminder.is_completed == False,
        Reminder.due_date <= now,
    ).all()

    delivered = 0
    for reminder in due:
        props = dict(reminder.properties or {})
        if props.get("notified_for") == reminder.due_date.isoformat():
            continue
        notify(
            db, workspace_id=workspace_id, recipients=[user_id], actor_id=None,
            type=REMINDER, title=f"Reminder: {reminder.title}",
            message=reminder.description or f"Due {reminder.due_date:%b %d, %H:%M} UTC",
            entity_id=reminder.reminder_id, entity_type="reminder",
        )
        next_due = _next_due(reminder.due_date, reminder.repeat)
        if next_due:
            # Skip occurrences missed while nobody was looking -- one ping, not a backlog of them.
            while next_due <= now:
                next_due = _next_due(next_due, reminder.repeat)
            reminder.due_date = next_due
        else:
            props["notified_for"] = reminder.due_date.isoformat()
            reminder.properties = props
        delivered += 1
    if delivered:
        db.commit()
    return delivered

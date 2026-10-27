"""Import issues into a board from another tracker's CSV export.

Reads the common "export all fields" CSV layout and brings over, per
issue: summary, description, type, status, priority, assignee, reporter,
labels, sprint, story points, due date, time tracking (estimates and Log
Work entries), comments, epics, parents (subtasks) and outward issue links.

How the export's concepts map here:
- Epic issues become board Epics; issues point at them through the
  "Parent" column (newer exports) or "Epic Link" (older exports).
- Sub-tasks become subtasks of their parent issue.
- Statuses map by name, then by "Status Category"; anything unknown goes
  to the board's first column.
- People are matched to workspace members by display name or email.
  Comments from people who aren't members are kept and attributed by
  name; their worklogs only count toward the issue's time spent, since a
  worklog has to belong to a member's timesheet.
- Issues keep their original key in meta_data.imported.key. Importing the
  same file again skips issues already on the board, so a re-run is safe.

dry_run runs the whole import inside the transaction and rolls it back,
so the preview reports exactly what the real import would do.
"""
import csv
import html
import io
import re
import uuid
from collections import Counter, defaultdict
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import text

from adapters.orm.models.pg_models import Board, Comment, Epic, Sprint, Task, TaskLink, Worklog
from handlers import time_tracking_handler as tt

MAX_CSV_CHARS = 10 * 1024 * 1024
MAX_ISSUES = 5000
MAX_WARNINGS = 50
DEFAULT_COLUMNS = ["todo", "in_progress", "review", "done"]
EPIC_COLORS = ["#6554C0", "#36B37E", "#00B8D9", "#FF5630", "#FFAB00", "#0052CC", "#DE350B"]

DONE_NAMES = {"done", "closed", "resolved", "complete", "completed", "released", "won't do", "wont do", "cancelled", "canceled"}
IN_PROGRESS_NAMES = {"in progress", "in development", "in dev", "doing", "started", "development"}
REVIEW_NAMES = {"in review", "review", "code review", "peer review", "qa", "in qa", "testing", "in test", "ready for qa", "verification"}
PRIORITY_MAP = {
    "highest": "urgent", "blocker": "urgent", "critical": "urgent", "urgent": "urgent",
    "high": "high", "major": "high",
    "medium": "medium", "normal": "medium",
    "low": "low", "lowest": "low", "minor": "low", "trivial": "low",
}
LINK_COLUMNS = {
    "outward issue link (blocks)": "blocks",
    "outward issue link (relates)": "relates_to",
    "outward issue link (duplicate)": "duplicates",
    "outward issue link (cloners)": "clones",
}
DATE_FORMATS = (
    "%d/%b/%y %I:%M %p", "%d/%b/%Y %I:%M %p", "%d/%b/%y %H:%M", "%d/%b/%Y %H:%M",
    "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d",
    "%m/%d/%Y %H:%M", "%m/%d/%Y %I:%M %p", "%d/%m/%Y %H:%M", "%d/%b/%y", "%d/%b/%Y",
)


def _bad_request(detail):
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


# ---- CSV parsing ---------------------------------------------------------------

def _column(name: str) -> str:
    """'Custom field (Story Points)' -> 'story points'."""
    name = name.strip().lower()
    match = re.fullmatch(r"custom field \((.*)\)", name)
    return match.group(1).strip() if match else name


def parse_rows(csv_text: str):
    """Rows as {column: [values]} -- exports repeat a column (Labels,
    Sprint, Comment, Log Work...) once per value."""
    if len(csv_text) > MAX_CSV_CHARS:
        raise _bad_request("The file is too large (max 10 MB). Export fewer issues at a time.")
    try:
        reader = csv.reader(io.StringIO(csv_text.lstrip("﻿")))
        header = next(reader, None)
        if not header:
            raise _bad_request("The file is empty.")
        columns = [_column(h) for h in header]
        if "summary" not in columns:
            raise _bad_request("This doesn't look like an issue export: there's no Summary column.")
        rows = []
        for raw in reader:
            row = defaultdict(list)
            for name, value in zip(columns, raw):
                value = value.strip()
                if value:
                    row[name].append(value)
            if row:
                rows.append(row)
                if len(rows) > MAX_ISSUES:
                    raise _bad_request(f"Too many issues in one file (max {MAX_ISSUES}).")
    except csv.Error as e:
        raise _bad_request(f"Couldn't read the CSV file: {e}")
    return rows


def _first(row, *names):
    for name in names:
        if row.get(name):
            return row[name][0]
    return None


def parse_date(value):
    if not value:
        return None
    value = value.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def _seconds_to_minutes(value):
    try:
        seconds = int(float(value))
    except (TypeError, ValueError):
        return None
    return max(seconds // 60, 0)


def _key_order(key):
    match = re.match(r"(.*?)-(\d+)$", key or "")
    return (match.group(1), int(match.group(2))) if match else (key or "", 0)


# ---- Text conversion -----------------------------------------------------------

def _mentions(textvalue, account_names):
    """[~accountid:abc] / [~username] -> @Display Name."""
    def repl(match):
        ref = match.group(1)
        ref = ref.split(":", 1)[1] if ref.startswith("accountid:") else ref
        return "@" + account_names.get(ref, ref)
    return re.sub(r"\[~([^\]]+)\]", repl, textvalue)


def _inline(line):
    line = re.sub(r"\{\{(.+?)\}\}", r"<code>\1</code>", line)
    line = re.sub(r"(?<![\w*])\*(\S(?:.*?\S)?)\*(?![\w*])", r"<strong>\1</strong>", line)
    line = re.sub(r"(?<![\w_])_(\S(?:.*?\S)?)_(?![\w_])", r"<em>\1</em>", line)
    line = re.sub(r"\[([^|\]]+)\|(https?://[^\]]+)\]", r'<a href="\2">\1</a>', line)
    return line


def wiki_to_html(value, account_names=None):
    """Wiki markup -> the HTML the description editor stores. Covers
    what real descriptions mostly use: headings, bullet/numbered lists,
    bold/italic/monospace, links and {code}/{noformat} blocks."""
    if not value:
        return None
    value = _mentions(value.replace("\r\n", "\n"), account_names or {})
    out, paragraph, list_tag, code = [], [], None, None

    def flush_paragraph():
        if paragraph:
            out.append("<p>" + "<br>".join(paragraph) + "</p>")
            paragraph.clear()

    def close_list():
        nonlocal list_tag
        if list_tag:
            out.append(f"</{list_tag}>")
            list_tag = None

    for raw in value.split("\n"):
        if code is not None:
            if re.match(r"^\s*\{(code|noformat)\}\s*$", raw):
                out.append("<pre><code>" + html.escape("\n".join(code)) + "</code></pre>")
                code = None
            else:
                code.append(raw)
            continue
        if re.match(r"^\s*\{(code|noformat)(:[^}]*)?\}\s*$", raw):
            flush_paragraph(); close_list()
            code = []
            continue
        line = html.escape(raw.strip(), quote=False)
        heading = re.match(r"^h([1-6])\.\s+(.*)", line)
        bullet = re.match(r"^([*\-#])+\s+(.*)", line)
        if not line:
            flush_paragraph(); close_list()
        elif heading:
            flush_paragraph(); close_list()
            level = min(int(heading.group(1)) + 1, 4)
            out.append(f"<h{level}>{_inline(heading.group(2))}</h{level}>")
        elif bullet:
            flush_paragraph()
            tag = "ol" if bullet.group(1) == "#" else "ul"
            if list_tag != tag:
                close_list()
                out.append(f"<{tag}>")
                list_tag = tag
            out.append(f"<li>{_inline(bullet.group(2))}</li>")
        else:
            close_list()
            paragraph.append(_inline(line))
    if code is not None:
        out.append("<pre><code>" + html.escape("\n".join(code)) + "</code></pre>")
    flush_paragraph(); close_list()
    return "".join(out) or None


def wiki_to_text(value, account_names=None):
    """Plain text for comments (shown as written, line breaks kept)."""
    if not value:
        return ""
    value = _mentions(value.replace("\r\n", "\n"), account_names or {})
    value = re.sub(r"\{(code|noformat)(:[^}]*)?\}", "", value)
    value = re.sub(r"\[([^|\]]+)\|([^\]]+)\]", r"\1 (\2)", value)
    value = re.sub(r"\{\{(.+?)\}\}", r"\1", value)
    return value.strip()


# ---- Mapping -------------------------------------------------------------------

def _issue_kind(type_name):
    name = (type_name or "").strip().lower()
    if name == "epic":
        return "epic"
    if name in ("sub-task", "subtask", "sub task"):
        return "subtask"
    if name in ("bug", "defect"):
        return "bug"
    if name in ("story", "user story"):
        return "story"
    return "task"


def map_status(status_name, category, columns):
    name = (status_name or "").strip().lower()
    category = (category or "").strip().lower()
    if name in DONE_NAMES or (name not in IN_PROGRESS_NAMES | REVIEW_NAMES and category == "done"):
        mapped = "done"
    elif name in REVIEW_NAMES:
        mapped = "review"
    elif name in IN_PROGRESS_NAMES or category == "in progress":
        mapped = "in_progress"
    else:
        mapped = "todo"
    if mapped in columns:
        return mapped
    return columns[-1] if mapped == "done" else columns[0]


def map_priority(value):
    return PRIORITY_MAP.get((value or "").strip().lower(), "medium")


class _People:
    """Resolves exported names, emails and account ids to workspace members."""

    def __init__(self, members, rows):
        self.by_name = {}
        member_names = {}
        for m in members:
            member_names[m["user_id"]] = m["name"]
            self.by_name[m["name"].lower()] = m["user_id"]
            if m.get("email"):
                self.by_name[m["email"].lower()] = m["user_id"]
        # Exports give comment/worklog authors as account ids; the
        # Assignee/Reporter/Creator columns pair those ids with names.
        self.account_names = {}
        self.account_users = {}
        self.member_names = member_names
        for row in rows:
            for role in ("assignee", "reporter", "creator"):
                name, account = _first(row, role), _first(row, f"{role} id")
                if name and account:
                    # Mentions read better with the member's name here.
                    user_id = self.by_name.get(name.lower())
                    self.account_names[account] = member_names[user_id] if user_id else name
                    if user_id:
                        self.account_users[account] = user_id
        self.unmatched = Counter()

    def name(self, ref):
        return self.account_names.get(ref, ref)

    def resolve(self, ref):
        """(user_id or None, display name)."""
        if not ref:
            return None, None
        if ref in self.account_users:
            user_id = self.account_users[ref]
            return user_id, self.member_names[user_id]
        name = self.name(ref)
        user_id = self.by_name.get(name.lower()) or self.by_name.get(ref.lower())
        if not user_id:
            self.unmatched[name] += 1
        return user_id, name


# ---- Import --------------------------------------------------------------------

def _require_board(db, workspace_id, board_id):
    try:
        board = db.query(Board).filter(
            Board.board_id == uuid.UUID(str(board_id)),
            Board.workspace_id == uuid.UUID(str(workspace_id)),
            Board.is_deleted == False,
        ).first()
    except ValueError:
        board = None
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    return board


def _reserve_numbers(db, board_id, count):
    """Hand out `count` consecutive ticket numbers from the board's counter."""
    if not count:
        return []
    new_next = db.execute(
        text("UPDATE boards SET next_task_number = next_task_number + :n WHERE board_id = :bid RETURNING next_task_number"),
        {"n": count, "bid": str(board_id)},
    ).scalar()
    return list(range(new_next - count, new_next))


def import_issues_csv(db, workspace_id, board_id, actor_id, csv_text, dry_run=True):
    if not tt.is_manager(db, workspace_id, actor_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only workspace owners and admins can import issues")
    board = _require_board(db, workspace_id, board_id)
    rows = parse_rows(csv_text)
    if not rows:
        raise _bad_request("The file has no issues in it.")

    columns = (board.properties or {}).get("columns") or DEFAULT_COLUMNS
    people = _People(tt.members(db, workspace_id), rows)
    warnings = []

    def warn(message):
        if len(warnings) < MAX_WARNINGS:
            warnings.append(message)

    existing = {}
    for task_id, meta in db.query(Task.task_id, Task.meta_data).filter(
        Task.board_id == board.board_id, Task.is_deleted == False,
    ):
        key = ((meta or {}).get("imported") or {}).get("key")
        if key:
            existing[key] = task_id

    try:
        summary = _import(db, board, columns, actor_id, rows, people, existing, warn)
        if dry_run:
            db.rollback()
        else:
            db.commit()
    except Exception:
        db.rollback()
        raise

    summary.update({
        "dry_run": dry_run,
        "unmatched_people": [name for name, _ in people.unmatched.most_common()],
        "warnings": warnings,
    })
    return summary


def _import(db, board, columns, actor_id, rows, people, existing, warn):
    workspace_id = board.workspace_id
    now = datetime.utcnow()
    type_counts = Counter()
    created = Counter()
    skipped = []

    # Issue id and key -> row, so Parent / Epic Link / links resolve
    # whichever form the export used.
    by_ref = {}
    for row in rows:
        for ref in (_first(row, "issue key"), _first(row, "issue id")):
            if ref:
                by_ref[ref] = row

    # Epics first: reuse an existing board epic with the same name.
    board_epics = {e.title.strip().lower(): e for e in db.query(Epic).filter(
        Epic.board_id == board.board_id, Epic.is_deleted == False,
    )}
    epic_for_row = {}
    for row in rows:
        if _issue_kind(_first(row, "issue type")) != "epic":
            continue
        type_counts["epic"] += 1
        title = _first(row, "epic name", "summary")
        epic = board_epics.get(title.lower())
        if epic:
            skipped.append({"key": _first(row, "issue key"), "reason": f"Epic \"{epic.title}\" already exists on this board"})
        else:
            done = map_status(_first(row, "status"), _first(row, "status category"), columns) == "done"
            epic = Epic(
                epic_id=uuid.uuid4(), workspace_id=workspace_id, board_id=board.board_id,
                title=title[:255],
                description=wiki_to_text(_first(row, "description"), people.account_names) or None,
                color=EPIC_COLORS[len(board_epics) % len(EPIC_COLORS)],
                status="closed" if done else "open",
                start_date=parse_date(_first(row, "start date")),
                due_date=parse_date(_first(row, "due date")),
                created_at=parse_date(_first(row, "created")) or now,
            )
            db.add(epic)
            board_epics[title.lower()] = epic
            created["epics"] += 1
        epic_for_row[id(row)] = epic

    def epic_of(row):
        for ref in (_first(row, "epic link"), *row.get("parent", []), _first(row, "parent id"), _first(row, "parent key")):
            target = by_ref.get(ref) if ref else None
            if target is not None and id(target) in epic_for_row:
                return epic_for_row[id(target)]
        return None

    def parent_row(row):
        for ref in (*row.get("parent", []), _first(row, "parent id"), _first(row, "parent key")):
            target = by_ref.get(ref) if ref else None
            if target is not None and id(target) not in epic_for_row:
                return target
        return None

    # Sprints by name; ones that don't exist yet are created once we know
    # whether all their issues are finished.
    board_sprints = {s.name.strip().lower(): s for s in db.query(Sprint).filter(
        Sprint.board_id == board.board_id, Sprint.is_deleted == False,
    )}

    issues = [row for row in rows if id(row) not in epic_for_row]
    # Parents before their subtasks, then in original key order, so ticket
    # numbers keep the original sequence.
    issues.sort(key=lambda r: (parent_row(r) is not None, _key_order(_first(r, "issue key"))))

    to_create = []
    for row in issues:
        key = _first(row, "issue key")
        kind = _issue_kind(_first(row, "issue type"))
        type_counts[kind] += 1
        if key and key in existing:
            skipped.append({"key": key, "reason": "Already imported to this board"})
            continue
        to_create.append((row, key, kind))

    numbers = iter(_reserve_numbers(db, board.board_id, len(to_create)))
    task_for_row = {}
    new_sprints = defaultdict(list)
    for row, key, kind in to_create:
        status_value = map_status(_first(row, "status"), _first(row, "status category"), columns)
        assignee_id, assignee_name = people.resolve(_first(row, "assignee"))
        reporter_id, reporter_name = people.resolve(_first(row, "reporter"))
        points = _first(row, "story points", "story point estimate")
        try:
            points = int(round(float(points))) if points else None
        except ValueError:
            points = None
        created_at = parse_date(_first(row, "created")) or now
        source_meta = {k: v for k, v in {
            "key": key, "id": _first(row, "issue id"), "type": _first(row, "issue type"),
            "status": _first(row, "status"),
            "assignee": assignee_name if assignee_name and not assignee_id else None,
            "reporter": reporter_name if reporter_name and not reporter_id else None,
        }.items() if v}

        task = Task(
            task_id=uuid.uuid4(), workspace_id=workspace_id, board_id=board.board_id,
            user_id=actor_id, reporter_id=reporter_id or actor_id, assignee_id=assignee_id,
            title=(_first(row, "summary") or key or "Untitled")[:500],
            description=wiki_to_html(_first(row, "description"), people.account_names),
            priority=map_priority(_first(row, "priority")),
            task_type="task", status=status_value, completed=status_value == "done",
            is_deleted=False, due_on=parse_date(_first(row, "due date")),
            story_points=points, labels=list(dict.fromkeys(row.get("labels", []))), watchers=[], checklist=[],
            meta_data={"issue_type": "task" if kind == "subtask" else kind, "imported": source_meta},
            settings={}, public_access=False,
            slug=f"imported-{(key or uuid.uuid4().hex[:8]).lower()}-{uuid.uuid4().hex[:6]}",
            task_number=next(numbers),
            original_estimate_minutes=_seconds_to_minutes(_first(row, "original estimate")),
            created_at=created_at, updated_at=parse_date(_first(row, "updated")) or created_at,
        )
        epic = epic_of(row)
        parent = parent_row(row)
        if parent is not None:
            parent_task = task_for_row.get(id(parent))
            if parent_task is None and existing.get(_first(parent, "issue key")):
                # Parent came in with an earlier import of this board.
                parent_task = db.get(Task, existing[_first(parent, "issue key")])
            if parent_task is None or parent_task.parent_task_id:
                warn(f"{key}: parent {_first(parent, 'issue key') or ''} couldn't be linked (it is itself a subtask).")
            else:
                task.parent_task_id = parent_task.task_id
                task.parent_task = parent_task
                epic = epic or parent_task.epic
                created["subtasks"] += 1
        if epic is not None:
            task.epic = epic

        sprint_names = row.get("sprint", [])
        if sprint_names and task.parent_task_id is None:
            name = sprint_names[-1]
            sprint = board_sprints.get(name.strip().lower())
            if sprint is not None:
                task.sprint_id = sprint.sprint_id
            else:
                new_sprints[name].append(task)

        db.add(task)
        task_for_row[id(row)] = task
        created["issues"] += 1
        if key:
            existing[key] = task.task_id

        _import_time(db, task, row, people, created, warn)
        _import_comments(db, task, row, people, actor_id, created, warn)

    for name, sprint_tasks in new_sprints.items():
        finished = all(t.status == "done" for t in sprint_tasks)
        sprint = Sprint(
            sprint_id=uuid.uuid4(), workspace_id=workspace_id, board_id=board.board_id,
            name=name[:255], status="completed" if finished else "planned",
        )
        db.add(sprint)
        board_sprints[name.strip().lower()] = sprint
        for t in sprint_tasks:
            t.sprint_id = sprint.sprint_id
        created["sprints"] += 1

    # Subtasks follow their parent's sprint.
    for task in task_for_row.values():
        if task.parent_task_id and getattr(task, "parent_task", None) is not None:
            task.sprint_id = task.parent_task.sprint_id

    db.flush()
    _import_links(db, workspace_id, to_create, task_for_row, existing, created, warn)

    return {
        "issues": {"total": sum(type_counts.values()), "by_type": dict(type_counts)},
        "created": {k: created.get(k, 0) for k in ("issues", "epics", "subtasks", "sprints", "comments", "worklogs", "links")},
        "skipped": skipped[:200],
        "skipped_count": len(skipped),
        "sample": [
            {"source_key": key, "title": task_for_row[id(row)].title, "type": kind, "status": task_for_row[id(row)].status}
            for row, key, kind in to_create[:8]
        ],
    }


def _import_time(db, task, row, people, created, warn):
    logged = 0
    for entry in row.get("log work", []):
        # "description;started;author;seconds" -- the description may
        # itself contain semicolons, so split from the right.
        parts = entry.rsplit(";", 3)
        if len(parts) != 4:
            warn(f"{task.meta_data['imported'].get('key')}: couldn't read a Log Work entry.")
            continue
        description, started, author, seconds = parts
        minutes = _seconds_to_minutes(seconds)
        work_date = parse_date(started)
        if not minutes or not work_date:
            continue
        logged += minutes
        user_id, _ = people.resolve(author)
        if user_id:
            db.add(Worklog(
                worklog_id=uuid.uuid4(), workspace_id=task.workspace_id, task_id=task.task_id,
                user_id=user_id, work_date=work_date.date(), duration_minutes=minutes,
                description=wiki_to_text(description, people.account_names)[:2000] or None,
            ))
            created["worklogs"] += 1
    spent_column = _seconds_to_minutes(_first(row, "time spent"))
    task.time_spent_minutes = max(spent_column or 0, logged)
    remaining = _seconds_to_minutes(_first(row, "remaining estimate"))
    if remaining is not None:
        task.remaining_estimate_minutes = remaining


def _import_comments(db, task, row, people, actor_id, created, warn):
    for entry in row.get("comment", []):
        # "date;author;body" -- the body may contain semicolons.
        parts = entry.split(";", 2)
        if len(parts) != 3:
            warn(f"{task.meta_data['imported'].get('key')}: couldn't read a comment.")
            continue
        when, author, body = parts
        body = wiki_to_text(body, people.account_names)
        if not body:
            continue
        user_id, name = people.resolve(author)
        properties = {"imported": True}
        if not user_id:
            properties["author_name"] = name or "Unknown user"
        db.add(Comment(
            comment_id=uuid.uuid4(), workspace_id=task.workspace_id, task_id=task.task_id,
            user_id=user_id or actor_id, content=body[:20000], properties=properties,
            created_at=parse_date(when) or task.created_at, updated_at=parse_date(when) or task.created_at,
            is_deleted=False,
        ))
        created["comments"] += 1


def _import_links(db, workspace_id, to_create, task_for_row, existing, created, warn):
    seen = set()
    for row, key, _ in to_create:
        source = task_for_row[id(row)]
        for column, link_type in LINK_COLUMNS.items():
            for target_key in row.get(column, []):
                target_id = existing.get(target_key)
                if not target_id:
                    warn(f"{key}: linked issue {target_key} isn't in this import, so the link was skipped.")
                    continue
                pair = (source.task_id, target_id, link_type)
                if target_id == source.task_id or pair in seen:
                    continue
                seen.add(pair)
                db.add(TaskLink(
                    link_id=uuid.uuid4(), workspace_id=workspace_id,
                    source_task_id=source.task_id, target_task_id=target_id, link_type=link_type,
                ))
                created["links"] += 1

import random
import uuid
from datetime import date, datetime, timedelta, timezone, time
from passlib.hash import pbkdf2_sha256
from sqlalchemy.orm import Session
from .models.pg_models import (
    User, UserSettings, Task, Workspace, Board, Sprint, Epic, WorkspaceModule,
    Reminder, Notification, Comment, Tag, Page, Block, Database,
    DatabaseEntry, Template, Activity, Integration,
    Chat, ChatMessage, Worklog, MemberCapacity, TimeOff,
    workspace_users, task_tags
)
from modules.crm.models import Contact, Deal, ContactActivity, DealActivity, Company, Lead, LeadActivity
from modules.hr.models import Employee, LeaveRequest, OnboardingTemplate
from modules.inventory.models import Warehouse, Product, StockMovement
from modules.school_erp.models import (
    Teacher, SchoolClass, Student, Attendance,
    FeeStructure, FeePayment, Exam, ExamResult,
)
from modules.billing.models import (
    Customer, Item, BillingSequence, Quote, QuoteLine, Invoice, InvoiceLine, Payment,
)
from modules.library.models import (
    Seat, Shift, Member, Booking, Attendance as LibraryAttendance,
)
from constants import TaskStatus, TaskType, TaskPriority, UserStatus, UserRoles, UserType, UNTICKETED_TASK_TYPES
from dto.task_dto import TaskDtoMapper
from utils.ticket_keys import generate_key


def _html(*paragraphs: str) -> str:
    """A Task's `description` (any task_type, including 'note'/'quick_note')
    is Tiptap HTML -- the actual editor everywhere in this app
    (components/dashboard/editor/RichTextEditor.js, used by both
    EditTaskDrawer.js and NewNoteDrawer.js/EditNoteDrawer.js) stores/reads
    HTML strings via editor.getHTML(), not Lexical JSON. This used to be
    named _lexical() and produce genuine Lexical-shaped JSON, matching
    what NotesPage.js's list/grid/table previews incorrectly expected at
    the time (extractTextFromLexicalJSON()) -- that was a fixture-side
    workaround for a real frontend bug (every note's preview rendered
    blank against real Tiptap-HTML content, fixtures included). Now that
    NotesPage.js correctly strips HTML for its previews instead
    (utils/htmlToText.js), fixture data needs to be real HTML too --
    otherwise opening one of these notes to actually EDIT it would show
    the raw JSON text as literal content inside the Tiptap editor."""
    return "".join(f"<p>{p}</p>" for p in paragraphs)


# Seeded rows bypass TaskHandler.create_task, so they never went through
# its ticket numbering -- do the same job in one pass afterwards: give each
# board (and, for boardless work items, the workspace) a key and number
# tasks in creation order, exactly as the add_ticket_numbering /
# add_workspace_ticket_keys migrations backfill real data.
_UNTICKETED_TYPES = UNTICKETED_TASK_TYPES


def _assign_ticket_keys(db: Session, workspace: Workspace):
    taken = set()
    boards = db.query(Board).filter(Board.workspace_id == workspace.workspace_id).order_by(Board.created_at.asc()).all()
    owners = [(board, Task.board_id == board.board_id) for board in boards] + [(workspace, Task.board_id.is_(None))]
    for owner, scope in owners:
        if owner.key:
            taken.add(owner.key)
            continue
        owner.key = generate_key(owner.name, taken, fallback="BRD" if owner is not workspace else "TASK")
        taken.add(owner.key)
        tasks = db.query(Task).filter(
            Task.workspace_id == workspace.workspace_id,
            scope,
            Task.task_type.notin_(_UNTICKETED_TYPES),
        ).order_by(Task.created_at.asc(), Task.task_id.asc()).all()
        for number, task in enumerate(tasks, start=1):
            task.task_number = number
        owner.next_task_number = len(tasks) + 1
    db.commit()


def _weekdays_between(start: date, end: date):
    day = start
    while day <= end:
        if day.weekday() < 5:
            yield day
        day += timedelta(days=1)


def _nth_weekday_after(day: date, n: int):
    """The n-th weekday after `day` (n=1 is the next one)."""
    while n:
        day += timedelta(days=1)
        if day.weekday() < 5:
            n -= 1
    return day


def _seed_epics_and_comments(db: Session, workspace: Workspace, board: Board, people, now):
    """Epics with progress to show, and comment threads that read like a
    team working the sprint -- including an edited comment."""
    owner, teammate, designer, qa = people
    by_title = {t.title: t for t in db.query(Task).filter(Task.board_id == board.board_id, Task.is_deleted == False)}

    epics = {
        "Onboarding revamp": ("#6554C0", "Get a new workspace to its first finished task in under ten minutes.", 14, 21, [
            "Write onboarding docs", "Design review: onboarding flow", "Onboarding checklist API",
            "Invite teammates from onboarding", "Onboarding welcome email copy", "Empty states for onboarding screens",
            "Regression suite for the signup flow", "Accessibility audit of onboarding", "Track onboarding funnel events",
        ]),
        "Dark mode": ("#00B8D9", "A complete dark theme, including charts and badges.", 10, 10, [
            "Add dark mode toggle to settings", "Dark mode: chart and badge colors",
        ]),
        "Platform reliability": ("#FF5630", "Fewer flaky tests, fewer pages at night.", 30, 30, [
            "Fix CRM activities routing", "Fix flaky CI test on auth middleware", "Upgrade dependency versions",
        ]),
    }
    for title, (color, description, started_days_ago, due_in_days, issue_titles) in epics.items():
        epic = Epic(
            epic_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=board.board_id, title=title,
            description=description, color=color, status="open",
            start_date=now - timedelta(days=started_days_ago), due_date=now + timedelta(days=due_in_days),
        )
        db.add(epic)
        for issue_title in issue_titles:
            if issue_title in by_title:
                by_title[issue_title].epic = epic

    threads = {
        "Invite teammates from onboarding": [
            (owner, 3 * 24 * 60, "Scope check: invites go out by email only for now. Slack invites can follow once we see usage.", False),
            (teammate, 3 * 24 * 60 - 45, "Agreed. I'll keep the invite form to a list of emails plus a role picker (member or admin).", False),
            (designer, 2 * 24 * 60, "Mock for the invite step is on the onboarding board. The role picker defaults to member.", False),
            (teammate, 5 * 60, "Backend is done and behind the onboarding flag. Front end next; this will run into my days off, so I've moved the email copy to next sprint.", True),
        ],
        "Fix CRM activities routing": [
            (owner, 6 * 24 * 60, "Backend routes are in, front-end wiring next.", False),
            (teammate, 5 * 24 * 60, "Confirmed working against a live signup.", False),
            (qa, 26 * 60, "Found one more case: activities on a merged contact still point at the old contact. Steps:\n1. Merge two contacts\n2. Open the surviving contact\n3. Activities tab is empty", False),
        ],
        "Regression suite for the signup flow": [
            (qa, 2 * 24 * 60, "Covering email signup, Google signup and the invite link. The demo login is out of scope.", False),
            (owner, 2 * 24 * 60 - 90, "Please add the expired invite link case, we broke it last quarter.", False),
            (qa, 20 * 60, "Added. 14 of 22 cases are automated so far.", False),
        ],
        "Dark mode: chart and badge colors": [
            (designer, 30 * 60, "Contrast fails on the yellow priority badge in dark mode. Proposing a darker amber; palette is attached to the design review.", False),
        ],
    }
    seeded = []
    for issue_title, thread in threads.items():
        task = by_title.get(issue_title)
        if not task:
            continue
        for author, minutes_ago, content, edited in thread:
            when = now - timedelta(minutes=minutes_ago)
            seeded.append(Comment(
                comment_id=uuid.uuid4(), workspace_id=workspace.workspace_id, user_id=author.user_id, task_id=task.task_id,
                content=content, created_at=when, updated_at=when + timedelta(minutes=10 if edited else 0),
                properties={"edited": True} if edited else None,
            ))
    db.add_all(seeded)
    db.commit()
    return seeded


def _seed_time_tracking(db: Session, workspace: Workspace, board: Board, sprints, tasks, task_defaults, people, now):
    """Time tracking data: estimates on sprint work, a fuller active sprint,
    three weeks of worklogs, workload schemes and time off -- enough for
    the Timesheets and Capacity pages to tell a story (one person over-
    allocated, one with days off, a missed timesheet day)."""
    owner, teammate, designer, qa = people
    designer = designer or teammate
    qa = qa or owner
    sprint12, sprint13 = sprints
    today = now.date()
    rng = random.Random(1234)  # stable demo data across seeds

    # ---- More Sprint 13 work, so every member carries a share ---------------
    def sprint_issue(title, assignee, estimate, points, status, task_type=TaskType.TASK.value):
        return Task(
            **task_defaults, task_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=board.board_id,
            sprint_id=sprint13.sprint_id, user_id=owner.user_id, reporter_id=owner.user_id,
            assignee_id=assignee.user_id if assignee else None, title=title,
            priority=TaskPriority.MEDIUM.value, task_type=task_type, status=status,
            story_points=points, original_estimate_minutes=estimate,
            created_at=now - timedelta(days=8),
        )
    extra = [
        sprint_issue("Onboarding checklist API", owner, 3 * 480, 5, TaskStatus.IN_PROGRESS.value, TaskType.FEATURE.value),
        sprint_issue("Invite teammates from onboarding", teammate, 6 * 480, 5, TaskStatus.IN_PROGRESS.value, TaskType.FEATURE.value),
        sprint_issue("Onboarding welcome email copy", teammate, None, 2, TaskStatus.TODO.value),
        sprint_issue("Empty states for onboarding screens", designer, 16 * 60, 3, TaskStatus.IN_PROGRESS.value),
        sprint_issue("Dark mode: chart and badge colors", designer, 12 * 60, 2, TaskStatus.TODO.value),
        sprint_issue("Regression suite for the signup flow", qa, 4 * 480, 3, TaskStatus.IN_PROGRESS.value),
        sprint_issue("Accessibility audit of onboarding", qa, 8 * 60, 2, TaskStatus.TODO.value),
        sprint_issue("Track onboarding funnel events", None, 6 * 60, 2, TaskStatus.TODO.value),
    ]
    db.add_all(extra)
    tasks[4].sprint_id = sprint13.sprint_id  # "Design review: onboarding flow"
    db.commit()

    # ---- Estimates on the existing board cards -------------------------------
    for task, estimate, points in (
        (tasks[0], 16 * 60, 5),   # Fix CRM activities routing (Sprint 12)
        (tasks[1], 6 * 60, 2),    # Fix flaky CI test (Sprint 12)
        (tasks[2], 12 * 60, 3),   # Write onboarding docs
        (tasks[3], 2 * 480, 5),   # Add dark mode toggle
        (tasks[4], 4 * 60, 1),    # Design review: onboarding flow
        (tasks[5], 4 * 60, 1),    # Upgrade dependency versions (done)
    ):
        task.original_estimate_minutes = estimate
        task.story_points = task.story_points or points

    # ---- Workload schemes and time off ----------------------------------------
    # The designer is part-time (6h, Mon-Thu); the owner keeps 7h for
    # issue work. Everyone else gets the default 8h Mon-Fri.
    db.add_all([
        MemberCapacity(workspace_id=workspace.workspace_id, user_id=designer.user_id, minutes_per_day=360, working_days=[0, 1, 2, 3]),
        MemberCapacity(workspace_id=workspace.workspace_id, user_id=owner.user_id, minutes_per_day=420, working_days=[0, 1, 2, 3, 4]),
    ])
    sick_day = _nth_weekday_after(today - timedelta(days=9), 1)
    vacation_start = _nth_weekday_after(today, 2)
    vacation_end = _nth_weekday_after(vacation_start, 1)
    holiday = _nth_weekday_after(today, 9)
    db.add_all([
        TimeOff(workspace_id=workspace.workspace_id, user_id=teammate.user_id, start_date=vacation_start,
                end_date=vacation_end, kind="vacation", note="Long weekend", created_by=teammate.user_id),
        TimeOff(workspace_id=workspace.workspace_id, user_id=designer.user_id, start_date=sick_day,
                end_date=sick_day, kind="sick", created_by=designer.user_id),
        TimeOff(workspace_id=workspace.workspace_id, user_id=None, start_date=holiday, end_date=holiday,
                kind="holiday", note="Company offsite", created_by=owner.user_id),
    ])

    # ---- Three weeks of worklogs ----------------------------------------------
    by_title = {t.title: t for t in tasks + extra}
    sprint13_start = sprint13.start_date.date()
    work = {
        # person: (Sprint 12 issues, Sprint 13 issues, what they write)
        owner.user_id: (
            [tasks[1], by_title["Review pull request #142"]],
            [by_title["Onboarding checklist API"], tasks[1], tasks[4]],
            ["Implementation", "Code review", "Unblocking the team", "API design notes"],
        ),
        teammate.user_id: (
            [tasks[0], tasks[5]],
            [tasks[0], tasks[2], by_title["Invite teammates from onboarding"], tasks[4]],
            ["Implementation", "Fixing review comments", "Writing docs", "Pairing"],
        ),
        designer.user_id: (
            [tasks[3]],
            [tasks[3], by_title["Empty states for onboarding screens"], tasks[4]],
            ["Design iteration", "Prototype", "Handoff to dev", "User feedback review"],
        ),
        qa.user_id: (
            [tasks[1], by_title["Write load tests for the checkout flow"]],
            [by_title["Regression suite for the signup flow"], by_title["Write load tests for the checkout flow"]],
            ["Test cases", "Exploratory testing", "Automation", "Bug verification"],
        ),
    }
    schemes = {owner.user_id: (420, range(5)), designer.user_id: (360, range(4))}
    off_days = {(teammate.user_id, d) for d in (vacation_start, vacation_end)} | {(designer.user_id, sick_day)}
    missed = {(teammate.user_id, _nth_weekday_after(today - timedelta(days=4), 1))}  # forgot to fill in a day

    worklogs = []
    for day in _weekdays_between(today - timedelta(days=21), today):
        for user_id, (old_pool, new_pool, notes) in work.items():
            minutes_per_day, working_days = schemes.get(user_id, (480, range(5)))
            if day.weekday() not in working_days or (user_id, day) in off_days or (user_id, day) in missed:
                continue
            # Meetings eat into the day; today is still in progress.
            target = minutes_per_day - rng.choice([0, 30, 60, 60, 90])
            if day == today:
                target = rng.choice([120, 180, 240])
            pool = new_pool if day >= sprint13_start else old_pool
            chunks = rng.choice([1, 2, 2, 3]) if target >= 240 else 1
            remaining = target
            for i, task in enumerate(rng.sample(pool, min(chunks, len(pool)))):
                last = i == min(chunks, len(pool)) - 1
                minutes = remaining if last else max(30, round(remaining * rng.uniform(0.3, 0.6) / 15) * 15)
                remaining -= minutes
                worklogs.append(Worklog(
                    workspace_id=workspace.workspace_id, task_id=task.task_id, user_id=user_id,
                    work_date=day, duration_minutes=minutes, description=rng.choice(notes),
                    created_at=datetime.combine(day, time(17, 0)),
                ))
    db.add_all(worklogs)

    spent = {}
    for w in worklogs:
        spent[w.task_id] = spent.get(w.task_id, 0) + w.duration_minutes
    for task in tasks + extra:
        task.time_spent_minutes = spent.get(task.task_id, 0)
    # Someone re-estimated after going over, and finished work has nothing left.
    tasks[0].remaining_estimate_minutes = 4 * 60
    for task in tasks + extra:
        if task.status == TaskStatus.DONE.value and task.original_estimate_minutes:
            task.remaining_estimate_minutes = 0
    db.commit()


def _seed_workspace_content(db: Session, workspace: Workspace, owner: User, teammate: User, designer: User = None, qa_engineer: User = None):
    """Everything that lives INSIDE one workspace -- board, tasks, CRM
    data, docs, chat, etc. Shared by create_fixtures() (seeds the whole
    dev DB, 'Acme Workspace') and create_demo_account() (seeds one fresh
    visitor's own workspace) so the two don't drift out of sync with the
    actual schema independently."""

    now = datetime.now(timezone.utc)

    # ---- Boards -------------------------------------------------------------
    # Two boards, each with its own explicit "columns" so the Kanban view
    # (BoardDetailPage.js) has real column configuration to read, not just
    # the client-side default. Cards themselves are plain Tasks with
    # board_id set (see below) -- BoardItem is a dead, unused model (no
    # frontend ever calls it; removed from here for the same reason).
    board = Board(
        board_id=uuid.uuid4(),
        workspace_id=workspace.workspace_id,
        name="Sprint Board",
        description="Kanban board for this workspace",
        properties={"columns": ["todo", "in_progress", "review", "done"]},
        views={"default": "kanban"},
    )
    content_board = Board(
        board_id=uuid.uuid4(),
        workspace_id=workspace.workspace_id,
        name="Content Calendar",
        description="Launch content, tracked from draft to published",
        properties={"columns": ["todo", "in_progress", "review", "done"]},
        views={"default": "kanban"},
    )
    db.add_all([board, content_board])
    db.commit()

    # ---- Tags --------------------------------------------------------------
    # Tag.name is globally unique across the whole app (not scoped per
    # workspace -- see pg_models.py), so this can't just always INSERT:
    # create_demo_account() calls this helper on every "Try Demo" click,
    # and a second call with the same tag names would 500 on
    # UniqueViolation. Get-or-create instead.
    tag_specs = [
        ("urgent", "#E53E3E", "Needs attention now"),
        ("backend", "#3182CE", "Server-side work"),
        ("frontend", "#38A169", "Client-side work"),
    ]
    tags = []
    for name, color, description in tag_specs:
        tag = db.query(Tag).filter(Tag.name == name).first()
        if not tag:
            tag = Tag(id=uuid.uuid4(), name=name, color=color, description=description)
            db.add(tag)
            db.commit()
        tags.append(tag)

    # ---- Tasks + task_tags --------------------------------------------------
    # watchers/labels/meta_data/settings default to []/{} on every real
    # task the API creates (see commands/task_cmd.py) -- TaskDto requires
    # them as list/dict, not Optional, so leaving them None here (the DB
    # column itself is nullable) makes GET /tasks 500 with a Pydantic
    # validation error the moment a task lacking them is serialized.
    #
    # user_id=owner on every one of these: notes, quick notes and time
    # blocks are private to their author (TaskHandler.PERSONAL_TYPES), and
    # `teammate` never logs in (create_demo_account() only mints a token for
    # `owner`). Work items are shared workspace-wide, so assigning them to
    # teammates below is realistic -- they'd see them if they logged in.
    task_defaults = dict(watchers=[], labels=[], meta_data={}, settings={})
    tasks = [
        # ---- Sprint Board cards -- spread across all 4 default columns so
        # the Kanban view (BoardDetailPage.js) isn't lopsided on first look.
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=board.board_id,
            order=0,
            user_id=owner.user_id,
            assignee_id=teammate.user_id,
            reporter_id=owner.user_id,
            title="Fix CRM activities routing",
            description="Wire ActivitiesPanel to the contact/deal-scoped endpoints",
            priority=TaskPriority.HIGH.value,
            task_type=TaskType.BUG.value,
            status=TaskStatus.IN_PROGRESS.value,
            due_on=now + timedelta(days=2),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=board.board_id,
            order=1,
            user_id=owner.user_id,
            title="Fix flaky CI test on auth middleware",
            priority=TaskPriority.MEDIUM.value,
            task_type=TaskType.BUG.value,
            status=TaskStatus.IN_PROGRESS.value,
            due_on=now + timedelta(days=3),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=board.board_id,
            order=0,
            user_id=owner.user_id,
            assignee_id=teammate.user_id,
            reporter_id=owner.user_id,
            title="Write onboarding docs",
            priority=TaskPriority.MEDIUM.value,
            task_type=TaskType.DOCUMENT.value,
            status=TaskStatus.TODO.value,
            due_on=now + timedelta(days=7),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=board.board_id,
            order=1,
            user_id=owner.user_id,
            assignee_id=designer.user_id if designer else None,
            title="Add dark mode toggle to settings",
            priority=TaskPriority.LOW.value,
            task_type=TaskType.FEATURE.value,
            status=TaskStatus.TODO.value,
            due_on=now + timedelta(days=10),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=board.board_id,
            order=0,
            user_id=owner.user_id,
            assignee_id=teammate.user_id,
            title="Design review: onboarding flow",
            priority=TaskPriority.MEDIUM.value,
            task_type=TaskType.TASK.value,
            status=TaskStatus.REVIEW.value,
            due_on=now + timedelta(days=1),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=board.board_id,
            order=0,
            user_id=owner.user_id,
            title="Upgrade dependency versions",
            priority=TaskPriority.LOW.value,
            task_type=TaskType.TASK.value,
            status=TaskStatus.DONE.value,
            completed=True,
            due_on=now - timedelta(days=2),
        ),
        # ---- Content Calendar cards ---------------------------------------
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=content_board.board_id,
            order=0,
            user_id=owner.user_id,
            title="Write blog post: why we rebuilt the CRM",
            priority=TaskPriority.MEDIUM.value,
            task_type=TaskType.TASK.value,
            status=TaskStatus.TODO.value,
            due_on=now + timedelta(days=5),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=content_board.board_id,
            order=0,
            user_id=owner.user_id,
            assignee_id=teammate.user_id,
            title="Record product demo video",
            priority=TaskPriority.HIGH.value,
            task_type=TaskType.TASK.value,
            status=TaskStatus.IN_PROGRESS.value,
            due_on=now + timedelta(days=4),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=content_board.board_id,
            order=0,
            user_id=owner.user_id,
            title="Review launch announcement copy",
            priority=TaskPriority.MEDIUM.value,
            task_type=TaskType.TASK.value,
            status=TaskStatus.REVIEW.value,
            due_on=now + timedelta(days=2),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=content_board.board_id,
            order=0,
            user_id=owner.user_id,
            title="Publish changelog for v1.2",
            priority=TaskPriority.LOW.value,
            task_type=TaskType.TASK.value,
            status=TaskStatus.DONE.value,
            completed=True,
            due_on=now - timedelta(days=3),
        ),
        Task(
            **{**task_defaults, "meta_data": {"location": "Main conference room", "color": "#805AD5"}},
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Quarterly planning",
            priority=TaskPriority.LOW.value,
            task_type=TaskType.MEETING.value,
            status=TaskStatus.SCHEDULED.value,
            start_time=(now + timedelta(days=14)).replace(hour=14, minute=0, second=0, microsecond=0),
            end_time=(now + timedelta(days=14)).replace(hour=16, minute=0, second=0, microsecond=0),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Renew SSL certificate",
            priority=TaskPriority.URGENT.value,
            task_type=TaskType.TASK.value,
            status=TaskStatus.DONE.value,
            completed=True,
            due_on=now - timedelta(days=1),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Review pull request #142",
            priority=TaskPriority.MEDIUM.value,
            task_type=TaskType.TASK.value,
            status=TaskStatus.IN_PROGRESS.value,
            due_on=now + timedelta(days=1),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Set up staging environment",
            priority=TaskPriority.HIGH.value,
            task_type=TaskType.TASK.value,
            status=TaskStatus.BLOCKED.value,
            due_on=now + timedelta(days=5),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Buy coffee for the office",
            priority=TaskPriority.LOW.value,
            task_type=TaskType.TASK.value,
            status=TaskStatus.TODO.value,
            due_on=now + timedelta(days=3),
        ),
        # Notes, quick notes, and time blocks are all just Tasks with a
        # different task_type (see pages/dashboard/NotesPage.js,
        # components/dashboard/sections/StickyNote.js, and
        # pages/dashboard/TimeBlockPage.js / services/taskservice.js's
        # getAllNotes()/getAllQuickNotes()/getAllTimeBlocks(), each a plain
        # GET /tasks?task_type=<x>) -- not separate tables, so each needs
        # its own row here or that screen is empty regardless of how much
        # other data exists. description uses _html() -- the Notes editor
        # (Tiptap) stores/reads HTML, not plain text (see that helper's
        # docstring for the fixture-side bug this used to paper over).
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Demo account design notes",
            description=_html(
                "Kept simple on purpose -- one owner + one teammate, one shared workspace.",
                "Real signup gives every new user their own default workspace instead.",
            ),
            priority=TaskPriority.MEDIUM.value,
            task_type=TaskType.NOTE.value,
            status=TaskStatus.DONE.value,
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Meeting notes -- kickoff",
            description=_html(
                "Attendees: Demo User, Sam Teammate.",
                "Agreed: ship the CRM fix first, demo-account feature second.",
                "Action item: follow up with Northwind Traders by Friday.",
            ),
            priority=TaskPriority.MEDIUM.value,
            task_type=TaskType.NOTE.value,
            status=TaskStatus.DONE.value,
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Ideas for next sprint",
            description=_html(
                "Dark mode for the CRM tables.",
                "Bulk-import contacts from CSV.",
                "Slack notification when a deal changes stage.",
            ),
            priority=TaskPriority.LOW.value,
            task_type=TaskType.NOTE.value,
            status=TaskStatus.TODO.value,
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Remember to check the Activities tab",
            description=_html("Confirm create/edit/delete all still work after the last deploy."),
            priority=TaskPriority.LOW.value,
            task_type=TaskType.QUICK_NOTE.value,
            status=TaskStatus.DONE.value,
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Ask Sam about the Globex deal",
            description=_html("They mentioned budget was confirmed -- get the exact number."),
            priority=TaskPriority.MEDIUM.value,
            task_type=TaskType.QUICK_NOTE.value,
            status=TaskStatus.TODO.value,
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Focus block: CRM cleanup",
            priority=TaskPriority.MEDIUM.value,
            task_type=TaskType.TIME_BLOCK.value,
            status=TaskStatus.SCHEDULED.value,
            start_time=now + timedelta(hours=2),
            end_time=now + timedelta(hours=4),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Focus block: sprint planning prep",
            priority=TaskPriority.LOW.value,
            task_type=TaskType.TIME_BLOCK.value,
            status=TaskStatus.SCHEDULED.value,
            start_time=now + timedelta(days=1, hours=1),
            end_time=now + timedelta(days=1, hours=2),
        ),
        # ---- More time blocks, spread across the rest of the week --------
        # ReportsPage.js's Schedule Analysis chart only had 2 data points
        # (both on the same 2 days) before this -- not enough to show a
        # real "busiest day" or a believable hours-by-day distribution.
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Focus block: reports feature polish",
            priority=TaskPriority.MEDIUM.value,
            task_type=TaskType.TIME_BLOCK.value,
            status=TaskStatus.SCHEDULED.value,
            start_time=now + timedelta(days=2, hours=3),
            end_time=now + timedelta(days=2, hours=5),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Focus block: customer calls",
            priority=TaskPriority.HIGH.value,
            task_type=TaskType.TIME_BLOCK.value,
            status=TaskStatus.SCHEDULED.value,
            start_time=now + timedelta(days=3, hours=1),
            end_time=now + timedelta(days=3, hours=2, minutes=30),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Focus block: code review catch-up",
            priority=TaskPriority.MEDIUM.value,
            task_type=TaskType.TIME_BLOCK.value,
            status=TaskStatus.SCHEDULED.value,
            start_time=now + timedelta(days=4, hours=4),
            end_time=now + timedelta(days=4, hours=6),
        ),
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=None,
            user_id=owner.user_id,
            title="Focus block: architecture doc writing",
            priority=TaskPriority.LOW.value,
            task_type=TaskType.TIME_BLOCK.value,
            status=TaskStatus.SCHEDULED.value,
            start_time=now + timedelta(days=5, hours=2),
            end_time=now + timedelta(days=5, hours=5),
        ),
        # ---- Historical tasks, backdated across the last 6 weeks --------
        # Everything above gets created_at defaulted to "now" (fixture-seed
        # time), so ReportsPage.js's Performance Trends chart (completion
        # rate per week, last 6 weeks) would show 0% for 5 of its 6 buckets
        # and one artificially-high "this week" spike -- not a believable
        # trend. Explicit created_at/updated_at here backdates a realistic
        # spread of completed + still-open work across each week.
        Task(
            **task_defaults, task_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=None,
            user_id=owner.user_id, title="Migrate CI to GitHub Actions",
            description=_html("The old Jenkins pipeline was flaky and slow to iterate on -- every config change meant a 20-minute round trip to find out if the YAML was even valid."),
            priority=TaskPriority.HIGH.value, task_type=TaskType.TASK.value, status=TaskStatus.DONE.value,
            completed=True, created_at=now - timedelta(weeks=6, days=2), updated_at=now - timedelta(weeks=6),
        ),
        Task(
            **task_defaults, task_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=None,
            user_id=owner.user_id, title="Audit unused npm dependencies",
            priority=TaskPriority.LOW.value, task_type=TaskType.TASK.value, status=TaskStatus.TODO.value,
            created_at=now - timedelta(weeks=6, days=1),
        ),
        Task(
            **task_defaults, task_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=None,
            user_id=owner.user_id, title="Set up error tracking with Sentry",
            description=_html("We were finding out about production errors from users, not from monitoring -- that's backwards."),
            priority=TaskPriority.MEDIUM.value, task_type=TaskType.TASK.value, status=TaskStatus.DONE.value,
            completed=True, created_at=now - timedelta(weeks=5, days=3), updated_at=now - timedelta(weeks=5, days=1),
        ),
        Task(
            **task_defaults, task_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=None,
            user_id=owner.user_id, title="Rewrite auth middleware to use refresh tokens",
            description=_html("The old implementation never rotated tokens -- a stolen access token was valid forever, with no way to revoke it short of rotating the signing secret for every user at once."),
            priority=TaskPriority.HIGH.value, task_type=TaskType.BUG.value, status=TaskStatus.DONE.value,
            completed=True, created_at=now - timedelta(weeks=4, days=4), updated_at=now - timedelta(weeks=4),
        ),
        Task(
            **task_defaults, task_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=None,
            user_id=owner.user_id, title="Evaluate Postgres read replicas",
            priority=TaskPriority.MEDIUM.value, task_type=TaskType.TASK.value, status=TaskStatus.TODO.value,
            created_at=now - timedelta(weeks=4, days=2),
        ),
        Task(
            **task_defaults, task_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=None,
            user_id=owner.user_id, title="Deprecate the old /v0 API routes",
            priority=TaskPriority.LOW.value, task_type=TaskType.TASK.value, status=TaskStatus.BLOCKED.value,
            created_at=now - timedelta(weeks=4),
        ),
        Task(
            **task_defaults, task_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=None,
            user_id=owner.user_id, title="Add rate limiting to the public API",
            description=_html("One misbehaving script was enough to degrade the API for every other tenant -- there was nothing stopping it."),
            priority=TaskPriority.HIGH.value, task_type=TaskType.FEATURE.value, status=TaskStatus.DONE.value,
            completed=True, created_at=now - timedelta(weeks=2, days=3), updated_at=now - timedelta(weeks=2, days=1),
        ),
        Task(
            **task_defaults, task_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=None,
            user_id=owner.user_id, assignee_id=qa_engineer.user_id if qa_engineer else None,
            title="Write load tests for the checkout flow",
            priority=TaskPriority.MEDIUM.value, task_type=TaskType.TASK.value, status=TaskStatus.IN_PROGRESS.value,
            created_at=now - timedelta(weeks=2, days=1),
        ),
        Task(
            **task_defaults, task_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=None,
            user_id=owner.user_id, title="Fix memory leak in the background worker",
            description=_html("Memory climbs steadily under load and never comes back down until the pod is restarted -- looks like a retained reference in the queue consumer's message-processing loop."),
            priority=TaskPriority.URGENT.value, task_type=TaskType.BUG.value, status=TaskStatus.TODO.value,
            created_at=now - timedelta(weeks=2),
        ),
        # ---- Daily-spread completions, last 5 days -----------------------
        # Task Completion's own trend chart is daily (not weekly) over the
        # last 7 days -- without these, everything completed "today" piles
        # onto one bar and the other 6 days show zero.
        Task(
            **task_defaults, task_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=None,
            user_id=owner.user_id, title="Rotate the staging DB credentials",
            priority=TaskPriority.MEDIUM.value, task_type=TaskType.TASK.value, status=TaskStatus.DONE.value,
            completed=True, created_at=now - timedelta(days=5), updated_at=now - timedelta(days=5),
        ),
        Task(
            **task_defaults, task_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=None,
            user_id=owner.user_id, title="Update the onboarding checklist",
            priority=TaskPriority.LOW.value, task_type=TaskType.TASK.value, status=TaskStatus.DONE.value,
            completed=True, created_at=now - timedelta(days=4), updated_at=now - timedelta(days=4),
        ),
        Task(
            **task_defaults, task_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=None,
            user_id=owner.user_id, title="Reply to customer escalation on Zendesk",
            description=_html("Northwind Traders' integration broke after our last deploy -- walked them through a workaround and filed the real fix as a bug."),
            priority=TaskPriority.HIGH.value, task_type=TaskType.TASK.value, status=TaskStatus.DONE.value,
            completed=True, created_at=now - timedelta(days=3), updated_at=now - timedelta(days=3),
        ),
        Task(
            **task_defaults, task_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=None,
            user_id=owner.user_id, title="Pair with Sam on the CRM bug",
            priority=TaskPriority.MEDIUM.value, task_type=TaskType.TASK.value, status=TaskStatus.DONE.value,
            completed=True, created_at=now - timedelta(days=2), updated_at=now - timedelta(days=2),
        ),
        Task(
            **task_defaults, task_id=uuid.uuid4(), workspace_id=workspace.workspace_id, board_id=None,
            user_id=owner.user_id, title="Cut the v1.3 release branch",
            priority=TaskPriority.HIGH.value, task_type=TaskType.TASK.value, status=TaskStatus.DONE.value,
            completed=True, created_at=now - timedelta(days=1), updated_at=now - timedelta(days=1),
        ),
    ]
    db.add_all(tasks)
    db.commit()

    db.execute(task_tags.insert().values(task_id=tasks[0].task_id, tag_id=tags[0].id))
    db.execute(task_tags.insert().values(task_id=tasks[0].task_id, tag_id=tags[1].id))
    db.execute(task_tags.insert().values(task_id=tasks[2].task_id, tag_id=tags[2].id))  # tasks[2] = "Write onboarding docs"
    db.commit()

    # ---- Sprints (Sprint Board) -----------------------------------------------
    # Retrofitted onto a few of the Sprint Board cards created above rather
    # than creating new tasks for them, so the Sprints view and the Kanban
    # board are showing the same underlying cards, not two disconnected data
    # sets.
    sprints = [
        Sprint(
            sprint_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=board.board_id,
            name="Sprint 12",
            goal="Ship the CRM activity-routing fix and stabilize CI",
            status="completed",
            start_date=now - timedelta(days=21),
            end_date=now - timedelta(days=7),
        ),
        Sprint(
            sprint_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            board_id=board.board_id,
            name="Sprint 13",
            goal="Onboarding polish + dark mode",
            status="active",
            start_date=now - timedelta(days=7),
            end_date=now + timedelta(days=7),
        ),
    ]
    db.add_all(sprints)
    db.commit()

    tasks[0].sprint_id = sprints[0].sprint_id  # "Fix CRM activities routing"
    tasks[1].sprint_id = sprints[0].sprint_id  # "Fix flaky CI test on auth middleware"
    tasks[2].sprint_id = sprints[1].sprint_id  # "Write onboarding docs"
    tasks[3].sprint_id = sprints[1].sprint_id  # "Add dark mode toggle to settings"
    db.commit()

    _seed_time_tracking(db, workspace, board, sprints, tasks, task_defaults,
                        [owner, teammate, designer, qa_engineer], now)
    comments = _seed_epics_and_comments(db, workspace, board, [owner, teammate, designer or teammate, qa_engineer or owner], now)

    # ---- Reminders -------------------------------------------------------------
    # user_id=owner on all of these, deliberately -- same reason every Task
    # above uses owner.user_id: list_reminders() filters strictly on
    # Reminder.user_id == the logged-in caller, and teammate never logs in
    # anywhere (create_demo_account() only ever mints a token for owner).
    # This fixture originally assigned the first reminder to teammate,
    # which meant a demo login showed zero reminders despite the row
    # existing in the DB -- same class of bug already documented above for
    # Tasks, just not caught here until now.
    reminders = [
        Reminder(
            reminder_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            user_id=owner.user_id,
            title="Follow up on CRM fix",
            description="Check the Activities tab is stable after deploy",
            due_date=now + timedelta(days=1),
            repeat=None,
        ),
        Reminder(
            reminder_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            user_id=owner.user_id,
            title="Renew SSL certificate",
            due_date=now + timedelta(hours=6),
            repeat=None,
        ),
        Reminder(
            reminder_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            user_id=owner.user_id,
            title="Weekly team sync",
            description="Recurring standup, every Monday morning",
            due_date=now + timedelta(days=3),
            repeat="weekly",
        ),
        Reminder(
            reminder_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            user_id=owner.user_id,
            title="Submit expense report",
            due_date=now - timedelta(days=1),
            repeat=None,
            is_completed=True,
        ),
    ]
    db.add_all(reminders)
    db.commit()

    # ---- Calendar events (shared meetings) -------------------------------
    team = [str(u.user_id) for u in (owner, teammate, designer, qa_engineer) if u]
    day = now.replace(minute=0, second=0, microsecond=0)
    meetings = [
        ("Design sync", 1, 11, 45, "#319795", "https://meet.example.com/design", team[:3]),
        ("Sprint review", 2, 15, 60, "#3182CE", "Room 2", team),
        ("1:1 with " + teammate.first_name, 3, 10, 30, "#38A169", "", team[:2]),
    ]
    db.add_all([
        Task(
            **task_defaults,
            task_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            user_id=owner.user_id,
            title=title,
            priority=TaskPriority.MEDIUM.value,
            task_type=TaskType.MEETING.value,
            status=TaskStatus.SCHEDULED.value,
            start_time=(day + timedelta(days=offset)).replace(hour=hour),
            end_time=(day + timedelta(days=offset)).replace(hour=hour) + timedelta(minutes=minutes),
        ) for title, offset, hour, minutes, _, _, _ in meetings
    ])
    db.flush()
    for task in db.query(Task).filter(Task.workspace_id == workspace.workspace_id, Task.task_type == TaskType.MEETING.value,
                                      Task.title.in_([m[0] for m in meetings])).all():
        _, _, _, _, color, location, attendees = next(m for m in meetings if m[0] == task.title)
        task.meta_data = {"color": color, "location": location}
        task.watchers = attendees
    db.commit()

    # ---- Notifications ---------------------------------------------------------
    # Same types/wording the real events produce (utils/notifications.py);
    # ticket keys are filled in once keys are assigned, at the end.
    notifications = [
        Notification(
            notification_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            user_id=owner.user_id,
            title=f"{teammate.first_name} {teammate.last_name or ''} commented on {{key}}".replace("  ", " "),
            message="I think the activities route is missing the workspace prefix -- can you take a look?",
            type="comment",
            entity_id=tasks[0].task_id,
            entity_type="task",
            created_at=now - timedelta(minutes=12),
        ),
        Notification(
            notification_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            user_id=owner.user_id,
            title="{key} moved to In Progress",
            message=f'{teammate.first_name} changed "{tasks[2].title}" from To Do to In Progress',
            type="status_changed",
            entity_id=tasks[2].task_id,
            entity_type="task",
            created_at=now - timedelta(hours=3),
        ),
        Notification(
            notification_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            user_id=owner.user_id,
            title="{key} was assigned to you",
            message=f"{teammate.first_name} assigned you: {tasks[1].title}",
            type="assigned",
            entity_id=tasks[1].task_id,
            entity_type="task",
            is_read=True,
            created_at=now - timedelta(days=1),
        ),
    ]
    db.add_all(notifications)
    db.commit()

    # ---- Pages + Blocks (the Wiki feature, WikiDetailPage.js's block
    # editor) -- two pages, deliberately using all 7 block types between
    # them so a fresh demo shows the editor's range, not just paragraphs.
    page = Page(
        page_id=uuid.uuid4(),
        workspace_id=workspace.workspace_id,
        title="Team Handbook",
        properties={},
    )
    roadmap_page = Page(
        page_id=uuid.uuid4(),
        workspace_id=workspace.workspace_id,
        title="Product Roadmap",
        properties={},
    )
    db.add_all([page, roadmap_page])
    db.commit()

    blocks = [
        Block(block_id=uuid.uuid4(), page_id=page.page_id, order=0, type="heading",
              content={"text": "Welcome", "level": 1}),
        Block(block_id=uuid.uuid4(), page_id=page.page_id, order=1, type="paragraph",
              content={"text": "This page is how this team works -- conventions, tools, and expectations."}),
        Block(block_id=uuid.uuid4(), page_id=page.page_id, order=2, type="heading",
              content={"text": "Working agreements", "level": 2}),
        Block(block_id=uuid.uuid4(), page_id=page.page_id, order=3, type="bullet_list_item",
              content={"text": "Standup async in #team-updates by 10am"}),
        Block(block_id=uuid.uuid4(), page_id=page.page_id, order=4, type="bullet_list_item",
              content={"text": "PRs need one approval before merging"}),
        Block(block_id=uuid.uuid4(), page_id=page.page_id, order=5, type="divider", content={}),
        Block(block_id=uuid.uuid4(), page_id=page.page_id, order=6, type="heading",
              content={"text": "Onboarding checklist", "level": 2}),
        Block(block_id=uuid.uuid4(), page_id=page.page_id, order=7, type="todo",
              content={"text": "Get access to the shared workspace", "checked": True}),
        Block(block_id=uuid.uuid4(), page_id=page.page_id, order=8, type="todo",
              content={"text": "Read the CRM activities design doc", "checked": False}),
        Block(block_id=uuid.uuid4(), page_id=page.page_id, order=9, type="code",
              content={"text": "docker compose up -d\nmake load FIXTURE=ecommerce"}),
    ]
    roadmap_blocks = [
        Block(block_id=uuid.uuid4(), page_id=roadmap_page.page_id, order=0, type="heading",
              content={"text": "Product Roadmap", "level": 1}),
        Block(block_id=uuid.uuid4(), page_id=roadmap_page.page_id, order=1, type="paragraph",
              content={"text": "What's shipped, in progress, and next -- kept here instead of scattered across chat threads."}),
        Block(block_id=uuid.uuid4(), page_id=roadmap_page.page_id, order=2, type="heading",
              content={"text": "Now", "level": 2}),
        Block(block_id=uuid.uuid4(), page_id=roadmap_page.page_id, order=3, type="bullet_list_item",
              content={"text": "CRM activities routing fix"}),
        Block(block_id=uuid.uuid4(), page_id=roadmap_page.page_id, order=4, type="bullet_list_item",
              content={"text": "Dark mode"}),
        Block(block_id=uuid.uuid4(), page_id=roadmap_page.page_id, order=5, type="divider", content={}),
        Block(block_id=uuid.uuid4(), page_id=roadmap_page.page_id, order=6, type="heading",
              content={"text": "Next", "level": 2}),
        Block(block_id=uuid.uuid4(), page_id=roadmap_page.page_id, order=7, type="todo",
              content={"text": "Reminders", "checked": False}),
        Block(block_id=uuid.uuid4(), page_id=roadmap_page.page_id, order=8, type="todo",
              content={"text": "Real-time collaboration on wiki pages", "checked": False}),
        Block(block_id=uuid.uuid4(), page_id=roadmap_page.page_id, order=9, type="image",
              content={"url": "https://placehold.co/600x300?text=Roadmap+Snapshot", "caption": "Placeholder -- swap for a real screenshot"}),
    ]
    db.add_all(blocks + roadmap_blocks)
    db.commit()

    # ---- Database + DatabaseEntries (the Notion-style table feature) -------
    # Fixed columns per database, set at creation (properties["columns"]) --
    # DatabaseDetailPage.js renders these as real table headers; each entry's
    # `title` is the row's first-column value, `content` holds the rest
    # keyed by column name.
    database = Database(
        database_id=uuid.uuid4(),
        workspace_id=workspace.workspace_id,
        title="Vendors",
        description="Tracked vendors database",
        properties={"columns": ["name", "status"]},
    )
    directory_database = Database(
        database_id=uuid.uuid4(),
        workspace_id=workspace.workspace_id,
        title="Team Directory",
        description="Who's who, for quick reference",
        properties={"columns": ["name", "role", "timezone"]},
    )
    db.add_all([database, directory_database])
    db.commit()

    database_entries = [
        DatabaseEntry(entry_id=uuid.uuid4(), database_id=database.database_id, title="Acme Cloud", content={"status": "active"}),
        DatabaseEntry(entry_id=uuid.uuid4(), database_id=database.database_id, title="Beta Hosting", content={"status": "trial"}),
        DatabaseEntry(entry_id=uuid.uuid4(), database_id=database.database_id, title="Northwind Traders", content={"status": "active"}),
    ]
    directory_entries = [
        DatabaseEntry(entry_id=uuid.uuid4(), database_id=directory_database.database_id, title="Demo User", content={"role": "Owner", "timezone": "UTC"}),
        DatabaseEntry(entry_id=uuid.uuid4(), database_id=directory_database.database_id, title="Sam Teammate", content={"role": "Member", "timezone": "UTC+1"}),
    ]
    db.add_all(database_entries + directory_entries)
    db.commit()

    # ---- Templates --------------------------------------------------------
    templates = [
        Template(
            template_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            title="Bug report",
            description="Standard bug report template",
            content={"fields": ["steps_to_reproduce", "expected", "actual"]},
            tags=["bug", "template"],
        ),
    ]
    db.add_all(templates)
    db.commit()

    # ---- Activities (generic workspace activity feed, distinct from the
    # CRM-specific ContactActivity/DealActivity below) ------------------------
    activities = [
        Activity(
            activity_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            user_id=owner.user_id,
            action="created",
            entity_type="task",
            entity_id=tasks[0].task_id,
            details={"title": tasks[0].title},
        ),
        Activity(
            activity_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            user_id=teammate.user_id,
            action="commented",
            entity_type="task",
            entity_id=tasks[0].task_id,
            details={"comment_id": str(next(c.comment_id for c in comments if c.task_id == tasks[0].task_id and c.user_id == teammate.user_id))},
        ),
    ]
    db.add_all(activities)
    db.commit()

    # ---- Integrations --------------------------------------------------------
    integrations = [
        Integration(
            integration_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            name="Slack",
            type="slack",
            settings={"channel": "#general"},
            is_active=True,
        ),
    ]
    db.add_all(integrations)
    db.commit()

    # ---- CRM: Companies, Contacts, Deals, and their activities -----------------
    companies = [
        Company(
            company_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            name="Northwind Traders",
            industry="Logistics",
            website="https://northwindtraders.example.com",
            size="201-500",
            phone="+1-555-0190",
            description="Global logistics and freight forwarding.",
        ),
        Company(
            company_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            name="Globex Corp",
            industry="Manufacturing",
            website="https://globex.example.com",
            size="1001-5000",
            phone="+1-555-0191",
            description="Industrial equipment manufacturer.",
        ),
    ]
    db.add_all(companies)
    db.commit()

    contacts = [
        Contact(
            contact_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            first_name="Jordan",
            last_name="Lee",
            email="jordan.lee@example.com",
            phone="+1-555-0100",
            company="Northwind Traders",
            company_id=companies[0].company_id,
            job_title="VP Engineering",
            tags=["prospect", "enterprise"],
            status="active",
            source="referral",
        ),
        Contact(
            contact_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            first_name="Priya",
            last_name="Nair",
            email="priya.nair@example.com",
            company="Globex Corp",
            company_id=companies[1].company_id,
            job_title="Head of Ops",
            tags=["customer"],
            status="active",
            source="website",
        ),
    ]
    db.add_all(contacts)
    db.commit()

    leads = [
        Lead(
            lead_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            first_name="Alex",
            last_name="Rivera",
            email="alex.rivera@example.com",
            phone="+1-555-0210",
            company_name="Initech",
            job_title="CTO",
            source="website",
            status="new",
            notes="Downloaded the pricing sheet, hasn't been contacted yet.",
        ),
        Lead(
            lead_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            first_name="Morgan",
            last_name="Chen",
            email="morgan.chen@example.com",
            company_name="Umbrella Retail",
            job_title="Ops Director",
            source="referral",
            status="qualified",
            notes="Ready for a demo call.",
        ),
        Lead(
            lead_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            first_name="Sam",
            last_name="Okafor",
            email="sam.okafor@example.com",
            company_name="Initrode",
            job_title="Founder",
            source="cold_outreach",
            status="contacted",
        ),
        # A converted one, so the Leads view shows every stage of the funnel --
        # convert_at/converted_contact_id mimic what CRMHandler.convert_lead
        # would have set, without actually calling it (no Deal/extra Contact
        # created for this one, since that path is exercised via the API,
        # not fixtures).
        Lead(
            lead_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            first_name="Jordan",
            last_name="Lee",
            email="jordan.lee@example.com",
            company_name="Northwind Traders",
            job_title="VP Engineering",
            source="referral",
            status="converted",
            converted_at=now - timedelta(days=20),
            converted_contact_id=contacts[0].contact_id,
            converted_company_id=companies[0].company_id,
        ),
    ]
    db.add_all(leads)
    db.commit()

    lead_activities = [
        LeadActivity(
            activity_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            lead_id=leads[0].lead_id,
            user_id=owner.user_id,
            type="email",
            title="Sent intro email",
            status="completed",
            completed_at=now - timedelta(days=2),
        ),
        LeadActivity(
            activity_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            lead_id=leads[1].lead_id,
            user_id=teammate.user_id,
            type="call",
            title="Discovery call",
            scheduled_at=now + timedelta(days=1),
            status="pending",
        ),
    ]
    db.add_all(lead_activities)
    db.commit()

    deals = [
        Deal(
            deal_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            contact_id=contacts[0].contact_id,
            title="Northwind — annual contract",
            value=45000,
            currency="USD",
            stage="proposal",
            probability=60,
            expected_close_date=now + timedelta(days=30),
            status="active",
        ),
        Deal(
            deal_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            contact_id=contacts[1].contact_id,
            title="Globex — expansion",
            value=12000,
            currency="USD",
            stage="negotiation",
            probability=80,
            expected_close_date=now + timedelta(days=10),
            status="active",
        ),
    ]
    db.add_all(deals)
    db.commit()

    contact_activities = [
        ContactActivity(
            activity_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            contact_id=contacts[0].contact_id,
            user_id=owner.user_id,
            type="call",
            title="Intro call",
            description="Discussed requirements and timeline",
            scheduled_at=now - timedelta(days=3),
            completed_at=now - timedelta(days=3),
            status="completed",
        ),
        ContactActivity(
            activity_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            contact_id=contacts[1].contact_id,
            user_id=teammate.user_id,
            type="email",
            title="Sent proposal",
            status="pending",
        ),
    ]
    db.add_all(contact_activities)
    db.commit()

    deal_activities = [
        DealActivity(
            activity_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            deal_id=deals[0].deal_id,
            user_id=owner.user_id,
            type="stage_change",
            title="Moved to proposal",
            old_stage="qualified",
            new_stage="proposal",
        ),
        DealActivity(
            activity_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            deal_id=deals[1].deal_id,
            user_id=teammate.user_id,
            type="note",
            title="Champion confirmed budget",
        ),
    ]
    db.add_all(deal_activities)
    db.commit()

    # ---- Billing: Customers, Items, Quotes, Invoices, Payments ---------------
    # Billing defaults OFF (modules/billing/manifest.py) -- explicitly
    # enabled for this workspace below (see WorkspaceModule block near the
    # end of this function) so the seeded data is actually reachable
    # through the UI, not just sitting in the DB.
    bill_customers = [
        Customer(
            customer_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            name="Northwind Traders",
            email="billing@northwindtraders.example.com",
            phone="+1-555-0190",
            billing_address="500 Trade Ave, Seattle, WA",
            tax_id="US-NW-90210",
        ),
        Customer(
            customer_id=uuid.uuid4(),
            workspace_id=workspace.workspace_id,
            name="Globex Corp",
            email="ap@globex.example.com",
            phone="+1-555-0191",
            billing_address="1 Industrial Pkwy, Detroit, MI",
        ),
    ]
    db.add_all(bill_customers)
    db.commit()

    bill_items = [
        Item(item_id=uuid.uuid4(), workspace_id=workspace.workspace_id, name="Consulting Hours", description="Hourly consulting/implementation work", unit_price=150.00, tax_rate=18.00),
        Item(item_id=uuid.uuid4(), workspace_id=workspace.workspace_id, name="Onboarding Package", description="Flat-fee onboarding and setup", unit_price=2000.00, tax_rate=0.00),
        Item(item_id=uuid.uuid4(), workspace_id=workspace.workspace_id, name="Support Retainer (Monthly)", description="Monthly support retainer", unit_price=500.00, tax_rate=18.00),
    ]
    db.add_all(bill_items)
    db.commit()

    db.add(BillingSequence(workspace_id=workspace.workspace_id, next_quote_number=3, next_invoice_number=2))
    db.commit()

    # Quote 1, for Northwind -- converted to an invoice below, and linked
    # back onto deals[0] via the soft quote_id reference (Deal.quote_id
    # has no FK constraint on purpose -- see modules/crm/models.py) so the
    # "Northwind — annual contract" deal shows a real Quote/Invoice/Payment
    # trail rather than just a dollar value on a pipeline card.
    quote1 = Quote(
        quote_id=uuid.uuid4(),
        workspace_id=workspace.workspace_id,
        customer_id=bill_customers[0].customer_id,
        quote_number=1,
        issue_date=(now - timedelta(days=10)).date(),
        expiry_date=(now + timedelta(days=20)).date(),
        status="accepted",
        subtotal=3500.00,
        tax_total=270.00,
        total=3770.00,
    )
    db.add(quote1)
    db.commit()
    db.add_all([
        QuoteLine(line_id=uuid.uuid4(), quote_id=quote1.quote_id, item_id=bill_items[1].item_id, description="Onboarding Package", quantity=1, unit_price=2000.00, tax_rate=0.00, line_total=2000.00, sort_order=0),
        QuoteLine(line_id=uuid.uuid4(), quote_id=quote1.quote_id, item_id=bill_items[0].item_id, description="Consulting Hours", quantity=10, unit_price=150.00, tax_rate=18.00, line_total=1770.00, sort_order=1),
    ])
    db.commit()

    deals[0].quote_id = quote1.quote_id
    db.commit()

    invoice1 = Invoice(
        invoice_id=uuid.uuid4(),
        workspace_id=workspace.workspace_id,
        customer_id=bill_customers[0].customer_id,
        quote_id=quote1.quote_id,
        invoice_number=1,
        issue_date=(now - timedelta(days=5)).date(),
        due_date=(now + timedelta(days=15)).date(),
        status="partially_paid",
        subtotal=3500.00,
        tax_total=270.00,
        total=3770.00,
    )
    db.add(invoice1)
    db.commit()
    db.add_all([
        InvoiceLine(line_id=uuid.uuid4(), invoice_id=invoice1.invoice_id, item_id=bill_items[1].item_id, description="Onboarding Package", quantity=1, unit_price=2000.00, tax_rate=0.00, line_total=2000.00, sort_order=0),
        InvoiceLine(line_id=uuid.uuid4(), invoice_id=invoice1.invoice_id, item_id=bill_items[0].item_id, description="Consulting Hours", quantity=10, unit_price=150.00, tax_rate=18.00, line_total=1770.00, sort_order=1),
    ])
    db.commit()

    bill_payments = [
        Payment(payment_id=uuid.uuid4(), workspace_id=workspace.workspace_id, invoice_id=invoice1.invoice_id, amount=2000.00, payment_date=(now - timedelta(days=3)).date(), method="bank_transfer", reference="TXN-1001"),
    ]
    db.add_all(bill_payments)
    db.commit()

    # Quote 2, for Globex -- still just "sent", no invoice yet, so the
    # Quotes list shows more than one status.
    quote2 = Quote(
        quote_id=uuid.uuid4(),
        workspace_id=workspace.workspace_id,
        customer_id=bill_customers[1].customer_id,
        quote_number=2,
        issue_date=(now - timedelta(days=2)).date(),
        expiry_date=(now + timedelta(days=28)).date(),
        status="sent",
        subtotal=1500.00,
        tax_total=270.00,
        total=1770.00,
    )
    db.add(quote2)
    db.commit()
    db.add(QuoteLine(line_id=uuid.uuid4(), quote_id=quote2.quote_id, item_id=bill_items[2].item_id, description="Support Retainer (Monthly)", quantity=3, unit_price=500.00, tax_rate=18.00, line_total=1770.00, sort_order=0))
    db.commit()

    bill_quotes = [quote1, quote2]
    bill_invoices = [invoice1]

    # ---- Inventory: Warehouses, Products, Stock movements --------------------
    warehouses = [
        Warehouse(warehouse_id=uuid.uuid4(), workspace_id=workspace.workspace_id, name="Main Warehouse", location="Bengaluru"),
        Warehouse(warehouse_id=uuid.uuid4(), workspace_id=workspace.workspace_id, name="Overflow Storage", location="Pune"),
    ]
    db.add_all(warehouses)
    db.commit()

    products = [
        Product(product_id=uuid.uuid4(), workspace_id=workspace.workspace_id, sku="WM-100", name="Wireless Mouse", unit="pcs", unit_price=15.99, reorder_level=20),
        Product(product_id=uuid.uuid4(), workspace_id=workspace.workspace_id, sku="UC-200", name="USB-C Cable", unit="pcs", unit_price=6.50, reorder_level=50),
        Product(product_id=uuid.uuid4(), workspace_id=workspace.workspace_id, sku="MK-300", name="Mechanical Keyboard", unit="pcs", unit_price=45.00, reorder_level=10),
    ]
    db.add_all(products)
    db.commit()

    # In-then-out-then-adjustment per product -- current stock is a SUM
    # query over these, never a stored counter (see StockMovement's own
    # docstring), so the fixture needs real history, not just a starting
    # balance.
    stock_movements = [
        StockMovement(movement_id=uuid.uuid4(), workspace_id=workspace.workspace_id, product_id=products[0].product_id, warehouse_id=warehouses[0].warehouse_id, movement_type="in", quantity=100, reference="PO-1001", created_by=owner.user_id),
        StockMovement(movement_id=uuid.uuid4(), workspace_id=workspace.workspace_id, product_id=products[0].product_id, warehouse_id=warehouses[0].warehouse_id, movement_type="out", quantity=15, reference="SO-2001", created_by=teammate.user_id),
        StockMovement(movement_id=uuid.uuid4(), workspace_id=workspace.workspace_id, product_id=products[1].product_id, warehouse_id=warehouses[0].warehouse_id, movement_type="in", quantity=200, reference="PO-1002", created_by=owner.user_id),
        StockMovement(movement_id=uuid.uuid4(), workspace_id=workspace.workspace_id, product_id=products[2].product_id, warehouse_id=warehouses[1].warehouse_id, movement_type="in", quantity=30, reference="PO-1003", created_by=owner.user_id),
        StockMovement(movement_id=uuid.uuid4(), workspace_id=workspace.workspace_id, product_id=products[2].product_id, warehouse_id=warehouses[1].warehouse_id, movement_type="adjustment", quantity=-2, reference="Damaged in transit", created_by=owner.user_id),
    ]
    db.add_all(stock_movements)
    db.commit()

    # ---- HR: Employees, Leave requests, Onboarding templates ------------------
    # One Employee record per existing User -- Employee.user_id is a real
    # FK, not a copy of user data, so this links back to the same
    # owner/teammate/designer/qa_engineer accounts everything else here
    # uses. Manager chain: owner -> teammate -> qa_engineer, owner -> designer,
    # so the org chart (Employee.manager_id) actually has more than one level.
    employees = [
        Employee(employee_id=uuid.uuid4(), workspace_id=workspace.workspace_id, user_id=owner.user_id, job_title="Engineering Manager", department="Engineering", employment_type="full_time", status="active", start_date=(now - timedelta(days=730)).date(), leave_allocations={"vacation": 20, "sick": 10}),
        Employee(employee_id=uuid.uuid4(), workspace_id=workspace.workspace_id, user_id=teammate.user_id, job_title="Software Engineer", department="Engineering", employment_type="full_time", status="active", start_date=(now - timedelta(days=400)).date(), leave_allocations={"vacation": 15, "sick": 8}),
        Employee(employee_id=uuid.uuid4(), workspace_id=workspace.workspace_id, user_id=designer.user_id, job_title="Product Designer", department="Design", employment_type="full_time", status="active", start_date=(now - timedelta(days=300)).date(), leave_allocations={"vacation": 15, "sick": 8}),
        Employee(employee_id=uuid.uuid4(), workspace_id=workspace.workspace_id, user_id=qa_engineer.user_id, job_title="QA Engineer", department="Engineering", employment_type="contractor", status="active", start_date=(now - timedelta(days=60)).date(), leave_allocations={"vacation": 10, "sick": 5},
                 # Simulates having already run apply_template_to_employee()
                 # against the "Engineering Onboarding" template below --
                 # written directly here since fixtures build ORM objects,
                 # not API calls, but the shape matches exactly.
                 onboarding_checklist=[
                     {"id": str(uuid.uuid4()), "text": "Set up laptop", "done": True},
                     {"id": str(uuid.uuid4()), "text": "Access to GitHub", "done": True},
                     {"id": str(uuid.uuid4()), "text": "Meet the team", "done": False},
                     {"id": str(uuid.uuid4()), "text": "Sign NDA", "done": False},
                 ]),
    ]
    db.add_all(employees)
    db.commit()
    owner_emp, teammate_emp, designer_emp, qa_emp = employees
    teammate_emp.manager_id = owner_emp.employee_id
    designer_emp.manager_id = owner_emp.employee_id
    qa_emp.manager_id = teammate_emp.employee_id
    db.commit()

    leave_requests = [
        LeaveRequest(leave_request_id=uuid.uuid4(), workspace_id=workspace.workspace_id, employee_id=teammate_emp.employee_id, leave_type="vacation", start_date=(now - timedelta(days=10)).date(), end_date=(now - timedelta(days=6)).date(), days=5, reason="Family trip", status="approved", reviewed_by=owner_emp.employee_id, reviewed_at=now - timedelta(days=12), review_note="Enjoy!"),
        LeaveRequest(leave_request_id=uuid.uuid4(), workspace_id=workspace.workspace_id, employee_id=designer_emp.employee_id, leave_type="sick", start_date=(now + timedelta(days=2)).date(), end_date=(now + timedelta(days=2)).date(), days=1, reason="Doctor's appointment", status="pending"),
    ]
    db.add_all(leave_requests)
    db.commit()

    onboarding_templates = [
        OnboardingTemplate(template_id=uuid.uuid4(), workspace_id=workspace.workspace_id, name="Engineering Onboarding", items=["Set up laptop", "Access to GitHub", "Meet the team", "Sign NDA"]),
        OnboardingTemplate(template_id=uuid.uuid4(), workspace_id=workspace.workspace_id, name="Design Onboarding", items=["Get Figma access", "Meet the team", "Review brand guidelines"]),
    ]
    db.add_all(onboarding_templates)
    db.commit()

    # ---- School ERP: Teachers, Classes, Students, Attendance, Fees, Exams -----
    teachers = [
        Teacher(teacher_id=uuid.uuid4(), workspace_id=workspace.workspace_id, first_name="Anita", last_name="Verma", email="anita.verma@example.edu", subject_specialization="Mathematics"),
        Teacher(teacher_id=uuid.uuid4(), workspace_id=workspace.workspace_id, first_name="Rahul", last_name="Singh", email="rahul.singh@example.edu", subject_specialization="Science"),
    ]
    db.add_all(teachers)
    db.commit()

    school_classes = [
        SchoolClass(class_id=uuid.uuid4(), workspace_id=workspace.workspace_id, name="Grade 5 - A", academic_year="2026-2027", capacity=30, homeroom_teacher_id=teachers[0].teacher_id),
        SchoolClass(class_id=uuid.uuid4(), workspace_id=workspace.workspace_id, name="Grade 6 - B", academic_year="2026-2027", capacity=28, homeroom_teacher_id=teachers[1].teacher_id),
    ]
    db.add_all(school_classes)
    db.commit()

    students = [
        Student(student_id=uuid.uuid4(), workspace_id=workspace.workspace_id, first_name="Aarav", last_name="Shah", admission_number="2026-001", class_id=school_classes[0].class_id, guardian_name="Meena Shah", guardian_contact="+91-98765-00001"),
        Student(student_id=uuid.uuid4(), workspace_id=workspace.workspace_id, first_name="Diya", last_name="Mehta", admission_number="2026-002", class_id=school_classes[0].class_id, guardian_name="Rakesh Mehta", guardian_contact="+91-98765-00002"),
        Student(student_id=uuid.uuid4(), workspace_id=workspace.workspace_id, first_name="Kabir", last_name="Joshi", admission_number="2026-003", class_id=school_classes[1].class_id, guardian_name="Sunita Joshi", guardian_contact="+91-98765-00003"),
        Student(student_id=uuid.uuid4(), workspace_id=workspace.workspace_id, first_name="Sana", last_name="Ali", admission_number="2026-004", class_id=school_classes[1].class_id, guardian_name="Imran Ali", guardian_contact="+91-98765-00004"),
    ]
    db.add_all(students)
    db.commit()

    attendance_records = [
        Attendance(attendance_id=uuid.uuid4(), workspace_id=workspace.workspace_id, student_id=students[0].student_id, class_id=school_classes[0].class_id, date=now.date(), status="present", marked_by=owner.user_id),
        Attendance(attendance_id=uuid.uuid4(), workspace_id=workspace.workspace_id, student_id=students[1].student_id, class_id=school_classes[0].class_id, date=now.date(), status="absent", marked_by=owner.user_id, notes="Called in sick"),
        Attendance(attendance_id=uuid.uuid4(), workspace_id=workspace.workspace_id, student_id=students[2].student_id, class_id=school_classes[1].class_id, date=now.date(), status="present", marked_by=teammate.user_id),
        Attendance(attendance_id=uuid.uuid4(), workspace_id=workspace.workspace_id, student_id=students[3].student_id, class_id=school_classes[1].class_id, date=now.date(), status="late", marked_by=teammate.user_id),
    ]
    db.add_all(attendance_records)
    db.commit()

    fee_structures = [
        FeeStructure(fee_structure_id=uuid.uuid4(), workspace_id=workspace.workspace_id, class_id=school_classes[0].class_id, academic_year="2026-2027", term="Term 1", amount=5000, due_date=(now + timedelta(days=15)).date(), description="Term 1 tuition"),
        FeeStructure(fee_structure_id=uuid.uuid4(), workspace_id=workspace.workspace_id, class_id=school_classes[1].class_id, academic_year="2026-2027", term="Term 1", amount=5500, due_date=(now + timedelta(days=15)).date(), description="Term 1 tuition"),
    ]
    db.add_all(fee_structures)
    db.commit()

    fee_payments = [
        # Aarav paid in full, Diya only partially -- so the fee-balance
        # endpoint has something real to compute against.
        FeePayment(payment_id=uuid.uuid4(), workspace_id=workspace.workspace_id, student_id=students[0].student_id, fee_structure_id=fee_structures[0].fee_structure_id, amount=5000, payment_date=(now - timedelta(days=5)).date(), payment_method="online"),
        FeePayment(payment_id=uuid.uuid4(), workspace_id=workspace.workspace_id, student_id=students[1].student_id, fee_structure_id=fee_structures[0].fee_structure_id, amount=2000, payment_date=(now - timedelta(days=3)).date(), payment_method="cash"),
        FeePayment(payment_id=uuid.uuid4(), workspace_id=workspace.workspace_id, student_id=students[2].student_id, fee_structure_id=fee_structures[1].fee_structure_id, amount=5500, payment_date=(now - timedelta(days=2)).date(), payment_method="bank_transfer"),
    ]
    db.add_all(fee_payments)
    db.commit()

    exams = [
        Exam(exam_id=uuid.uuid4(), workspace_id=workspace.workspace_id, class_id=school_classes[0].class_id, name="Midterm", subject="Mathematics", exam_date=(now - timedelta(days=7)).date(), max_marks=100, academic_year="2026-2027"),
        Exam(exam_id=uuid.uuid4(), workspace_id=workspace.workspace_id, class_id=school_classes[1].class_id, name="Midterm", subject="Science", exam_date=(now - timedelta(days=7)).date(), max_marks=100, academic_year="2026-2027"),
    ]
    db.add_all(exams)
    db.commit()

    exam_results = [
        ExamResult(result_id=uuid.uuid4(), workspace_id=workspace.workspace_id, exam_id=exams[0].exam_id, student_id=students[0].student_id, marks_obtained=85),
        ExamResult(result_id=uuid.uuid4(), workspace_id=workspace.workspace_id, exam_id=exams[0].exam_id, student_id=students[1].student_id, marks_obtained=72, remarks="Needs more practice with fractions"),
        ExamResult(result_id=uuid.uuid4(), workspace_id=workspace.workspace_id, exam_id=exams[1].exam_id, student_id=students[2].student_id, marks_obtained=91, remarks="Excellent"),
        ExamResult(result_id=uuid.uuid4(), workspace_id=workspace.workspace_id, exam_id=exams[1].exam_id, student_id=students[3].student_id, marks_obtained=78),
    ]
    db.add_all(exam_results)
    db.commit()

    # ---- Library: Seats, Shifts, Members, Bookings, Attendance ---------------
    # Library defaults OFF (modules/library/manifest.py) -- explicitly
    # enabled for this workspace below (see WorkspaceModule block) same as
    # Billing above.
    lib_seats = [
        Seat(seat_id=uuid.uuid4(), workspace_id=workspace.workspace_id, seat_number="A1", section="Reading Hall"),
        Seat(seat_id=uuid.uuid4(), workspace_id=workspace.workspace_id, seat_number="A2", section="Reading Hall"),
        Seat(seat_id=uuid.uuid4(), workspace_id=workspace.workspace_id, seat_number="B1", section="Quiet Zone"),
    ]
    db.add_all(lib_seats)
    db.commit()

    lib_shifts = [
        Shift(shift_id=uuid.uuid4(), workspace_id=workspace.workspace_id, name="Morning", start_time=time(7, 0), end_time=time(13, 0)),
        Shift(shift_id=uuid.uuid4(), workspace_id=workspace.workspace_id, name="Evening", start_time=time(13, 0), end_time=time(21, 0)),
        Shift(shift_id=uuid.uuid4(), workspace_id=workspace.workspace_id, name="24 Hours", is_full_day=True),
    ]
    db.add_all(lib_shifts)
    db.commit()

    lib_members = [
        Member(member_id=uuid.uuid4(), workspace_id=workspace.workspace_id, name="Karan Mehta", phone="+91-98765-10001", email="karan.mehta@example.com", joined_on=(now - timedelta(days=60)).date(), status="active"),
        Member(member_id=uuid.uuid4(), workspace_id=workspace.workspace_id, name="Fatima Sheikh", phone="+91-98765-10002", email="fatima.sheikh@example.com", joined_on=(now - timedelta(days=15)).date(), status="active"),
    ]
    db.add_all(lib_members)
    db.commit()

    lib_bookings = [
        Booking(
            booking_id=uuid.uuid4(), workspace_id=workspace.workspace_id,
            member_id=lib_members[0].member_id, seat_id=lib_seats[0].seat_id, shift_id=lib_shifts[0].shift_id,
            start_date=(now - timedelta(days=30)).date(), end_date=(now + timedelta(days=30)).date(),
            fee_amount=1500.00, payment_status="paid", status="active",
        ),
        Booking(
            booking_id=uuid.uuid4(), workspace_id=workspace.workspace_id,
            member_id=lib_members[1].member_id, seat_id=lib_seats[2].seat_id, shift_id=lib_shifts[2].shift_id,
            start_date=(now - timedelta(days=10)).date(), end_date=(now + timedelta(days=20)).date(),
            fee_amount=2500.00, payment_status="pending", status="active",
        ),
    ]
    db.add_all(lib_bookings)
    db.commit()

    lib_attendance = [
        LibraryAttendance(attendance_id=uuid.uuid4(), workspace_id=workspace.workspace_id, booking_id=lib_bookings[0].booking_id, member_id=lib_members[0].member_id, date=now.date(), status="present", check_in_at=now - timedelta(hours=2)),
        LibraryAttendance(attendance_id=uuid.uuid4(), workspace_id=workspace.workspace_id, booking_id=lib_bookings[1].booking_id, member_id=lib_members[1].member_id, date=now.date(), status="absent"),
    ]
    db.add_all(lib_attendance)
    db.commit()

    # ---- Enable the opt-in modules seeded above -------------------------------
    # Billing and Library both default OFF (modules/*/manifest.py) -- a
    # workspace with no row here would 403 on every route those modules
    # gate, silently hiding all the data just created.
    db.add_all([
        WorkspaceModule(id=uuid.uuid4(), workspace_id=workspace.workspace_id, module_key="billing", enabled=True),
        WorkspaceModule(id=uuid.uuid4(), workspace_id=workspace.workspace_id, module_key="library", enabled=True),
    ])
    db.commit()

    # ---- Chat + ChatMessages (the AI assistant feature) ------------------
    chat = Chat(
        chat_id=uuid.uuid4(),
        workspace_id=workspace.workspace_id,
        user_id=owner.user_id,
        title="Getting started",
        model="gpt-3.5-turbo",
    )
    db.add(chat)
    db.commit()

    chat_messages = [
        ChatMessage(message_id=uuid.uuid4(), chat_id=chat.chat_id, role="user", content="What can you help me with?"),
        ChatMessage(message_id=uuid.uuid4(), chat_id=chat.chat_id, role="assistant", content="I can help you manage tasks, contacts, and deals in this workspace."),
    ]
    db.add_all(chat_messages)
    db.commit()

    _assign_ticket_keys(db, workspace)

    for notification in notifications:
        task = db.get(Task, notification.entity_id)
        key = TaskDtoMapper.ticket_key(task) or task.title
        notification.title = notification.title.replace("{key}", key)
        notification.properties = {"ticket_key": TaskDtoMapper.ticket_key(task)}
    db.commit()

    return {
        "board": board,
        "content_board": content_board,
        "tags": tags,
        "tasks": tasks,
        "comments": comments,
        "reminders": reminders,
        "notifications": notifications,
        "page": page,
        "blocks": blocks,
        "roadmap_page": roadmap_page,
        "roadmap_blocks": roadmap_blocks,
        "database": database,
        "database_entries": database_entries,
        "directory_database": directory_database,
        "directory_entries": directory_entries,
        "templates": templates,
        "activities": activities,
        "integrations": integrations,
        "companies": companies,
        "contacts": contacts,
        "deals": deals,
        "contact_activities": contact_activities,
        "deal_activities": deal_activities,
        "leads": leads,
        "lead_activities": lead_activities,
        "sprints": sprints,
        "bill_customers": bill_customers,
        "bill_items": bill_items,
        "bill_quotes": bill_quotes,
        "bill_invoices": bill_invoices,
        "bill_payments": bill_payments,
        "warehouses": warehouses,
        "products": products,
        "stock_movements": stock_movements,
        "employees": employees,
        "leave_requests": leave_requests,
        "onboarding_templates": onboarding_templates,
        "teachers": teachers,
        "school_classes": school_classes,
        "students": students,
        "attendance_records": attendance_records,
        "fee_structures": fee_structures,
        "fee_payments": fee_payments,
        "exams": exams,
        "exam_results": exam_results,
        "lib_seats": lib_seats,
        "lib_shifts": lib_shifts,
        "lib_members": lib_members,
        "lib_bookings": lib_bookings,
        "lib_attendance": lib_attendance,
        "chat": chat,
        "chat_messages": chat_messages,
    }


def create_fixtures(db: Session):
    """Seeds the whole dev DB: 3 users (admin/member/guest), each with
    their own default workspace (see the get_default_workspace() note
    below), plus one shared 'Acme Workspace' fully populated -- covers
    every model in adapters/orm/models/pg_models.py, not just the
    tasks/boards subset the old version of this file had (which also
    referenced TimeBlock/board_users, neither of which exist in the
    current schema -- this silently never ran)."""

    # ---- Users ----------------------------------------------------------
    users = [
        User(
            user_id=uuid.uuid4(),
            email="admin@example.com",
            password_hash=pbkdf2_sha256.hash("Admin@123"),
            first_name="Ada",
            last_name="Admin",
            avatar_url="https://i.pravatar.cc/300?img=5",
            status=UserStatus.ACTIVE.value,
            role=UserRoles.ADMIN.value,
            user_type=UserType.PREMIUM.value,
            is_email_verified=True,
        ),
        User(
            user_id=uuid.uuid4(),
            email="member@example.com",
            password_hash=pbkdf2_sha256.hash("Member@123"),
            first_name="Mia",
            last_name="Member",
            avatar_url="https://i.pravatar.cc/300?img=25",
            status=UserStatus.ACTIVE.value,
            role=UserRoles.USER.value,
            user_type=UserType.FREE.value,
            is_email_verified=True,
        ),
        User(
            user_id=uuid.uuid4(),
            email="guest@example.com",
            password_hash=pbkdf2_sha256.hash("Guest@123"),
            first_name="Gus",
            last_name="Guest",
            avatar_url="https://i.pravatar.cc/300?img=51",
            status=UserStatus.ACTIVE.value,
            role=UserRoles.GUEST.value,
            user_type=UserType.FREE.value,
            is_email_verified=False,
        ),
        # _seed_workspace_content()'s HR block (Employee "Product Designer"/
        # "QA Engineer" rows) requires designer/qa_engineer unconditionally --
        # this used to call that helper with only owner=admin,
        # teammate=member, leaving designer/qa_engineer at their None
        # defaults and crashing with AttributeError the moment run_fixtures.py
        # actually ran on a fresh DB (create_demo_account() already passed
        # both correctly, which is why only the "Try Demo" path ever worked).
        User(
            user_id=uuid.uuid4(),
            email="designer@example.com",
            password_hash=pbkdf2_sha256.hash("Designer@123"),
            first_name="Priya",
            last_name="Patel",
            avatar_url="https://i.pravatar.cc/300?img=47",
            status=UserStatus.ACTIVE.value,
            role=UserRoles.USER.value,
            user_type=UserType.FREE.value,
            is_email_verified=True,
        ),
        User(
            user_id=uuid.uuid4(),
            email="qa@example.com",
            password_hash=pbkdf2_sha256.hash("Qa@12345"),
            first_name="Jordan",
            last_name="Kim",
            avatar_url="https://i.pravatar.cc/300?img=68",
            status=UserStatus.ACTIVE.value,
            role=UserRoles.USER.value,
            user_type=UserType.FREE.value,
            is_email_verified=True,
        ),
    ]
    db.add_all(users)
    db.commit()
    admin, member, guest, designer, qa_engineer = users

    # ---- Workspace + membership ------------------------------------------
    workspace = Workspace(
        workspace_id=uuid.uuid4(),
        owner_id=admin.user_id,
        name="Acme Workspace",
        description="Fixture workspace covering every feature the app supports",
        is_default=True,
    )
    db.add(workspace)
    db.commit()

    db.execute(workspace_users.insert().values(
        workspace_id=workspace.workspace_id, user_id=admin.user_id, role="admin"
    ))
    db.execute(workspace_users.insert().values(
        workspace_id=workspace.workspace_id, user_id=member.user_id, role="member"
    ))
    db.execute(workspace_users.insert().values(
        workspace_id=workspace.workspace_id, user_id=guest.user_id, role="guest"
    ))
    db.execute(workspace_users.insert().values(
        workspace_id=workspace.workspace_id, user_id=designer.user_id, role="member"
    ))
    db.execute(workspace_users.insert().values(
        workspace_id=workspace.workspace_id, user_id=qa_engineer.user_id, role="member"
    ))
    db.commit()

    # get_default_workspace() (adapters/storage/postgresql_adapter.py) only
    # ever resolves a workspace the user OWNS with is_default=True -- being
    # a workspace_users member (like member/guest above) is not enough, the
    # same way real signup gives every new user their own default
    # workspace. Without this, member@/guest@ can log in but their
    # `default_workspace` comes back null and every workspace-scoped
    # endpoint 500s on a literal "None" workspace_id.
    member_workspace = Workspace(
        workspace_id=uuid.uuid4(),
        owner_id=member.user_id,
        name="Mia's Workspace",
        is_default=True,
    )
    guest_workspace = Workspace(
        workspace_id=uuid.uuid4(),
        owner_id=guest.user_id,
        name="Gus's Workspace",
        is_default=True,
    )
    db.add_all([member_workspace, guest_workspace])
    db.commit()

    db.execute(workspace_users.insert().values(
        workspace_id=member_workspace.workspace_id, user_id=member.user_id, role="admin"
    ))
    db.execute(workspace_users.insert().values(
        workspace_id=guest_workspace.workspace_id, user_id=guest.user_id, role="admin"
    ))
    db.commit()

    # ---- UserSettings (needs workspace_id -- the old fixtures created
    # this BEFORE the workspace existed, which would have failed the
    # not-null FK the moment this file was actually importable) ----------
    user_settings = [
        UserSettings(user_id=admin.user_id, workspace_id=workspace.workspace_id, theme="dark", language="en", timezone="UTC"),
        UserSettings(user_id=member.user_id, workspace_id=workspace.workspace_id, theme="light", language="en", timezone="UTC"),
        UserSettings(user_id=guest.user_id, workspace_id=workspace.workspace_id, theme="light", language="en", timezone="UTC"),
    ]
    db.add_all(user_settings)
    db.commit()

    content = _seed_workspace_content(db, workspace, owner=admin, teammate=member, designer=designer, qa_engineer=qa_engineer)

    return {
        "users": users,
        "user_settings": user_settings,
        "workspace": workspace,
        "member_workspace": member_workspace,
        "guest_workspace": guest_workspace,
        **content,
    }


def create_demo_account(db: Session):
    """Self-serve 'Try Demo' path: one brand-new, isolated user + owned
    workspace, fully populated via the same _seed_workspace_content() the
    dev-DB fixtures use, plus a second throwaway teammate user so the
    seeded comments/assignments have someone to attribute to. Each call
    creates a NEW account (unique random email) rather than resetting a
    shared one -- safe for multiple concurrent demo visitors, at the cost
    of accumulating demo rows over time (nothing here deletes old ones).

    Returns the new owner User plus their default Workspace so the caller
    (the /api/v1/users/demo route) can mint a real JWT and shape a
    login-response-compatible payload -- this function itself has no
    opinion on tokens/HTTP.
    """
    suffix = uuid.uuid4().hex[:8]

    # Real, stable, freely-hotlinkable photo placeholders (i.pravatar.cc) --
    # referenced directly by URL, not downloaded and re-uploaded to our own
    # Azure Blob storage. Deliberate: fixture seeding runs synchronously on
    # every real "Try Demo" click (a live, user-facing request), so making
    # it depend on fetching external images over the network would mean any
    # hiccup reaching that host slows down or breaks a real visitor's demo
    # signup. This is the same category of choice already made elsewhere in
    # this app -- get_workspace_members() (handlers/workspace_handlers.py)
    # already hands back a ui-avatars.com URL rather than storing a file --
    # just swapping a generated-initials avatar for a real-looking stock
    # photo for the users that already have a persisted avatar_url column.
    owner = User(
        user_id=uuid.uuid4(),
        email=f"demo-{suffix}@example.com",
        # Never returned or logged in anywhere -- the demo route hands the
        # caller a real JWT directly, there is no password-based login for
        # this account. Still needs SOME hash since the column is NOT NULL.
        password_hash=pbkdf2_sha256.hash(uuid.uuid4().hex),
        first_name="Demo",
        last_name="User",
        avatar_url="https://i.pravatar.cc/300?img=12",
        status=UserStatus.ACTIVE.value,
        role=UserRoles.ADMIN.value,
        user_type=UserType.FREE.value,
        is_email_verified=True,
    )
    teammate = User(
        user_id=uuid.uuid4(),
        email=f"demo-teammate-{suffix}@example.com",
        password_hash=pbkdf2_sha256.hash(uuid.uuid4().hex),
        first_name="Sam",
        last_name="Teammate",
        avatar_url="https://i.pravatar.cc/300?img=33",
        status=UserStatus.ACTIVE.value,
        role=UserRoles.USER.value,
        user_type=UserType.FREE.value,
        is_email_verified=True,
    )
    # A couple more dummy members, purely so the Members page
    # (MembersPage.js, now actually functional -- see the invite/role/
    # remove fixes earlier this session) has more than one teammate to
    # show, and so Board/Task assignee fields have a wider real cast than
    # just "Sam Teammate" every time.
    designer = User(
        user_id=uuid.uuid4(),
        email=f"demo-designer-{suffix}@example.com",
        password_hash=pbkdf2_sha256.hash(uuid.uuid4().hex),
        first_name="Priya",
        last_name="Patel",
        avatar_url="https://i.pravatar.cc/300?img=47",
        status=UserStatus.ACTIVE.value,
        role=UserRoles.USER.value,
        user_type=UserType.FREE.value,
        is_email_verified=True,
    )
    qa_engineer = User(
        user_id=uuid.uuid4(),
        email=f"demo-qa-{suffix}@example.com",
        password_hash=pbkdf2_sha256.hash(uuid.uuid4().hex),
        first_name="Jordan",
        last_name="Kim",
        avatar_url="https://i.pravatar.cc/300?img=68",
        status=UserStatus.ACTIVE.value,
        role=UserRoles.USER.value,
        user_type=UserType.FREE.value,
        is_email_verified=True,
    )
    db.add_all([owner, teammate, designer, qa_engineer])
    db.commit()

    workspace = Workspace(
        workspace_id=uuid.uuid4(),
        owner_id=owner.user_id,
        name="Demo Workspace",
        description="Sample data covering every feature -- CRM, tasks, boards, docs, chat",
        is_default=True,
    )
    db.add(workspace)
    db.commit()

    db.execute(workspace_users.insert().values(
        workspace_id=workspace.workspace_id, user_id=owner.user_id, role="admin"
    ))
    db.execute(workspace_users.insert().values(
        workspace_id=workspace.workspace_id, user_id=teammate.user_id, role="member"
    ))
    db.execute(workspace_users.insert().values(
        workspace_id=workspace.workspace_id, user_id=designer.user_id, role="member"
    ))
    db.execute(workspace_users.insert().values(
        workspace_id=workspace.workspace_id, user_id=qa_engineer.user_id, role="member"
    ))
    db.commit()

    db.add_all([
        UserSettings(user_id=owner.user_id, workspace_id=workspace.workspace_id, theme="light", language="en", timezone="UTC"),
        UserSettings(user_id=teammate.user_id, workspace_id=workspace.workspace_id, theme="light", language="en", timezone="UTC"),
        UserSettings(user_id=designer.user_id, workspace_id=workspace.workspace_id, theme="light", language="en", timezone="UTC"),
        UserSettings(user_id=qa_engineer.user_id, workspace_id=workspace.workspace_id, theme="light", language="en", timezone="UTC"),
    ])
    db.commit()

    _seed_workspace_content(db, workspace, owner=owner, teammate=teammate, designer=designer, qa_engineer=qa_engineer)

    return owner, workspace

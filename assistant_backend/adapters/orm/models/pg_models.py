from sqlalchemy import (Column, String, Boolean, DateTime, ForeignKey, Integer, Enum as SQLEnum, Table, Text, UniqueConstraint)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from .base import Base
import datetime

# Association tables
workspace_users = Table(
    'workspace_users',
    Base.metadata,
    Column('workspace_id', UUID(as_uuid=True), ForeignKey('workspaces.workspace_id'), primary_key=True),
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.user_id'), primary_key=True),
    Column('role', String(50), nullable=False, server_default='member'),
    Column('created_at', DateTime, default=datetime.datetime.now(datetime.UTC)),
    Column('updated_at', DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))
)

task_tags = Table(
    'task_tags',
    Base.metadata,
    Column('task_id', UUID(as_uuid=True), ForeignKey('tasks.task_id'), primary_key=True),
    Column('tag_id', UUID(as_uuid=True), ForeignKey('tags.id'), primary_key=True),
    Column('created_at', DateTime, default=datetime.datetime.now(datetime.UTC))
)

class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    country_code = Column(String, nullable=True)
    mobile_number = Column(String, nullable=True)
    google_id = Column(String, nullable=True)
    status = Column(String, nullable=False, default="ACTIVE")
    role = Column(String, nullable=False, default="USER")
    user_type = Column(String, nullable=False, default="FREE")
    preferences = Column(JSONB, nullable=True, default={})
    is_deleted = Column(Boolean, default=False)
    is_email_verified = Column(Boolean, default=False)
    is_phone_verified = Column(Boolean, default=False)
    avatar_url = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    verification_token = Column(String, nullable=True)
    otp = Column(String, nullable=True)
    otp_time = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    default_workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.workspace_id", use_alter=True, name="fk_users_default_workspace_id"),
        nullable=True,
    )
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))
    default_workspace = relationship("Workspace", foreign_keys=[default_workspace_id])
    workspaces = relationship("Workspace", secondary=workspace_users, back_populates="users")
    tasks = relationship("Task", foreign_keys="Task.user_id", back_populates="user")
    assigned_tasks = relationship("Task", foreign_keys="Task.assignee_id", back_populates="assignee")
    reported_tasks = relationship("Task", foreign_keys="Task.reporter_id", back_populates="reporter")
    assigned_items = relationship("BoardItem", foreign_keys="BoardItem.assignee_id", back_populates="assignee")
    comments = relationship("Comment", back_populates="user")
    activities = relationship("Activity", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    reminders = relationship("Reminder", back_populates="user")
    settings = relationship("UserSettings", back_populates="user", uselist=False)
    chats = relationship("Chat", back_populates="user")

class UserSettings(Base):
    __tablename__ = "user_settings"

    settings_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, unique=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    email_notifications = Column(Boolean, default=True)
    task_reminders = Column(Boolean, default=True)
    weekly_digest = Column(Boolean, default=True)
    language = Column(String, default="en")
    timezone = Column(String, default="UTC")
    theme = Column(String, default="light")
    preferences = Column(JSONB, nullable=True, default={})
    notification_settings = Column(JSONB, nullable=True, default={})
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))
    user = relationship("User", back_populates="settings")
    workspace = relationship("Workspace")

class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = {'extend_existing': True}

    task_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    board_id = Column(UUID(as_uuid=True), ForeignKey("boards.board_id", ondelete="SET NULL"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    priority = Column(String, nullable=False)
    task_type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    order = Column(Integer, nullable=True)
    completed = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    due_on = Column(DateTime, nullable=True)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    epic_id = Column(UUID(as_uuid=True), ForeignKey("epics.epic_id", ondelete="SET NULL"), nullable=True)
    sprint_id = Column(UUID(as_uuid=True), ForeignKey("sprints.sprint_id", ondelete="SET NULL"), nullable=True)
    # Self-referential: a subtask points at its parent via this column.
    # Kept to one level deep (a subtask's own parent_task_id must be null)
    # -- same constraint Jira enforces -- checked in the handler, not here.
    parent_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.task_id", ondelete="SET NULL"), nullable=True)
    # Sequential per-board ticket number (1, 2, 3, ...), assigned atomically
    # from the owning board's next_task_number counter at creation time.
    # Combined with Board.key it renders as "ENG-42" (see TaskDtoMapper).
    # Null when the task has no board -- boardless tasks/notes don't get a key.
    task_number = Column(Integer, nullable=True)
    # Trello-style checklist: [{"id": ..., "text": ..., "done": bool}, ...].
    # A plain JSONB list rather than a child table -- same tradeoff already
    # made for labels/watchers/tags-as-strings on this model, and a
    # checklist never needs to be queried/filtered independently of its task.
    checklist = Column(JSONB, nullable=True)
    story_points = Column(Integer, nullable=True)
    watchers = Column(JSONB, nullable=True)
    labels = Column(JSONB, nullable=True)
    meta_data = Column(JSONB, nullable=True)
    settings = Column(JSONB, nullable=True)
    public_access = Column(Boolean, default=False)
    slug = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))
    workspace = relationship("Workspace", back_populates="tasks")
    board = relationship("Board", back_populates="tasks")
    user = relationship("User", foreign_keys=[user_id], back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_tasks")
    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reported_tasks")
    epic = relationship("Epic", back_populates="tasks")
    sprint = relationship("Sprint", back_populates="tasks")
    comments = relationship("Comment", back_populates="task")
    tags = relationship("Tag", secondary=task_tags, back_populates="tasks")
    # Soft-delete cascading (when a parent is deleted, its subtasks are
    # too) is handled explicitly in TaskHandler.delete_task -- this app
    # never hard-deletes a Task, so an ORM-level delete cascade would be
    # dead weight.
    subtasks = relationship("Task", back_populates="parent_task")
    parent_task = relationship("Task", back_populates="subtasks", remote_side=[task_id])
    outgoing_links = relationship("TaskLink", foreign_keys="TaskLink.source_task_id", back_populates="source_task")
    incoming_links = relationship("TaskLink", foreign_keys="TaskLink.target_task_id", back_populates="target_task")

class TaskLink(Base):
    __tablename__ = "task_links"

    link_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    source_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.task_id", ondelete="CASCADE"), nullable=False)
    target_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.task_id", ondelete="CASCADE"), nullable=False)
    # One of: blocks, relates_to, duplicates, clones -- the inverse label
    # shown on the target side ("is blocked by" etc.) is computed, not
    # stored, so the same row answers both ends of the relationship.
    link_type = Column(String, nullable=False, default="relates_to")
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    source_task = relationship("Task", foreign_keys=[source_task_id], back_populates="outgoing_links")
    target_task = relationship("Task", foreign_keys=[target_task_id], back_populates="incoming_links")

class Workspace(Base):
    __tablename__ = "workspaces"

    workspace_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    cover = Column(String, nullable=True)
    properties = Column(JSONB, nullable=True)
    members = Column(JSONB, nullable=True)
    settings = Column(JSONB, nullable=True)
    is_public = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False)
    is_template = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))
    owner = relationship("User", foreign_keys=[owner_id])
    tasks = relationship("Task", back_populates="workspace")
    users = relationship("User", secondary=workspace_users, back_populates="workspaces")
    boards = relationship("Board", back_populates="workspace")
    pages = relationship("Page", back_populates="workspace")
    databases = relationship("Database", back_populates="workspace")
    templates = relationship("Template", back_populates="workspace")
    activities = relationship("Activity", back_populates="workspace")
    integrations = relationship("Integration", back_populates="workspace")
    comments = relationship("Comment", back_populates="workspace")
    notifications = relationship("Notification", back_populates="workspace")
    reminders = relationship("Reminder", back_populates="workspace")
    contacts = relationship("Contact", back_populates="workspace")
    deals = relationship("Deal", back_populates="workspace")
    contact_activities = relationship("ContactActivity", back_populates="workspace")
    deal_activities = relationship("DealActivity", back_populates="workspace")
    chats = relationship("Chat", back_populates="workspace")

class WorkspaceModule(Base):
    """Per-workspace on/off switch for a pluggable module (see
    modules/registry.py). A module_key with no row here is simply
    disabled -- rows only ever get created by explicitly enabling
    something, never by default, so a brand-new workspace starts with
    every module off."""
    __tablename__ = "workspace_modules"
    __table_args__ = (UniqueConstraint("workspace_id", "module_key", name="uq_workspace_module"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    module_key = Column(String, nullable=False)
    enabled = Column(Boolean, nullable=False, default=False)
    enabled_at = Column(DateTime, nullable=True)
    enabled_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

class Board(Base):
    __tablename__ = "boards"
    __table_args__ = {'extend_existing': True}

    board_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    # Short uppercase prefix for this board's tickets (e.g. "ENG"), unique
    # within the workspace -- combined with Task.task_number to render a
    # Jira-style key like "ENG-42". Auto-generated from the board name at
    # creation time; next_task_number is the atomic counter that hands out
    # task_number values (incremented via a single UPDATE...RETURNING so
    # concurrent task creates on the same board never collide).
    key = Column(String, nullable=True)
    next_task_number = Column(Integer, nullable=False, default=1, server_default="1")
    properties = Column(JSONB, nullable=True)
    views = Column(JSONB, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))
    workspace = relationship("Workspace", back_populates="boards")
    items = relationship("BoardItem", back_populates="board", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="board")
    epics = relationship("Epic", back_populates="board", cascade="all, delete-orphan")
    sprints = relationship("Sprint", back_populates="board", cascade="all, delete-orphan")

class Epic(Base):
    __tablename__ = "epics"

    epic_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    board_id = Column(UUID(as_uuid=True), ForeignKey("boards.board_id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    # Hex color used for the epic's swimlane tag/left-border on cards --
    # Jira's "epic color" convention. Free-text hex rather than an enum so
    # the frontend color picker isn't schema-constrained.
    color = Column(String, nullable=False, default="#6554C0")
    status = Column(String, nullable=False, default="open")  # open | closed
    start_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))
    board = relationship("Board", back_populates="epics")
    tasks = relationship("Task", back_populates="epic")

class Sprint(Base):
    __tablename__ = "sprints"

    sprint_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    board_id = Column(UUID(as_uuid=True), ForeignKey("boards.board_id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    goal = Column(String, nullable=True)
    status = Column(String, nullable=False, default="planned")  # planned | active | completed
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))
    board = relationship("Board", back_populates="sprints")
    tasks = relationship("Task", back_populates="sprint")

class BoardItem(Base):
    __tablename__ = "board_items"

    item_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    board_id = Column(UUID(as_uuid=True), ForeignKey("boards.board_id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    properties = Column(JSONB, nullable=True)
    order = Column(Integer, nullable=True)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))
    board = relationship("Board", back_populates="items")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_items")

class Reminder(Base):
    __tablename__ = "reminders"

    reminder_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=False)
    repeat = Column(String, nullable=True)
    properties = Column(JSONB, nullable=True)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))
    workspace = relationship("Workspace", back_populates="reminders")
    user = relationship("User", back_populates="reminders")

class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    entity_type = Column(String, nullable=True)
    properties = Column(JSONB, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))
    workspace = relationship("Workspace", back_populates="notifications")
    user = relationship("User", back_populates="notifications")

class Comment(Base):
    __tablename__ = "comments"

    comment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.task_id"), nullable=True)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    entity_type = Column(String, nullable=True)
    content = Column(String, nullable=False)
    properties = Column(JSONB, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))
    workspace = relationship("Workspace", back_populates="comments")
    user = relationship("User", back_populates="comments")
    task = relationship("Task", back_populates="comments")

class Tag(Base):
    __tablename__ = "tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True)
    color = Column(String, default="#808080")
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    tasks = relationship("Task", secondary=task_tags, back_populates="tags")

class Page(Base):
    __tablename__ = "pages"

    page_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    # Confluence-style page tree -- null for a top-level page. ON DELETE
    # SET NULL so deleting a parent promotes its children to top-level
    # rather than orphaning/cascading (same "unlink don't cascade" rule
    # used for Epic/Sprint/Company deletion elsewhere in this app).
    parent_page_id = Column(UUID(as_uuid=True), ForeignKey("pages.page_id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    content = Column(JSONB, nullable=True)
    properties = Column(JSONB, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    workspace = relationship("Workspace", back_populates="pages")
    blocks = relationship("Block", back_populates="page")
    parent = relationship("Page", remote_side=[page_id], backref="children")

class Block(Base):
    __tablename__ = "blocks"

    block_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    page_id = Column(UUID(as_uuid=True), ForeignKey("pages.page_id"), nullable=False)
    type = Column(String, nullable=False)
    content = Column(JSONB, nullable=True)
    properties = Column(JSONB, nullable=True)
    order = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    page = relationship("Page", back_populates="blocks")

class Database(Base):
    __tablename__ = "databases"

    database_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    properties = Column(JSONB, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    workspace = relationship("Workspace", back_populates="databases")
    entries = relationship("DatabaseEntry", back_populates="database")

class DatabaseEntry(Base):
    __tablename__ = "database_entries"

    entry_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    database_id = Column(UUID(as_uuid=True), ForeignKey("databases.database_id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(JSONB, nullable=True)
    properties = Column(JSONB, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    database = relationship("Database", back_populates="entries")

class Template(Base):
    __tablename__ = "templates"

    template_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    cover = Column(String, nullable=True)
    content = Column(JSONB, nullable=True)
    properties = Column(JSONB, nullable=True)
    tags = Column(JSONB, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    workspace = relationship("Workspace", back_populates="templates")

class Activity(Base):
    __tablename__ = "activities"

    activity_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    details = Column(JSONB, nullable=True)
    properties = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    workspace = relationship("Workspace", back_populates="activities")
    user = relationship("User", back_populates="activities")

class Integration(Base):
    __tablename__ = "integrations"

    integration_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    settings = Column(JSONB, nullable=True)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    workspace = relationship("Workspace", back_populates="integrations")

class Chat(Base):
    __tablename__ = "chats"

    chat_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    title = Column(String, nullable=False)
    model = Column(String, nullable=False, default="gpt-3.5-turbo")  # The AI model being used
    context = Column(JSONB, nullable=True)  # Additional context for the chat
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    workspace = relationship("Workspace", back_populates="chats")
    user = relationship("User", back_populates="chats")
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    message_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(UUID(as_uuid=True), ForeignKey("chats.chat_id"), nullable=False)
    role = Column(String, nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    message_metadata = Column(JSONB, nullable=True)  # Additional metadata like tokens used, etc.
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    chat = relationship("Chat", back_populates="messages")
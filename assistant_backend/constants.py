from enum import Enum
import uuid


class UserStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    DELETED = "deleted"

class TaskStatus(Enum):
    TODO = "todo"                     # Not yet started
    BACKLOG = "backlog"               # Collected but not prioritized
    IN_PROGRESS = "in_progress"       # Actively being worked on
    BLOCKED = "blocked"               # Waiting on external/unresolved item
    REVIEW = "review"                 # Under QA or peer review
    APPROVED = "approved"             # Accepted but not yet deployed
    DONE = "done"                     # Finished and accepted
    CANCELLED = "cancelled"           # No longer needed or stopped
    ARCHIVED = "archived"             # Historical, hidden by default
    SCHEDULED = "scheduled"           # Planned for future
    ON_HOLD = "on_hold"               # Delayed or paused

class TaskType(Enum):
    TASK = "task"                    # General task
    STORY = "story"                  # Agile story
    TODO = "todo"                    # Simple to-do item
    NOTE = "note"                    # Informational note
    QUICK_NOTE = "quick_note"        # Fast, informal note
    BUG = "bug"                      # Defect or issue
    FEATURE = "feature"              # New functionality
    ENHANCEMENT = "enhancement"      # Improvement to existing feature
    MEETING = "meeting"              # Meeting item
    REMINDER = "reminder"            # Time-based trigger
    IDEA = "idea"                    # Unrefined thought
    DOCUMENT = "document"            # Long-form content
    RESEARCH = "research"            # Exploration or investigation
    QUESTION = "question"            # Open item requiring answer
    TIME_BLOCK = "time_block"        # Time block
    CUSTOM = "custom"                # User-defined or unclassified type


# Personal items: private to their author.
PERSONAL_TASK_TYPES = (TaskType.NOTE.value, TaskType.QUICK_NOTE.value, TaskType.TIME_BLOCK.value)
# Never given a Jira-style key: personal items, plus calendar events
# (meetings are shared with the workspace but aren't work items).
UNTICKETED_TASK_TYPES = PERSONAL_TASK_TYPES + (TaskType.MEETING.value,)



class UserRoles(Enum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"


class UserType(Enum):
    FREE = "free"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"

class TaskPriority(Enum):
    NONE = "none"             # No priority assigned
    LOW = "low"               # Non-urgent, nice to have
    MEDIUM = "medium"         # Standard/default importance
    HIGH = "high"             # Time-sensitive
    URGENT = "urgent"         # Critical and immediate

    P0 = "p0"                 # Highest priority: immediate attention
    P1 = "p1"                 # Very important: must resolve quickly
    P2 = "p2"                 # Important but not urgent
    P3 = "p3"                 # Low urgency, minor fixes/features
    P4 = "p4"                 # Very low priority or backlog grooming

    CUSTOM = "custom"         # User-defined or contextual



class OID(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        try:
            return str(uuid.UUID(v))
        except ValueError:
            raise ValueError("Not a valid UUID")

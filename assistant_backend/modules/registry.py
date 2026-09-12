"""The plug-and-play module registry.

Three kinds of entries live here:

1. Fresh modules built as self-contained packages under modules/ (see
   modules/inventory/ for the template: its own models/commands/dto/
   handlers/controller/manifest.py exposing a `MANIFEST`). These are
   auto-discovered at import time by _discover_packaged_modules() below --
   dropping a new modules/<key>/ package into place is enough to register
   it. Nothing else in the app (not this file, not main.py, not the
   frontend nav) needs to be told it exists ahead of time; main.py
   includes every router in ALL_MODULES, and the frontend reads the same
   manifests back through GET /workspaces/{id}/modules.
   See MODULES.md for the full guide.

2. Pre-existing features (Wiki, Database, Chat, Reports, Reminders,
   Notifications, Templates, Activity, Comments, Epics, Sprints, Task
   Links, AI Assistant) that were always-on before this registry existed
   and got "adopted" into it -- their code stays exactly where it already
   lived (controllers/, handlers/, commands/, dto/), only their routes
   gained a require_module_enabled(key, default_enabled=True) gate (see
   e.g. controllers/page_controller.py). The AI Assistant is the one
   exception: its route takes workspace_id from the request body, not the
   URL path, so it can't use require_module_enabled's path-param-binding
   dependency and instead calls modules.access.is_module_enabled() by
   hand (see controllers/assistant_controller.py). They're declared as
   manifests directly below (ADOPTED_MODULES) instead of getting their
   own modules/<key>/ package, since there's no new code to house -- this
   list is a one-time migration record, not an ongoing extension point.
   CRM used to be here too -- it's now a full modules/crm/ package (the
   first "adopted" feature actually migrated into one), which is why
   ADOPTED_MODULES below is shorter than this docstring's feature list.

3. "Nav-only" modules (Tasks, Boards, Notes, Calendar, Time Blocking --
   NAV_ONLY_MODULES below) whose routes are deliberately left ungated.
   See the comment above NAV_ONLY_MODULES for why: they're core/
   foundational data (or, for Notes/Time Blocking, a thin layer over it),
   and hard-gating them the way ADOPTED_MODULES is gated would cascade
   into breaking most of the rest of the app for that workspace. The
   toggle for these is enforced client-side only (FeatureDisabledPage.js).
"""
import importlib
import logging
import pkgutil

from fastapi import APIRouter

from controllers.page_controller import page_router
from controllers.database_controller import database_router
from controllers.chat_controller import chat_router
from controllers.reports_controller import reports_router
from controllers.reminder_controller import reminder_router
from controllers.notification_controller import notification_router
from controllers.template_controller import template_router
from controllers.activity_controller import activity_router
from controllers.comment_controller import comment_router
from controllers.epic_controller import epic_router
from controllers.sprint_controller import sprint_router
from controllers.timeblock_controller import timeblock_router
from controllers.task_link_controller import task_link_router
from controllers.assistant_controller import assistant_router
from controllers.tasks_controller import tasks_router
from controllers.board_controller import board_router
from .manifest import ModuleManifest

logger = logging.getLogger(__name__)

# Files in modules/ that are registry infrastructure, not modules
# themselves -- iter_modules would otherwise try (and fail) to treat them
# as packages to discover.
_RESERVED_NAMES = {"access", "manifest", "registry"}

ADOPTED_MODULES = [
    ModuleManifest(key="wiki", name="Wiki", description="Nested pages and documents.", icon="book", router=page_router, default_enabled=True),
    ModuleManifest(key="database", name="Database", description="Structured tables with custom columns.", icon="database", router=database_router, default_enabled=True),
    ModuleManifest(key="chat", name="Chat", description="AI-assisted chat threads.", icon="chat", router=chat_router, default_enabled=True),
    ModuleManifest(key="reports", name="Reports", description="Workspace analytics and charts.", icon="chart", router=reports_router, default_enabled=True),
    ModuleManifest(key="reminders", name="Reminders", description="Time-based reminders.", icon="bell", router=reminder_router, default_enabled=True),
    ModuleManifest(key="notifications", name="Notifications", description="In-app notification feed.", icon="inbox", router=notification_router, default_enabled=True),
    ModuleManifest(key="templates", name="Templates", description="Reusable page/task templates.", icon="layout", router=template_router, default_enabled=True),
    ModuleManifest(key="activity", name="Activity", description="Workspace activity feed.", icon="activity", router=activity_router, default_enabled=True),
    ModuleManifest(key="comments", name="Comments", description="Task comments and discussions.", icon="message-circle", router=comment_router, default_enabled=True),
    ModuleManifest(key="epics", name="Epics", description="Group board work into epics.", icon="flag", router=epic_router, default_enabled=True),
    ModuleManifest(key="sprints", name="Sprints", description="Time-boxed sprints for board work.", icon="repeat", router=sprint_router, default_enabled=True),
    ModuleManifest(key="task_links", name="Task Links", description="Link related tasks together.", icon="link", router=task_link_router, default_enabled=True),
    ModuleManifest(key="assistant", name="AI Assistant", description="Natural-language workspace commands.", icon="cpu", router=assistant_router, default_enabled=True),
]

# Calendar and Notes have no dedicated backend routes of their own --
# Calendar's frontend page is currently a local-state stub not wired to
# any API, and Notes is just Tasks filtered by task_type=NOTE through the
# core /tasks endpoint (see services/taskservice.js's getAllNotes/
# retrieveNotes). These empty routers exist only so each has something to
# satisfy ModuleManifest.router and show up in GET /modules like every
# other entry.
_calendar_router = APIRouter()
_notes_router = APIRouter()

# Tasks, Boards, Notes, Calendar, and Time Blocking are "nav-only"
# toggles: their routes are deliberately NOT wrapped in
# require_module_enabled, unlike everything in ADOPTED_MODULES above.
# Tasks and Boards are this app's foundational data model -- Notes and
# Time Blocking are just Tasks with a different task_type, board cards
# are Tasks, and Comments/Epics/Sprints/Task Links all attach to a Task
# or Board. Hard-gating the API the way Inventory/CRM/etc. are gated
# would cascade: disabling "Tasks" for a workspace would break Notes,
# Time Blocking, Comments, Epics, Sprints, and Task Links all at once.
# Instead, the toggle here only controls whether the frontend shows the
# nav entry and renders the page (see FeatureDisabledPage.js) -- the API
# stays reachable so nothing downstream breaks. Don't "fix" these by
# adding require_module_enabled; that's the CRM/Inventory pattern, not
# this one.
NAV_ONLY_MODULES = [
    ModuleManifest(key="tasks", name="Tasks", description="Task list and kanban view.", icon="check-square", router=tasks_router, default_enabled=True),
    ModuleManifest(key="boards", name="Boards", description="Kanban boards for organizing tasks.", icon="kanban", router=board_router, default_enabled=True),
    ModuleManifest(key="notes", name="Notes", description="Freeform notes (tasks of type NOTE).", icon="book", router=_notes_router, default_enabled=True),
    ModuleManifest(key="calendar", name="Calendar", description="Calendar view of tasks and events.", icon="calendar", router=_calendar_router, default_enabled=True),
    ModuleManifest(key="timeblocks", name="Time Blocking", description="Calendar time blocks for tasks.", icon="clock", router=timeblock_router, default_enabled=True),
]


def _packaged_module_names():
    """Every subpackage of modules/ that isn't registry infrastructure --
    a candidate to check for a manifest.py, not yet confirmed to have one."""
    import modules as _modules_pkg
    return [
        name for _, name, is_pkg in pkgutil.iter_modules(_modules_pkg.__path__)
        if is_pkg and name not in _RESERVED_NAMES
    ]


def _discover_packaged_modules():
    """Import each candidate package's manifest.py and collect its
    MANIFEST. A module that fails to import (typo, missing MANIFEST,
    broken dependency) is skipped with a logged warning rather than
    crashing the whole app -- one broken module shouldn't take every
    other module (or the app itself) down with it."""
    discovered = []
    for name in _packaged_module_names():
        try:
            manifest_module = importlib.import_module(f"modules.{name}.manifest")
            manifest = manifest_module.MANIFEST
        except Exception:
            logger.exception(f"Skipping module '{name}': failed to load modules/{name}/manifest.py")
            continue
        if not isinstance(manifest, ModuleManifest):
            logger.error(f"Skipping module '{name}': manifest.MANIFEST is not a ModuleManifest")
            continue
        discovered.append(manifest)
    return discovered


ALL_MODULES = ADOPTED_MODULES + NAV_ONLY_MODULES + _discover_packaged_modules()
MODULES_BY_KEY = {m.key: m for m in ALL_MODULES}


def get_manifest(key: str):
    return MODULES_BY_KEY.get(key)


def import_all_module_models():
    """Import every auto-discovered module's models submodule (if it has
    one) so its tables register on Base.metadata -- needed by
    adapters.orm.models.database.init_db()'s create_all() (the test
    suite's schema reset) and by migrations/env.py's autogenerate target,
    since a model class that's never imported anywhere is invisible to
    SQLAlchemy. Adopted pre-existing features (that still live in
    pg_models.py) don't need this -- init_db() already imports that
    module directly."""
    for name in _packaged_module_names():
        try:
            importlib.import_module(f"modules.{name}.models")
        except ModuleNotFoundError:
            pass  # This module has no models.py -- not every module needs its own tables.
        except Exception:
            logger.exception(f"Skipping model import for module '{name}'")

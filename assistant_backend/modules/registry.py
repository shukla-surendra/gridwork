"""The plug-and-play module registry.

Two kinds of entries live here:

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
   Notifications, Templates) that were always-on before this registry
   existed and got "adopted" into it -- their code stays exactly where it
   already lived (controllers/, handlers/, commands/, dto/), only their
   routes gained a require_module_enabled(key, default_enabled=True) gate
   (see e.g. controllers/page_controller.py). They're declared as
   manifests directly below (ADOPTED_MODULES) instead of getting their
   own modules/<key>/ package, since there's no new code to house -- this
   list is a one-time migration record, not an ongoing extension point.
   CRM used to be here too -- it's now a full modules/crm/ package (the
   first "adopted" feature actually migrated into one), which is why
   ADOPTED_MODULES below is one entry shorter than this docstring's
   original list.
"""
import importlib
import logging
import pkgutil

from controllers.page_controller import page_router
from controllers.database_controller import database_router
from controllers.chat_controller import chat_router
from controllers.reports_controller import reports_router
from controllers.reminder_controller import reminder_router
from controllers.notification_controller import notification_router
from controllers.template_controller import template_router
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


ALL_MODULES = ADOPTED_MODULES + _discover_packaged_modules()
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

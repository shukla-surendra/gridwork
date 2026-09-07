from modules.manifest import ModuleManifest
from .controller import hr_router

MANIFEST = ModuleManifest(
    key="hr",
    name="HR",
    description="Employee directory, leave requests, onboarding, and org chart.",
    icon="users",
    router=hr_router,
    default_enabled=True,
)

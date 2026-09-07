from modules.manifest import ModuleManifest
from .controller import crm_router

MANIFEST = ModuleManifest(
    key="crm",
    name="CRM",
    description="Contacts, deals, and activity tracking.",
    icon="users",
    router=crm_router,
    default_enabled=True,
)

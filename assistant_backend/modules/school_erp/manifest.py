from modules.manifest import ModuleManifest
from .controller import school_erp_router

MANIFEST = ModuleManifest(
    key="school_erp",
    name="School ERP",
    description="Students, classes, attendance, fees, and exam results.",
    icon="school",
    router=school_erp_router,
    default_enabled=True,
)

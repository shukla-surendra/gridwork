from modules.manifest import ModuleManifest
from .controller import billing_router

MANIFEST = ModuleManifest(
    key="billing",
    name="Invoicing & Billing",
    description="Customers, quotes, invoices, and payments.",
    icon="receipt",
    router=billing_router,
    default_enabled=False,
)

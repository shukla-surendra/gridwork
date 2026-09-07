from modules.manifest import ModuleManifest
from .controller import inventory_router

MANIFEST = ModuleManifest(
    key="inventory",
    name="Inventory",
    description="Products, warehouses, and stock movements.",
    icon="box",
    router=inventory_router,
    default_enabled=True,
)

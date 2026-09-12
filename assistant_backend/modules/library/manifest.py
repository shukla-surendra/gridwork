from modules.manifest import ModuleManifest
from .controller import library_router

MANIFEST = ModuleManifest(
    key="library",
    name="Library",
    description="Seats, shifts, members, bookings, and attendance for a seat-rental library.",
    icon="book-open",
    router=library_router,
    default_enabled=False,
)

import asyncio
import logging
import uvicorn
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from mangum import Mangum
from sqlalchemy.orm import Session

from config import settings
from utils.error_handlers import (
    APIError,
    validation_exception_handler,
    api_error_handler,
    sqlalchemy_error_handler,
    general_exception_handler
)
from docs.api_docs import custom_openapi
from middleware.rate_limit import RateLimitMiddleware
from adapters.orm.models.database import engine, get_db
from controllers import (
    settings_router,
    public_router,
    workspace_router,
    users_router,
    queue_router,
)
# Not part of the controllers/__init__.py barrel -- see that file for why
# (module_controller -> modules.registry -> controllers barrel would be a
# circular import). page_router/database_router/activity_router/
# tasks_router/board_router/etc. are likewise not imported here: they're
# mounted once each, below, via ALL_MODULES.
from controllers.module_controller import module_router
from modules.registry import ALL_MODULES
from workers.queue_consumer import run_consumer
from observability import setup_telemetry

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    # Create FastAPI app
    app = FastAPI(
        title="GridWork API",
        description="GridWork's workspace API -- tasks, boards, wiki, CRM, and pluggable modules",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json"
    )

    # Set custom OpenAPI schema
    app.openapi = lambda: custom_openapi(app)

    # No-op if OTEL_EXPORTER_OTLP_ENDPOINT isn't set (see observability.py).
    # Must run before any request is served -- FastAPIInstrumentor wraps
    # the app's own request-handling, not something that can be bolted on
    # after routes are already being hit.
    setup_telemetry(app)

    # Register exception handlers
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(APIError, api_error_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    # Add rate limiting middleware
    app.add_middleware(RateLimitMiddleware)

    # Include routers
    app.include_router(settings_router)
    app.include_router(public_router)
    app.include_router(workspace_router)
    app.include_router(users_router)
    app.include_router(queue_router)
    app.include_router(module_router)

    # Plug-and-play modules -- brand-new ones (Inventory), pre-existing
    # features hard-gated via require_module_enabled after being adopted
    # into the registry (CRM, Wiki, Database, Chat, Reports, Reminders,
    # Notifications, Templates, Activity, Comments, Epics, Sprints, Task
    # Links, AI Assistant), and "nav-only" modules whose API is
    # deliberately left ungated because they're core/foundational (Tasks,
    # Boards, Notes, Calendar, Time Blocking -- see NAV_ONLY_MODULES in
    # modules/registry.py for why). Each entry in ALL_MODULES brings its
    # own router; adding a new module means editing modules/registry.py,
    # not this file.
    for module in ALL_MODULES:
        app.include_router(module.router)

    # Configure CORS with environment-based settings
    allowed_origins = settings.ALLOWED_ORIGINS.split(",") if settings.ALLOWED_ORIGINS else []
    allowed_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    allowed_headers = ["*"]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=allowed_methods,
        allow_headers=allowed_headers,
        expose_headers=["Content-Range", "X-Content-Range"],
        max_age=600,  # Cache preflight requests for 10 minutes
    )

    # Create AWS Lambda handler
    handler = Mangum(app)

    @app.get("/")
    async def root():
        return {"message": "Welcome to the Assistant Backend API"}

    @app.get("/health")
    async def health_check(db: Session = Depends(get_db)):
        try:
            # Check database connection
            db.execute(text("SELECT 1"))
            db_status = "healthy"
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            db_status = "unhealthy"

        return {
            "status": "healthy",
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
            "database": db_status
        }

    # Module-level (not app.state) so the shutdown handler below can reach
    # them without threading state through FastAPI's app object -- this
    # process only ever runs one app instance anyway.
    _consumer_stop_event = asyncio.Event()
    _consumer_task = None

    @app.on_event("startup")
    async def startup_event():
        """Log that the app is up. Schema creation/changes are Alembic's job
        now (`alembic upgrade head`), run before the app starts -- not here.
        Rebuilding the schema on every app boot was destroying real data on
        every restart, which is fatal once this runs somewhere pods restart
        routinely (crash-loops, rolling updates, autoscaling).

        Also starts the queue consumer as a background task -- a no-op if
        the queue isn't configured (see workers/queue_consumer.py's
        QUEUE_AVAILABLE check). Under KEDA, every scaled-up replica of this
        pod runs its own copy of this loop, all polling the same queue."""
        global _consumer_task
        _consumer_task = asyncio.create_task(run_consumer(_consumer_stop_event))
        logger.info("Application startup")

    @app.on_event("shutdown")
    async def shutdown_event():
        """Cleanup on shutdown."""
        # Stop the queue consumer first -- let it finish whatever message
        # it's mid-processing rather than killing it mid-flight, so a pod
        # scaling down doesn't silently drop work that would otherwise
        # have completed and been deleted (acked) cleanly.
        _consumer_stop_event.set()
        if _consumer_task:
            await _consumer_task
        # Close database connections
        engine.dispose()
        logger.info("Database connections closed")

except Exception as e:
    logger.error(f"Failed to initialize application: {str(e)}")
    raise

if __name__ == "__main__":
    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            log_level="info",
            reload=True
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        raise

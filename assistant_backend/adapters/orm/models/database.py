""" database connection """
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from config import get_config
import logging
import time
import sys

logger = logging.getLogger(__name__)
config = get_config()

def create_db_engine():
    """Create database engine with retry logic"""
    max_retries = 5
    retry_delay = 5  # seconds
    
    for attempt in range(max_retries):
        try:
            SQLALCHEMY_DATABASE_URL = config.database_url
            logger.info(f"Attempting to connect to database "
                        f"at {config.db_host}:{config.db_port} (attempt {attempt + 1}/{max_retries})")

            engine = create_engine(
                SQLALCHEMY_DATABASE_URL,
                pool_size=20,
                max_overflow=30,
                pool_timeout=60,
                pool_recycle=1800,
                pool_pre_ping=True,
                echo=config.environment == "development",
                # A session that opens a transaction (any query does,
                # implicitly) and then never commits/rolls back -- e.g. a
                # container getting killed/restarted mid-request, or a
                # request handler that errors before reaching its
                # `finally: db.close()` -- otherwise sits there forever,
                # holding row locks that queue up and wedge every later
                # request touching the same rows (observed directly: a
                # single such zombie connection blocked new demo-account
                # creation, migrations, and the test suite's schema reset,
                # each stacking further sessions behind it). Postgres itself
                # kills any connection that goes idle-in-transaction past
                # this, so a zombie clears on its own instead of needing a
                # manual pg_terminate_backend.
                connect_args={"options": "-c idle_in_transaction_session_timeout=30000"},
            )
            
            # Test the connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                conn.commit()
            
            logger.info("Successfully connected to database")
            return engine
            
        except SQLAlchemyError as e:
            logger.error(f"Database connection attempt {attempt + 1} failed: {str(e)}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                logger.error("Max retries reached. Could not connect to database.")
                sys.exit(1)

try:
    engine = create_db_engine()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def init_db():
        """Initialize the database by creating all tables"""
        from .base import Base
        # Import models in the correct order to ensure proper table creation
        from .pg_models import (
            User,
            UserSettings,
            Workspace,
            Board,
            BoardItem,
            Task,
            Reminder,
            Notification,
            Comment,
            Tag,
            Page,
            Block,
            Database,
            DatabaseEntry,
            Template,
            Activity,
            Integration,
            Chat,
            ChatMessage,
            Epic,
            Sprint,
            TaskLink,
            WorkspaceModule
        )
        # Modules (ERP etc.) register their own tables on the same Base --
        # this import is what makes create_all below see them.
        from modules.registry import import_all_module_models
        import_all_module_models()
        
        # Drop all tables first to ensure clean state
        Base.metadata.drop_all(bind=engine)

        # Create every table registered on Base.metadata (all 23 models imported
        # above), in FK-dependency order. Previously this hand-wrote CREATE TABLE
        # for only users/workspaces/boards/tasks, so every other table (settings,
        # reminders, notifications, comments, tags, pages, templates, activities,
        # contacts, deals, chat, ...) never actually got created.
        Base.metadata.create_all(bind=engine)

        logger.info("Database tables created successfully")

except Exception as e:
    logger.error(f"Failed to initialize database connection: {str(e)}")
    raise

from logging.config import fileConfig
import os
import sys
from alembic import context
from sqlalchemy import engine_from_config, pool

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Import your models
from adapters.orm.models.pg_models import Base  # noqa: F401 -- importing this registers every model on Base.metadata
# Packaged plug-and-play modules (modules/<key>/models.py) define their
# tables on this same Base but were never otherwise imported here --
# without this, autogenerate's diff wouldn't know these tables exist and
# could propose DROPping them (present in the real DB, absent from
# target_metadata). Same Base instance everywhere means this alone is
# enough to register them; no per-module import needed.
from modules.registry import import_all_module_models  # noqa: F401
import_all_module_models()
from config import settings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set the database URL in the alembic.ini file
config.set_main_option("sqlalchemy.url", settings.database_url)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online() 
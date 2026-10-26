from pydantic_settings import BaseSettings
from pydantic import model_validator, computed_field
from functools import lru_cache
import logging
from typing import Optional
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    environment: str = os.getenv("ENVIRONMENT", "development")  # Added for backward compatibility
    
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Assistant API"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"
    
    # CORS Settings
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:8000"  # Default development origins
    )
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@db:5432/productify"
    )
    
    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # AWS
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Avatar storage (Azure Blob in AKS, Azurite locally -- same SDK either
    # way, see adapters/blob/azure_blob_storage.py). Exactly one of
    # AZURE_STORAGE_CONNECTION_STRING (local/Azurite) or
    # AZURE_STORAGE_ACCOUNT_URL (AKS, authenticates via Workload Identity)
    # is expected to be set.
    AZURE_STORAGE_CONNECTION_STRING: Optional[str] = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    AZURE_STORAGE_ACCOUNT_URL: Optional[str] = os.getenv("AZURE_STORAGE_ACCOUNT_URL")
    AZURE_STORAGE_CONTAINER: str = os.getenv("AZURE_STORAGE_CONTAINER", "avatars")
    # Browser-facing base URL for building returned avatar links -- Azurite's
    # internal (docker-network) endpoint isn't reachable from the browser, so
    # this is set separately from the endpoint the SDK itself connects
    # through. Defaults to AZURE_STORAGE_ACCOUNT_URL, which already is
    # publicly reachable in AKS.
    AZURE_STORAGE_PUBLIC_BASE_URL: Optional[str] = os.getenv("AZURE_STORAGE_PUBLIC_BASE_URL")

    # KEDA scaling-test job queue (same account as avatars -- a Storage
    # Account hosts blob+queue+table+file). AZURE_STORAGE_QUEUE_URL is the
    # queue-service endpoint (https://<acct>.queue.core.windows.net),
    # distinct from AZURE_STORAGE_ACCOUNT_URL's blob-service endpoint --
    # same account, different service. Empty means the queue
    # producer/consumer/background poller are all inert (adapters/queue's
    # QUEUE_AVAILABLE flag), same graceful-absence pattern as blob storage.
    AZURE_STORAGE_QUEUE_URL: Optional[str] = os.getenv("AZURE_STORAGE_QUEUE_URL")
    AZURE_STORAGE_QUEUE_NAME: str = os.getenv("AZURE_STORAGE_QUEUE_NAME", "backend-jobs")
    AZURE_STORAGE_QUEUE_POISON_NAME: str = os.getenv("AZURE_STORAGE_QUEUE_POISON_NAME", "backend-jobs-poison")
    # SQS-style maxReceiveCount: a message dequeued more than this many
    # times without being deleted (i.e. processing keeps failing) gets
    # moved to the poison queue instead of retried forever.
    AZURE_QUEUE_MAX_DELIVERY_COUNT: int = int(os.getenv("AZURE_QUEUE_MAX_DELIVERY_COUNT", "5"))
    # How long a received-but-unprocessed message stays invisible to other
    # consumers before it's eligible for redelivery -- SQS calls this the
    # same thing. Must comfortably exceed how long processing actually
    # takes, or a still-in-progress message gets picked up by a second
    # consumer too.
    AZURE_QUEUE_VISIBILITY_TIMEOUT_SECONDS: int = int(os.getenv("AZURE_QUEUE_VISIBILITY_TIMEOUT_SECONDS", "30"))

    # Traces + metrics -> the shared OTel Collector (terraform/observability),
    # a cluster-wide service, not something this app owns. Empty means
    # instrumentation never activates (see observability.py's OTEL_AVAILABLE
    # check) -- same graceful-absence pattern as the queue/blob settings above.
    OTEL_EXPORTER_OTLP_ENDPOINT: Optional[str] = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    OTEL_SERVICE_NAME: str = os.getenv("OTEL_SERVICE_NAME", "personal-assistant-backend")

    # Sentry
    SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Common settings
    frontend_site_url: str = "http://127.0.0.1:3000/"
    secret_key: str = "productify+secret"
    
    # Database settings
    db_host: str = "db"  # Changed from assistant_backend-db-1 to localhostalhost
    db_port: str = "5432"
    db_name: str = "productify"
    db_user: str = "postgres"
    db_password: str = "postgres"
    
    # Storage settings
    storage_type: str = "postgresql"  # Must match StorageType enum values
    
    @computed_field
    @property
    def database_url(self) -> str:
        # Driver named explicitly: SQLAlchemy 2.1 switched the bare
        # "postgresql://" default from psycopg2 to psycopg (v3), which this
        # image doesn't install -- the backend crashed on boot with
        # "No module named 'psycopg'".
        return f"postgresql+psycopg2://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    
    # Auth settings
    auth_type: str = "jwt"
    JWT_SECRET_KEY: str = "your-secret-key"
    JWT_ALGORITHM: str = "HS256"
    jwt_secret: str = "your-secret-key"  # Added for backward compatibility
    
    # OpenAI settings
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    
    class Config:
        # False (the pydantic-settings default) so DB_HOST/DB_NAME/etc. env vars
        # actually match the lowercase db_host/db_name/... fields below. This was
        # True, which silently no-ops every one of those overrides -- local docker
        # only "worked" because the hardcoded defaults happened to equal what's
        # needed (db_host="db"). In Kubernetes the Postgres Service won't be
        # named "db" by coincidence, so this has to actually work.
        case_sensitive = False
        env_file = ".env"
        extra = "ignore"  # Allow extra fields

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()

# Validate critical settings
if settings.ENVIRONMENT == "production":
    if not settings.SECRET_KEY or settings.SECRET_KEY == "your-secret-key-here":
        raise ValueError("SECRET_KEY must be set in production environment")
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY must be set in production environment")
    if not settings.ALLOWED_ORIGINS:
        raise ValueError("ALLOWED_ORIGINS must be set in production environment")

def get_config():
    return settings
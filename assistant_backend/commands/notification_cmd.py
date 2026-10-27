from pydantic import BaseModel
from typing import Optional


class NotificationCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    user_id: Optional[str] = None  # Set from the auth token by the controller
    title: str
    message: str
    type: str  # info, warning, error, success
    entity_id: Optional[str] = None  # ID of the related entity
    entity_type: Optional[str] = None  # Type of the related entity
    properties: Optional[dict] = None


class NotificationUpdateCommand(BaseModel):
    notification_id: Optional[str] = None  # Set from the URL path by the controller
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    user_id: Optional[str] = None  # Set from the auth token by the controller
    title: Optional[str] = None
    message: Optional[str] = None
    type: Optional[str] = None
    is_read: Optional[bool] = None
    properties: Optional[dict] = None


class NotificationDeleteCommand(BaseModel):
    notification_id: str
    workspace_id: str
    user_id: Optional[str] = None

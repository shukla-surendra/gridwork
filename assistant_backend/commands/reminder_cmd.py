from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ReminderCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    user_id: Optional[str] = None  # Set from the auth token by the controller
    title: str
    description: Optional[str] = None
    due_date: datetime
    repeat: Optional[str] = None
    properties: Optional[dict] = None


class ReminderUpdateCommand(BaseModel):
    reminder_id: Optional[str] = None  # Set from the URL path by the controller
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    user_id: Optional[str] = None  # Set from the auth token by the controller
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    repeat: Optional[str] = None
    is_completed: Optional[bool] = None
    properties: Optional[dict] = None


class ReminderDeleteCommand(BaseModel):
    reminder_id: str
    workspace_id: str
    user_id: str

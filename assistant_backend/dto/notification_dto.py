from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime, timezone

class NotificationDto(BaseModel):
    notification_id: str
    workspace_id: str
    user_id: str
    title: str
    message: str
    type: str
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None
    is_read: bool = False
    properties: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

class NotificationDtoMapper:
    @staticmethod
    def map_to_notification_dto(notification) -> NotificationDto:
        return NotificationDto(
            notification_id=str(notification.notification_id),
            workspace_id=str(notification.workspace_id),
            user_id=str(notification.user_id),
            title=notification.title,
            message=notification.message,
            type=notification.type,
            entity_id=str(notification.entity_id) if notification.entity_id else None,
            entity_type=notification.entity_type,
            is_read=notification.is_read,
            properties=notification.properties,
            # Stored as naive UTC; say so, or browsers read it as local time.
            created_at=notification.created_at.replace(tzinfo=timezone.utc) if notification.created_at else None,
        )
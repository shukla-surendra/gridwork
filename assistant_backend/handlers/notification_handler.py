from typing import Optional
from uuid import UUID
from adapters.orm.models.pg_models import Notification
from adapters.orm.models.database import SessionLocal
from commands.notification_cmd import NotificationCommand, NotificationUpdateCommand, NotificationDeleteCommand
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from utils.notifications import deliver_due_reminders
import logging

logger = logging.getLogger(__name__)

class NotificationHandler:
    def __init__(self):
        self.db = SessionLocal()

    def create_notification(self, command: NotificationCommand) -> Notification:
        try:
            notification = Notification(
                workspace_id=UUID(command.workspace_id),
                user_id=UUID(command.user_id),
                title=command.title,
                message=command.message,
                type=command.type,
                entity_id=UUID(command.entity_id) if command.entity_id else None,
                entity_type=command.entity_type,
                properties=command.properties
            )
            self.db.add(notification)
            self.db.commit()
            self.db.refresh(notification)
            return notification
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating notification: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create notification")

    def _own(self, notification_id: str, workspace_id: str, user_id: str):
        """A notification is only ever reachable by its recipient."""
        try:
            return self.db.query(Notification).filter(
                Notification.notification_id == UUID(notification_id),
                Notification.workspace_id == UUID(workspace_id),
                Notification.user_id == UUID(user_id),
            ).first()
        except ValueError:
            return None

    def get_notification(self, notification_id: str, workspace_id: str, user_id: str) -> Notification:
        notification = self._own(notification_id, workspace_id, user_id)
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        return notification

    def list_notifications(
        self, workspace_id: str, user_id: str, entity_id: Optional[str] = None, entity_type: Optional[str] = None
    ) -> list[Notification]:
        try:
            # Reminders fire here rather than from a scheduler: the bell
            # polls this endpoint, so a due reminder shows up within a poll.
            deliver_due_reminders(self.db, UUID(workspace_id), UUID(user_id))
            # Scoped to the caller, not the whole workspace -- user_id is
            # NOT NULL on this model (each notification belongs to one
            # recipient), so without this filter every user in a workspace
            # would see everyone else's notifications too.
            query = self.db.query(Notification).filter(
                Notification.workspace_id == UUID(workspace_id),
                Notification.user_id == UUID(user_id),
            )
            if entity_id is not None:
                query = query.filter(Notification.entity_id == UUID(entity_id))
            if entity_type is not None:
                query = query.filter(Notification.entity_type == entity_type)
            return query.order_by(Notification.created_at.desc()).all()
        except SQLAlchemyError as e:
            logger.error(f"Error listing notifications: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to list notifications")

    def update_notification(self, command: NotificationUpdateCommand) -> Notification:
        try:
            notification = self._own(command.notification_id, command.workspace_id, command.user_id)
            if not notification:
                raise HTTPException(status_code=404, detail="Notification not found")

            if command.title is not None:
                notification.title = command.title
            if command.message is not None:
                notification.message = command.message
            if command.type is not None:
                notification.type = command.type
            if command.is_read is not None:
                notification.is_read = command.is_read
            if command.properties is not None:
                notification.properties = command.properties

            self.db.commit()
            self.db.refresh(notification)
            return notification
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating notification: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update notification")

    def delete_notification(self, command: NotificationDeleteCommand) -> bool:
        try:
            notification = self._own(command.notification_id, command.workspace_id, command.user_id)
            if not notification:
                raise HTTPException(status_code=404, detail="Notification not found")

            self.db.delete(notification)
            self.db.commit()
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting notification: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete notification")

    def mark_all_read(self, workspace_id: str, user_id: str) -> int:
        try:
            count = self.db.query(Notification).filter(
                Notification.workspace_id == UUID(workspace_id),
                Notification.user_id == UUID(user_id),
                Notification.is_read == False,
            ).update({"is_read": True})
            self.db.commit()
            return count
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error marking notifications read: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to mark notifications read")

    def __del__(self):
        self.db.close()

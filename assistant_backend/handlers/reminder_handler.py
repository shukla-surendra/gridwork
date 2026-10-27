from uuid import UUID
from adapters.orm.models.pg_models import Reminder
from adapters.orm.models.database import SessionLocal
from commands.reminder_cmd import ReminderCommand, ReminderUpdateCommand, ReminderDeleteCommand
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

class ReminderHandler:
    def __init__(self):
        self.db = SessionLocal()

    def _own(self, reminder_id, workspace_id, user_id):
        """Reminders are personal: only their owner can touch them."""
        try:
            return self.db.query(Reminder).filter(
                Reminder.reminder_id == UUID(str(reminder_id)),
                Reminder.workspace_id == UUID(str(workspace_id)),
                Reminder.user_id == UUID(str(user_id)),
            ).first()
        except ValueError:
            return None

    def create_reminder(self, command: ReminderCommand) -> Reminder:
        try:
            reminder = Reminder(
                workspace_id=UUID(command.workspace_id),
                user_id=UUID(command.user_id),
                title=command.title,
                description=command.description,
                due_date=command.due_date,
                repeat=command.repeat,
                properties=command.properties
            )
            self.db.add(reminder)
            self.db.commit()
            self.db.refresh(reminder)
            return reminder
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating reminder: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create reminder")

    def get_reminder(self, reminder_id: str, workspace_id: str, user_id: str) -> Reminder:
        try:
            reminder = self.db.query(Reminder).filter(
                Reminder.reminder_id == UUID(reminder_id),
                Reminder.workspace_id == UUID(workspace_id),
                Reminder.user_id == UUID(user_id),
            ).first()
            if not reminder:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
            return reminder
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            logger.error(f"Error getting reminder: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to get reminder")

    def list_reminders(self, workspace_id: str, user_id: str) -> list[Reminder]:
        try:
            return self.db.query(Reminder).filter(
                Reminder.workspace_id == UUID(workspace_id),
                Reminder.user_id == UUID(user_id),
            ).order_by(Reminder.due_date.asc()).all()
        except SQLAlchemyError as e:
            logger.error(f"Error listing reminders: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to list reminders")

    def update_reminder(self, command: ReminderUpdateCommand) -> Reminder:
        try:
            reminder = self._own(command.reminder_id, command.workspace_id, command.user_id)
            if not reminder:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")

            if command.title is not None:
                reminder.title = command.title
            if command.description is not None:
                reminder.description = command.description
            if command.due_date is not None:
                reminder.due_date = command.due_date
                # Rescheduled: deliver it again when the new time comes
                # (see utils/notifications.deliver_due_reminders).
                props = dict(reminder.properties or {})
                if props.pop("notified_for", None) is not None and command.properties is None:
                    reminder.properties = props
            if command.repeat is not None:
                reminder.repeat = command.repeat
            if command.is_completed is not None:
                reminder.is_completed = command.is_completed
            if command.properties is not None:
                reminder.properties = command.properties

            self.db.commit()
            self.db.refresh(reminder)
            return reminder
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating reminder: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update reminder")

    def delete_reminder(self, command: ReminderDeleteCommand) -> bool:
        try:
            reminder = self._own(command.reminder_id, command.workspace_id, command.user_id)
            if not reminder:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")

            # No is_deleted column on this model -- a real delete is correct here.
            self.db.delete(reminder)
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting reminder: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete reminder")

    def __del__(self):
        self.db.close()

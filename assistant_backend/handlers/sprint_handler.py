import datetime
from uuid import UUID
from adapters.orm.models.pg_models import Sprint, Task
from adapters.orm.models.database import SessionLocal
from commands.sprint_cmd import SprintCommand, SprintUpdateCommand
from constants import TaskStatus
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)


class SprintHandler:
    def __init__(self):
        self.db = SessionLocal()

    def create_sprint(self, command: SprintCommand) -> Sprint:
        try:
            sprint = Sprint(
                workspace_id=UUID(command.workspace_id),
                board_id=UUID(command.board_id),
                name=command.name,
                goal=command.goal,
                start_date=command.start_date,
                end_date=command.end_date,
            )
            self.db.add(sprint)
            self.db.commit()
            self.db.refresh(sprint)
            return sprint
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating sprint: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create sprint")

    def get_sprint(self, sprint_id: str) -> Sprint:
        try:
            sprint = self.db.query(Sprint).filter(
                Sprint.sprint_id == UUID(sprint_id),
                Sprint.is_deleted == False
            ).first()
            if not sprint:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")
            return sprint
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            logger.error(f"Error getting sprint: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to get sprint")

    def list_sprints(self, board_id: str) -> list[Sprint]:
        try:
            return self.db.query(Sprint).filter(
                Sprint.board_id == UUID(board_id),
                Sprint.is_deleted == False
            ).order_by(Sprint.created_at.asc()).all()
        except SQLAlchemyError as e:
            logger.error(f"Error listing sprints: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to list sprints")

    def update_sprint(self, command: SprintUpdateCommand) -> Sprint:
        try:
            sprint = self.get_sprint(command.sprint_id)
            if command.name is not None:
                sprint.name = command.name
            if command.goal is not None:
                sprint.goal = command.goal
            if command.start_date is not None:
                sprint.start_date = command.start_date
            if command.end_date is not None:
                sprint.end_date = command.end_date

            self.db.commit()
            self.db.refresh(sprint)
            return sprint
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating sprint: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update sprint")

    def start_sprint(self, sprint_id: str) -> Sprint:
        """Move a planned sprint to active. A board can only have one
        active sprint at a time, so refuse
        rather than silently demoting the currently-active one."""
        try:
            sprint = self.get_sprint(sprint_id)
            if sprint.status != "planned":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only a planned sprint can be started")

            already_active = self.db.query(Sprint).filter(
                Sprint.board_id == sprint.board_id,
                Sprint.status == "active",
                Sprint.is_deleted == False
            ).first()
            if already_active:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This board already has an active sprint")

            sprint.status = "active"
            if sprint.start_date is None:
                sprint.start_date = datetime.datetime.now(datetime.UTC)
            self.db.commit()
            self.db.refresh(sprint)
            return sprint
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error starting sprint: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to start sprint")

    def complete_sprint(self, sprint_id: str) -> Sprint:
        """Complete an active sprint. Unfinished cards return to the
        backlog (sprint_id cleared) -- the default "move to backlog"
        behavior; done cards stay tagged to the sprint for velocity
        history/reporting."""
        try:
            sprint = self.get_sprint(sprint_id)
            if sprint.status != "active":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only an active sprint can be completed")

            self.db.query(Task).filter(
                Task.sprint_id == sprint.sprint_id,
                Task.status != TaskStatus.DONE.value
            ).update({"sprint_id": None})

            sprint.status = "completed"
            sprint.end_date = datetime.datetime.now(datetime.UTC)
            self.db.commit()
            self.db.refresh(sprint)
            return sprint
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error completing sprint: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to complete sprint")

    def delete_sprint(self, sprint_id: str, board_id: str):
        try:
            sprint = self.db.query(Sprint).filter(
                Sprint.sprint_id == UUID(sprint_id),
                Sprint.board_id == UUID(board_id),
                Sprint.is_deleted == False
            ).first()
            if not sprint:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")

            sprint.is_deleted = True
            self.db.query(Task).filter(Task.sprint_id == sprint.sprint_id).update({"sprint_id": None})
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting sprint: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete sprint")

    def __del__(self):
        self.db.close()

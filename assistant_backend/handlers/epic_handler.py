from uuid import UUID
from adapters.orm.models.pg_models import Epic, Task
from sqlalchemy import func, case
from adapters.orm.models.database import SessionLocal
from commands.epic_cmd import EpicCommand, EpicUpdateCommand
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)


class EpicHandler:
    def __init__(self):
        self.db = SessionLocal()

    def create_epic(self, command: EpicCommand) -> Epic:
        try:
            epic = Epic(
                workspace_id=UUID(command.workspace_id),
                board_id=UUID(command.board_id),
                title=command.title,
                description=command.description,
                color=command.color or "#6554C0",
                start_date=command.start_date,
                due_date=command.due_date,
            )
            self.db.add(epic)
            self.db.commit()
            self.db.refresh(epic)
            return epic
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating epic: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create epic")

    def get_epic(self, epic_id: str) -> Epic:
        try:
            epic = self.db.query(Epic).filter(
                Epic.epic_id == UUID(epic_id),
                Epic.is_deleted == False
            ).first()
            if not epic:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Epic not found")
            return epic
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            logger.error(f"Error getting epic: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to get epic")

    def list_epics(self, board_id: str) -> list[Epic]:
        try:
            return self.db.query(Epic).filter(
                Epic.board_id == UUID(board_id),
                Epic.is_deleted == False
            ).order_by(Epic.created_at.asc()).all()
        except SQLAlchemyError as e:
            logger.error(f"Error listing epics: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to list epics")

    def progress(self, board_id: str) -> dict:
        """epic_id -> issue/point counts for the board's epics."""
        is_done = Task.status == "done"
        rows = self.db.query(
            Task.epic_id,
            func.count(Task.task_id),
            func.sum(case((is_done, 1), else_=0)),
            func.coalesce(func.sum(Task.story_points), 0),
            func.coalesce(func.sum(case((is_done, Task.story_points), else_=0)), 0),
        ).filter(
            Task.board_id == UUID(board_id),
            Task.epic_id.isnot(None),
            Task.parent_task_id.is_(None),
            Task.is_deleted == False,
        ).group_by(Task.epic_id).all()
        return {
            str(epic_id): {"issue_count": total, "done_count": int(done or 0), "points_total": int(points), "points_done": int(points_done)}
            for epic_id, total, done, points, points_done in rows
        }

    def update_epic(self, command: EpicUpdateCommand) -> Epic:
        try:
            epic = self.get_epic(command.epic_id)
            # Only fields the client sent; an explicit null clears the
            # optional ones (description, dates).
            fields = command.model_dump(exclude_unset=True, exclude={"epic_id"})
            if "status" in fields and fields["status"] not in ("open", "closed"):
                raise HTTPException(status_code=422, detail="Epic status must be open or closed")
            if "title" in fields and not (fields["title"] or "").strip():
                raise HTTPException(status_code=422, detail="Epic name can't be empty")
            for field in ("title", "color", "status"):
                if fields.get(field) is not None:
                    setattr(epic, field, fields[field])
            for field in ("description", "start_date", "due_date"):
                if field in fields:
                    setattr(epic, field, fields[field])

            self.db.commit()
            self.db.refresh(epic)
            return epic
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating epic: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update epic")

    def delete_epic(self, epic_id: str, board_id: str):
        try:
            epic = self.db.query(Epic).filter(
                Epic.epic_id == UUID(epic_id),
                Epic.board_id == UUID(board_id),
                Epic.is_deleted == False
            ).first()
            if not epic:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Epic not found")

            epic.is_deleted = True
            # Unassign it from any tasks currently tagged with it rather
            # than leaving a dangling reference to a "deleted" epic.
            from adapters.orm.models.pg_models import Task
            self.db.query(Task).filter(Task.epic_id == epic.epic_id).update({"epic_id": None})
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting epic: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete epic")

    def __del__(self):
        self.db.close()

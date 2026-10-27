from uuid import UUID
from adapters.orm.models.pg_models import Task, TaskLink
from adapters.orm.models.database import SessionLocal
from commands.task_link_cmd import TaskLinkCommand, LINK_TYPES
from sqlalchemy import or_
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)


# Both ends, with what the DTO needs for their ticket keys -- the session
# closes before mapping, so nothing may be lazy-loaded there.
_LINKED_TASKS = [
    joinedload(relation).joinedload(related)
    for relation in (TaskLink.source_task, TaskLink.target_task)
    for related in (Task.board, Task.workspace)
]


class TaskLinkHandler:
    def __init__(self):
        self.db = SessionLocal()

    def _get_task_or_404(self, task_id: str, workspace_id: str) -> Task:
        task = self.db.query(Task).filter(
            Task.task_id == UUID(task_id),
            Task.workspace_id == UUID(workspace_id),
            Task.is_deleted == False
        ).first()
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        return task

    def create_link(self, command: TaskLinkCommand) -> TaskLink:
        try:
            if command.link_type not in LINK_TYPES:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"link_type must be one of {LINK_TYPES}")
            if command.source_task_id == command.target_task_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A task cannot be linked to itself")

            self._get_task_or_404(command.source_task_id, command.workspace_id)
            self._get_task_or_404(command.target_task_id, command.workspace_id)

            existing = self.db.query(TaskLink).filter(
                TaskLink.source_task_id == UUID(command.source_task_id),
                TaskLink.target_task_id == UUID(command.target_task_id),
                TaskLink.link_type == command.link_type
            ).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This link already exists")

            link = TaskLink(
                workspace_id=UUID(command.workspace_id),
                source_task_id=UUID(command.source_task_id),
                target_task_id=UUID(command.target_task_id),
                link_type=command.link_type,
            )
            self.db.add(link)
            self.db.commit()
            # The DTO mapper reads link.source_task/target_task -- reload
            # with those relationships eagerly joined instead of leaving
            # them to lazy-load after this handler's session is closed
            # (the __del__-closes-session pattern this app uses elsewhere).
            return self.db.query(TaskLink).options(
                *_LINKED_TASKS
            ).filter(TaskLink.link_id == link.link_id).first()
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating task link: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create link")

    def list_links(self, task_id: str, workspace_id: str) -> list[TaskLink]:
        try:
            self._get_task_or_404(task_id, workspace_id)
            return self.db.query(TaskLink).options(
                *_LINKED_TASKS
            ).filter(
                or_(
                    TaskLink.source_task_id == UUID(task_id),
                    TaskLink.target_task_id == UUID(task_id)
                )
            ).order_by(TaskLink.created_at.asc()).all()
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            logger.error(f"Error listing task links: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to list links")

    def delete_link(self, link_id: str, task_id: str, workspace_id: str):
        try:
            link = self.db.query(TaskLink).filter(
                TaskLink.link_id == UUID(link_id),
                TaskLink.workspace_id == UUID(workspace_id),
                or_(
                    TaskLink.source_task_id == UUID(task_id),
                    TaskLink.target_task_id == UUID(task_id)
                )
            ).first()
            if not link:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

            self.db.delete(link)
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting task link: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete link")

    def __del__(self):
        self.db.close()

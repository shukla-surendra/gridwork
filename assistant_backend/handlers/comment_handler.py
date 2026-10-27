from typing import Optional, List
from uuid import UUID
from adapters.orm.models.pg_models import Comment, Task
from constants import PERSONAL_TASK_TYPES
from utils import notifications
import re
from adapters.orm.models.database import SessionLocal
from commands.comment_cmd import CommentCommand, CommentUpdateCommand, CommentDeleteCommand, PageCommentCommand
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

class CommentHandler:
    def __init__(self):
        self.db = SessionLocal()

    PERSONAL_TYPES = PERSONAL_TASK_TYPES

    def _commentable_task(self, workspace_id: str, task_id: str, user_id: str) -> Task:
        """The task must be in this workspace and visible to the commenter
        (shared work item, or their own personal item)."""
        try:
            task = self.db.query(Task).filter(
                Task.task_id == UUID(task_id),
                Task.workspace_id == UUID(workspace_id),
                Task.is_deleted == False,
            ).first()
        except ValueError:
            task = None
        if not task or (task.task_type in self.PERSONAL_TYPES and str(task.user_id) != str(user_id)):
            raise HTTPException(status_code=404, detail="Task not found")
        return task

    def create_comment(self, command: CommentCommand) -> Comment:
        task = self._commentable_task(command.workspace_id, command.task_id, command.user_id)
        try:
            comment = Comment(
                workspace_id=UUID(command.workspace_id),
                content=command.content,
                user_id=UUID(command.user_id),
                task_id=task.task_id,
            )
            self.db.add(comment)

            # Notify everyone following the issue, then make the commenter
            # a follower too (Jira's auto-watch on comment).
            if task.task_type not in self.PERSONAL_TYPES:
                text = re.sub(r"<[^>]+>", " ", command.content or "")
                text = re.sub(r"\s+", " ", text).strip()
                key = f"{task.board.key}-{task.task_number}" if task.board_id and task.board and task.board.key and task.task_number else None
                if not key and task.task_number and task.workspace and task.workspace.key:
                    key = f"{task.workspace.key}-{task.task_number}"
                notifications.notify(
                    self.db, workspace_id=task.workspace_id, recipients=notifications.followers(task),
                    actor_id=command.user_id, type=notifications.COMMENT,
                    title=f"{notifications.display_name(self.db, command.user_id)} commented on {key or task.title}",
                    message=(text[:157] + "...") if len(text) > 160 else text,
                    entity_id=task.task_id, entity_type="task", properties={"ticket_key": key},
                )
                watchers = [w for w in (task.watchers or []) if isinstance(w, str)]
                if command.user_id not in watchers:
                    task.watchers = watchers + [command.user_id]

            self.db.commit()
            self.db.refresh(comment)
            _ = comment.user  # force-load before this handler's session can close
            return comment
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating comment: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create comment")

    def update_comment(self, command: CommentUpdateCommand) -> Comment:
        try:
            comment = self.db.query(Comment).filter(
                Comment.comment_id == UUID(command.comment_id),
                Comment.workspace_id == UUID(command.workspace_id),
                Comment.is_deleted == False,
            ).first()
            if not comment:
                raise HTTPException(status_code=404, detail="Comment not found")
            if str(comment.user_id) != str(command.user_id):
                raise HTTPException(status_code=403, detail="You can only edit your own comments")

            if command.content is not None:
                comment.content = command.content
            if command.properties is not None:
                comment.properties = command.properties

            self.db.commit()
            self.db.refresh(comment)
            _ = comment.user  # force-load before this handler's session can close
            return comment
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating comment: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update comment")

    def delete_comment(self, command: CommentDeleteCommand) -> bool:
        try:
            comment = self.db.query(Comment).filter(
                Comment.comment_id == UUID(command.comment_id),
                Comment.workspace_id == UUID(command.workspace_id)
            ).first()
            if not comment:
                raise HTTPException(status_code=404, detail="Comment not found")
            if command.user_id and str(comment.user_id) != str(command.user_id):
                raise HTTPException(status_code=403, detail="You can only delete your own comments")

            comment.is_deleted = True
            self.db.commit()
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting comment: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete comment")

    def list_comments(self, workspace_id: str, task_id: str) -> List[Comment]:
        """List every comment on a task -- not just the caller's own. A
        comment thread everyone in the workspace can see is the entire
        point; filtering by the caller's user_id here (the previous
        behavior) meant no one ever saw anyone else's comments."""
        try:
            comments = self.db.query(Comment).options(joinedload(Comment.user)).filter(
                Comment.workspace_id == UUID(workspace_id),
                Comment.task_id == UUID(task_id),
                Comment.is_deleted == False
            ).order_by(Comment.created_at.desc()).all()

            return comments
        except SQLAlchemyError as e:
            logger.error(f"Error listing comments: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to list comments")

    def create_page_comment(self, command: PageCommentCommand) -> Comment:
        try:
            comment = Comment(
                workspace_id=UUID(command.workspace_id),
                content=command.content,
                user_id=UUID(command.user_id),
                entity_type="page",
                entity_id=UUID(command.page_id),
            )
            self.db.add(comment)
            self.db.commit()
            self.db.refresh(comment)
            _ = comment.user  # force-load before this handler's session can close
            return comment
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating page comment: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create page comment")

    def list_entity_comments(self, workspace_id: str, entity_type: str, entity_id: str) -> List[Comment]:
        try:
            return self.db.query(Comment).options(joinedload(Comment.user)).filter(
                Comment.workspace_id == UUID(workspace_id),
                Comment.entity_type == entity_type,
                Comment.entity_id == UUID(entity_id),
                Comment.is_deleted == False
            ).order_by(Comment.created_at.asc()).all()
        except SQLAlchemyError as e:
            logger.error(f"Error listing entity comments: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to list comments")

    def get_comment(self, comment_id: str, workspace_id: str) -> Comment:
        comment = self.db.query(Comment).options(joinedload(Comment.user)).filter(
            Comment.comment_id == UUID(comment_id),
            Comment.workspace_id == UUID(workspace_id),
            Comment.is_deleted == False
        ).first()
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        return comment

    def __del__(self):
        self.db.close() 
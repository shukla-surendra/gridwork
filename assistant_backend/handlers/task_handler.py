from datetime import datetime
from commands.task_cmd import TaskCommand, TaskDeleteCommand, TaskUpdateCommand
from fastapi import HTTPException, status
from constants import TaskType, TaskStatus
from adapters.orm.models.pg_models import Task, Board, Workspace, Activity
from dto.task_dto import TaskDtoMapper
from config import logger
from adapters.orm.models.database import get_db
from sqlalchemy import text
from utils.ticket_keys import generate_key, taken_keys, parse_ticket_key
import traceback
import re
import uuid


class TaskHandler:
    def __init__(self):
        self.db = next(get_db())
        logger.info("TaskHandler initialized")

    # Not work items -- these never get a ticket number.
    UNTICKETED_TYPES = (TaskType.NOTE.value, TaskType.QUICK_NOTE.value, TaskType.TIME_BLOCK.value)

    def _is_ticketed(self, task: Task) -> bool:
        return task.task_type not in self.UNTICKETED_TYPES

    def _ensure_workspace_key(self, workspace_id) -> None:
        """Give the workspace a ticket prefix the first time a boardless
        task needs one. The conditional UPDATE means two concurrent first
        creates can't both write a key -- the loser just reuses the winner's."""
        workspace = self.db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()
        if not workspace or workspace.key:
            return
        key = generate_key(workspace.name, taken_keys(self.db, workspace_id), fallback="TASK")
        self.db.execute(
            text("UPDATE workspaces SET key = :key WHERE workspace_id = :wid AND key IS NULL"),
            {"key": key, "wid": str(workspace_id)},
        )
        self.db.expire(workspace, ["key"])

    def _assign_task_number(self, task: Task) -> None:
        """Atomically hand out the next ticket number -- from the task's
        board, or from its workspace when it has no board -- via a single
        UPDATE...RETURNING, so concurrent creates never collide (the row
        lock serializes the increments)."""
        if task.board_id:
            result = self.db.execute(
                text("UPDATE boards SET next_task_number = next_task_number + 1 WHERE board_id = :bid RETURNING next_task_number"),
                {"bid": str(task.board_id)},
            )
        else:
            self._ensure_workspace_key(task.workspace_id)
            result = self.db.execute(
                text("UPDATE workspaces SET next_task_number = next_task_number + 1 WHERE workspace_id = :wid RETURNING next_task_number"),
                {"wid": str(task.workspace_id)},
            )
        new_next = result.scalar()
        if new_next is not None:
            task.task_number = new_next - 1

    def _ticket_key(self, task: Task):
        if not task.task_number:
            return None
        if task.board_id:
            prefix = self.db.query(Board.key).filter(Board.board_id == task.board_id).scalar()
        else:
            prefix = self.db.query(Workspace.key).filter(Workspace.workspace_id == task.workspace_id).scalar()
        return f"{prefix}-{task.task_number}" if prefix else None

    def _log_activity(self, workspace_id, user_id, action, entity_type, entity_id, properties=None):
        if not user_id:
            return
        try:
            self.db.add(Activity(
                workspace_id=workspace_id,
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                properties=properties or {},
            ))
        except Exception:
            logger.warning("Failed to log activity", exc_info=True)

    def _generate_slug(self, title: str) -> str:
        """Generate a URL-friendly slug from the title"""
        logger.debug(f"Generating slug for title: {title}")
        # Convert to lowercase and replace spaces with hyphens
        slug = re.sub(r'[^\w\s-]', '', title.lower())
        slug = re.sub(r'[-\s]+', '-', slug).strip('-')
        
        # Check if slug exists
        base_slug = slug
        counter = 1
        while self.db.query(Task).filter(Task.slug == slug).first():
            logger.debug(f"Slug {slug} exists, trying with counter {counter}")
            slug = f"{base_slug}-{counter}"
            counter += 1
            
        logger.debug(f"Generated final slug: {slug}")
        return slug

    def create_task(self, task_cmd: TaskCommand):
        """Create a new task in PostgreSQL"""
        try:
            logger.info(f"Creating new task with command: {task_cmd}")
            # Get the appropriate priority value based on storage type
            priority = task_cmd.priority.lower()
            
            # Convert task_type and status strings to enum values
            task_type = TaskType.TODO
            if task_cmd.task_type:
                try:
                    task_type = TaskType(task_cmd.task_type.lower())
                except ValueError:
                    logger.warning(f"Invalid task type: {task_cmd.task_type}. Defaulting to TODO")
                    task_type = TaskType.TODO

            task_status = TaskStatus.TODO
            if task_cmd.status:
                try:
                    task_status = TaskStatus(task_cmd.status.lower())
                except ValueError:
                    logger.warning(f"Invalid status: {task_cmd.status}. Defaulting to TODO")
                    task_status = TaskStatus.TODO

            # Generate slug if not provided
            slug = task_cmd.slug or self._generate_slug(task_cmd.title)
            logger.debug(f"Using slug: {slug}")

            # Generate task_id if not provided
            task_id = task_cmd.task_id or str(uuid.uuid4())
            logger.debug(f"Using task_id: {task_id}")

            if task_cmd.parent_task_id:
                parent = self.db.query(Task).filter(
                    Task.task_id == task_cmd.parent_task_id,
                    Task.workspace_id == task_cmd.workspace_id,
                    Task.is_deleted == False
                ).first()
                if not parent:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent task not found")
                if parent.parent_task_id:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A subtask cannot itself have subtasks")

            # Create task with enum values converted to strings
            task = Task(
                task_id=task_id,
                workspace_id=task_cmd.workspace_id,
                board_id=task_cmd.board_id,
                epic_id=task_cmd.epic_id or None,
                sprint_id=task_cmd.sprint_id or None,
                parent_task_id=task_cmd.parent_task_id or None,
                story_points=task_cmd.story_points,
                user_id=task_cmd.user_id,
                title=task_cmd.title,
                description=task_cmd.description,
                priority=priority,
                task_type=task_type.value,  # Convert enum to string value
                status=task_status.value,  # Convert enum to string value
                completed=task_cmd.completed,
                is_deleted=task_cmd.is_deleted,
                due_on=task_cmd.due_on,
                start_time=task_cmd.start_time,
                end_time=task_cmd.end_time,
                assignee_id=task_cmd.assignee_id,
                reporter_id=task_cmd.reporter_id,
                watchers=task_cmd.watchers,
                labels=task_cmd.labels,
                checklist=task_cmd.checklist,
                meta_data=task_cmd.meta_data,
                settings=task_cmd.settings,
                public_access=task_cmd.public_access,
                slug=slug
            )

            logger.debug(f"Created task object: {task}")
            self.db.add(task)
            self.db.flush()
            if self._is_ticketed(task):
                self._assign_task_number(task)
            # Notes/quick-notes aren't ticketed work items -- skip them so
            # the activity feed stays about actual tasks, not every scratch note.
            if task.task_type not in (TaskType.NOTE.value, TaskType.QUICK_NOTE.value):
                self._log_activity(
                    task.workspace_id, task_cmd.user_id, "created", "task", task.task_id,
                    {"title": task.title, "ticket_key": self._ticket_key(task)},
                )
            self.db.commit()
            logger.info(f"Successfully created task with ID: {task.task_id}")
            return TaskDtoMapper.map_to_task_dto_mapper(task)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating task: {str(e)}")
            logger.error(traceback.format_exc())
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating task: {str(e)}"
            )

    def delete_task(self, task_cmd: TaskDeleteCommand):
        """Delete a task"""
        try:
            logger.info(f"Deleting task with command: {task_cmd}")
            task = self.db.query(Task).filter(
                Task.task_id == task_cmd.task_id,
                Task.workspace_id == task_cmd.workspace_id,
                Task.user_id == task_cmd.user_id
            ).first()

            if not task:
                logger.warning(f"Task not found for deletion: {task_cmd.task_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Task not found"
                )

            task.is_deleted = True
            # Same rule Jira enforces: deleting a parent takes its
            # subtasks with it (one level deep, so no further recursion).
            self.db.query(Task).filter(Task.parent_task_id == task.task_id).update({"is_deleted": True})
            if task.task_type not in (TaskType.NOTE.value, TaskType.QUICK_NOTE.value):
                self._log_activity(
                    task.workspace_id, task_cmd.user_id, "deleted", "task", task.task_id,
                    {"title": task.title, "ticket_key": self._ticket_key(task)},
                )
            self.db.commit()
            logger.info(f"Successfully deleted task: {task_cmd.task_id}")
            return {"message": "Task deleted successfully"}

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting task: {str(e)}")
            logger.error(traceback.format_exc())
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting task: {str(e)}"
            )

    def update_task(self, task_cmd: TaskUpdateCommand):
        """Update a task"""
        try:
            logger.info(f"Updating task with command: {task_cmd}")
            task = self.db.query(Task).filter(
                Task.task_id == task_cmd.task_id,
                Task.workspace_id == task_cmd.workspace_id,
                Task.user_id == task_cmd.user_id
            ).first()

            if not task:
                logger.warning(f"Task not found for update: {task_cmd.task_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Task not found"
                )

            old_board_id = task.board_id
            old_status = task.status
            old_assignee_id = task.assignee_id
            old_completed = task.completed

            # Update fields if provided
            if task_cmd.title is not None:
                task.title = task_cmd.title
                task.slug = self._generate_slug(task_cmd.title)
            if task_cmd.description is not None:
                task.description = task_cmd.description
            if task_cmd.priority is not None:
                task.priority = task_cmd.priority.lower()
            if task_cmd.task_type is not None:
                try:
                    task.task_type = TaskType(task_cmd.task_type.lower()).value
                except ValueError:
                    logger.warning(f"Invalid task type: {task_cmd.task_type}. Keeping existing value")
            if task_cmd.status is not None:
                try:
                    task.status = TaskStatus(task_cmd.status.lower()).value
                except ValueError:
                    logger.warning(f"Invalid status: {task_cmd.status}. Keeping existing value")
            if task_cmd.board_id is not None:
                task.board_id = task_cmd.board_id
            if task_cmd.epic_id is not None:
                task.epic_id = task_cmd.epic_id or None
            if task_cmd.sprint_id is not None:
                task.sprint_id = task_cmd.sprint_id or None
            if task_cmd.story_points is not None:
                task.story_points = task_cmd.story_points
            if task_cmd.order is not None:
                task.order = task_cmd.order
            if task_cmd.completed is not None:
                task.completed = task_cmd.completed
            if task_cmd.due_on is not None:
                task.due_on = task_cmd.due_on
            if task_cmd.start_time is not None:
                task.start_time = task_cmd.start_time
            if task_cmd.end_time is not None:
                task.end_time = task_cmd.end_time
            if task_cmd.assignee_id is not None:
                task.assignee_id = task_cmd.assignee_id
            if task_cmd.reporter_id is not None:
                task.reporter_id = task_cmd.reporter_id
            if task_cmd.watchers is not None:
                task.watchers = task_cmd.watchers
            if task_cmd.labels is not None:
                task.labels = task_cmd.labels
            if task_cmd.checklist is not None:
                task.checklist = task_cmd.checklist
            if task_cmd.meta_data is not None:
                task.meta_data = task_cmd.meta_data
            if task_cmd.settings is not None:
                task.settings = task_cmd.settings
            if task_cmd.public_access is not None:
                task.public_access = task_cmd.public_access

            # Re-key when the task changes board (incl. a boardless task
            # moving onto one): its old number came from a different
            # counter and could clash with an existing ticket there --
            # Jira does the same when an issue moves between projects.
            # Also covers a note converted into a work item.
            board_changed = str(old_board_id or "") != str(task.board_id or "")
            if self._is_ticketed(task) and (board_changed or not task.task_number):
                self._assign_task_number(task)

            changes = {}
            if task_cmd.status is not None and old_status != task.status:
                changes["status"] = {"from": old_status, "to": task.status}
            if task_cmd.assignee_id is not None and str(old_assignee_id) != str(task.assignee_id):
                changes["assignee_id"] = {"from": str(old_assignee_id) if old_assignee_id else None, "to": str(task.assignee_id) if task.assignee_id else None}
            if task_cmd.completed is not None and old_completed != task.completed:
                changes["completed"] = {"from": old_completed, "to": task.completed}
            if changes and task.task_type not in (TaskType.NOTE.value, TaskType.QUICK_NOTE.value):
                self._log_activity(
                    task.workspace_id, task_cmd.user_id, "updated", "task", task.task_id,
                    {"title": task.title, "ticket_key": self._ticket_key(task), "changes": changes},
                )

            self.db.commit()
            logger.info(f"Successfully updated task: {task_cmd.task_id}")
            return TaskDtoMapper.map_to_task_dto_mapper(task)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating task: {str(e)}")
            logger.error(traceback.format_exc())
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating task: {str(e)}"
            )

    def list_tasks(self, user_id: str, workspace_id: str = None, board_id: str = None, skip: int = 0, limit: int = 10,
                   task_status=None, task_type='todo', order='desc', priority=None,
                   sprint_id=None, backlog_only=False, epic_id=None, parent_task_id=None):
        """List tasks with optional filtering"""
        try:
            logger.info(f"Listing tasks for user {user_id} with filters: workspace_id={workspace_id}, "
                       f"board_id={board_id}, task_status={task_status}, task_type={task_type}, order={order}, "
                       f"priority={priority}, sprint_id={sprint_id}, backlog_only={backlog_only}, epic_id={epic_id}")

            query = self.db.query(Task).filter(
                Task.user_id == user_id,
                Task.is_deleted == False
            )

            if workspace_id:
                query = query.filter(Task.workspace_id == workspace_id)
            if board_id:
                query = query.filter(Task.board_id == board_id)
            if backlog_only:
                query = query.filter(Task.sprint_id.is_(None))
            elif sprint_id:
                query = query.filter(Task.sprint_id == sprint_id)
            if epic_id:
                query = query.filter(Task.epic_id == epic_id)
            if parent_task_id:
                query = query.filter(Task.parent_task_id == parent_task_id)
            if task_status:
                try:
                    status_enum = TaskStatus(task_status.lower())
                    query = query.filter(Task.status == status_enum.value)
                except ValueError:
                    logger.warning(f"Invalid task status: {task_status}")
            if task_type:
                try:
                    type_enum = TaskType(task_type.lower())
                    query = query.filter(Task.task_type == type_enum.value)
                except ValueError:
                    logger.warning(f"Invalid task type: {task_type}")
            if priority:
                query = query.filter(Task.priority == priority.lower())

            # Board fetches care about column position, not recency -- order
            # by the persisted drag position first (nulls last, i.e. newly
            # created/never-dragged cards fall to the end of their column),
            # then fall back to the normal recency ordering.
            if board_id:
                query = query.order_by(Task.order.asc().nulls_last(), Task.created_at.desc())
            elif order.lower() == 'desc':
                query = query.order_by(Task.created_at.desc())
            else:
                query = query.order_by(Task.created_at.asc())

            # Apply pagination
            tasks = query.offset(skip).limit(limit).all()
            logger.info(f"Found {len(tasks)} tasks matching criteria")
            return [TaskDtoMapper.map_to_task_dto_mapper(task) for task in tasks]

        except Exception as e:
            logger.error(f"Error listing tasks: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error listing tasks: {str(e)}"
            )

    def get_task(self, workspace_id: str, task_id: str, user_id: str):
        """Get a specific task"""
        try:
            logger.info(f"Getting task {task_id} for user {user_id} in workspace {workspace_id}")
            task = self.db.query(Task).filter(
                Task.task_id == task_id,
                Task.workspace_id == workspace_id,
                Task.user_id == user_id,
                Task.is_deleted == False
            ).first()

            if not task:
                logger.warning(f"Task not found: {task_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Task not found"
                )

            logger.info(f"Successfully retrieved task: {task_id}")
            return TaskDtoMapper.map_to_task_dto_mapper(task)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting task: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting task: {str(e)}"
            )

    def get_task_by_key(self, workspace_id: str, ticket_key: str, user_id: str):
        """Resolve a Jira-style key ("ENG-42") to its task: the prefix is
        either a board's key or the workspace's own key (boardless tasks)."""
        parsed = parse_ticket_key(ticket_key)
        if not parsed:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        prefix, number = parsed

        query = self.db.query(Task).filter(
            Task.workspace_id == workspace_id,
            Task.user_id == user_id,
            Task.task_number == number,
            Task.is_deleted == False,
        )
        board_id = self.db.query(Board.board_id).filter(
            Board.workspace_id == workspace_id,
            Board.key == prefix,
            Board.is_deleted == False,
        ).scalar()
        if board_id:
            task = query.filter(Task.board_id == board_id).first()
        elif self.db.query(Workspace.key).filter(Workspace.workspace_id == workspace_id).scalar() == prefix:
            task = query.filter(Task.board_id.is_(None)).first()
        else:
            task = None

        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        return TaskDtoMapper.map_to_task_dto_mapper(task)

    def get_task_by_slug(self, slug: str, user_id: str):
        """Get a task by its slug"""
        try:
            logger.info(f"Getting task with slug {slug} for user {user_id}")
            task = self.db.query(Task).filter(
                Task.slug == slug,
                Task.user_id == user_id,
                Task.is_deleted == False
            ).first()

            if not task:
                logger.warning(f"Task not found with slug: {slug}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Task not found"
                )

            logger.info(f"Successfully retrieved task with slug: {slug}")
            return TaskDtoMapper.map_to_task_dto_mapper(task)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting task by slug: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error getting task by slug: {str(e)}"
            )

    def get_public_note(self, note_id: str):
        """Get a note with public access by ID - no authentication required"""
        try:
            logger.info(f"Getting public note: {note_id}")
            # Get the note from database without user_id check
            note = self.db.query(Task).filter(
                Task.task_id == note_id,
                Task.task_type == TaskType.NOTE.value,
                Task.public_access == True,
                Task.is_deleted == False
            ).first()

            if not note:
                logger.warning(f"Public note not found or not publicly accessible: {note_id}")
                return None

            logger.info(f"Successfully retrieved public note: {note_id}")
            return TaskDtoMapper.map_to_task_dto_mapper(note)

        except Exception as e:
            logger.error(f"Error getting public note: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get public note"
            )

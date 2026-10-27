""""""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from adapters.orm.models.pg_models import Task, Comment, Tag
from datetime import datetime

class CommentDto(BaseModel):
    comment_id: str
    task_id: str
    user_id: str
    content: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    user: Optional[dict] = None
    replies: List['CommentDto'] = []

class TagDto(BaseModel):
    id: str
    name: str
    color: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class SubtaskDto(BaseModel):
    task_id: str
    title: str
    status: str
    completed: bool
    assignee_id: Optional[str] = None


class TaskDto(BaseModel):
    task_id: str
    workspace_id: str
    board_id: Optional[str]
    parent_task_id: Optional[str] = None
    user_id: str
    title: str
    description: Optional[str]
    priority: str
    task_type: str
    status: str
    order: Optional[int]
    completed: bool
    is_deleted: bool
    due_on: Optional[datetime]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    assignee_id: Optional[str]
    reporter_id: Optional[str]
    assignee: Optional[Dict[str, Any]] = None
    reporter: Optional[Dict[str, Any]] = None
    epic_id: Optional[str] = None
    sprint_id: Optional[str] = None
    task_number: Optional[int] = None
    ticket_key: Optional[str] = None
    story_points: Optional[int] = None
    original_estimate_minutes: Optional[int] = None
    remaining_estimate_minutes: Optional[int] = None
    time_spent_minutes: int = 0
    watchers: list
    labels: list
    checklist: list = []
    meta_data: dict
    settings: dict
    public_access: bool
    slug: Optional[str]
    created_at: datetime
    updated_at: datetime
    comments: List[CommentDto] = []
    tags: List[TagDto] = []
    subtasks: List[SubtaskDto] = []


class TimeBlockDto(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    start_time: datetime
    end_time: datetime
    description: str
    status: str
    created_at: datetime
    updated_at: datetime


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = None


class CommentDtoMapper:
    @staticmethod
    def map_to_comment_dto(comment: Comment) -> CommentDto:
        return CommentDto(
            comment_id=str(comment.comment_id),
            task_id=str(comment.task_id),
            user_id=str(comment.user_id),
            content=comment.content,
            is_deleted=comment.is_deleted,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            user={
                'user_id': str(comment.user.user_id),
                'first_name': comment.user.first_name,
                'last_name': comment.user.last_name
            } if comment.user else None
        )


class TagDtoMapper:
    @staticmethod
    def map_to_tag_dto(tag: Tag) -> TagDto:
        return TagDto(
            id=str(tag.id),
            name=tag.name,
            color=tag.color,
            description=tag.description,
            created_at=tag.created_at,
            updated_at=tag.updated_at
        )


class TaskDtoMapper:
    """ Task Dto Mapper """
    @staticmethod
    def ticket_key(task: Task) -> Optional[str]:
        """"ENG-42" from the board's key, or the workspace's key for a task
        that isn't on a board. None for unnumbered items (notes etc.)."""
        if not task.task_number:
            return None
        owner = task.board if task.board_id else task.workspace
        prefix = owner.key if owner else None
        return f"{prefix}-{task.task_number}" if prefix else None

    @staticmethod
    def remaining_estimate(task: Task) -> Optional[int]:
        """Stored remaining estimate, else original minus time spent."""
        if task.remaining_estimate_minutes is not None:
            return task.remaining_estimate_minutes
        if task.original_estimate_minutes is None:
            return None
        return max(task.original_estimate_minutes - (task.time_spent_minutes or 0), 0)

    @staticmethod
    def map_to_task_dto_mapper(task: Task) -> TaskDto:
        return TaskDto(
            task_id=str(task.task_id),
            workspace_id=str(task.workspace_id),
            board_id=str(task.board_id) if task.board_id else None,
            parent_task_id=str(task.parent_task_id) if task.parent_task_id else None,
            user_id=str(task.user_id),
            title=task.title,
            description=task.description,
            priority=task.priority,
            task_type=task.task_type,
            status=task.status,
            order=task.order,
            completed=task.completed,
            is_deleted=task.is_deleted,
            due_on=task.due_on,
            start_time=task.start_time,
            end_time=task.end_time,
            assignee_id=str(task.assignee_id) if task.assignee_id else None,
            reporter_id=str(task.reporter_id) if task.reporter_id else None,
            assignee={
                'user_id': str(task.assignee.user_id),
                'first_name': task.assignee.first_name,
                'last_name': task.assignee.last_name,
                'avatar_url': task.assignee.avatar_url,
            } if task.assignee_id and task.assignee else None,
            reporter={
                'user_id': str(task.reporter.user_id),
                'first_name': task.reporter.first_name,
                'last_name': task.reporter.last_name,
                'avatar_url': task.reporter.avatar_url,
            } if task.reporter_id and task.reporter else None,
            epic_id=str(task.epic_id) if task.epic_id else None,
            sprint_id=str(task.sprint_id) if task.sprint_id else None,
            task_number=task.task_number,
            ticket_key=TaskDtoMapper.ticket_key(task),
            story_points=task.story_points,
            original_estimate_minutes=task.original_estimate_minutes,
            remaining_estimate_minutes=TaskDtoMapper.remaining_estimate(task),
            time_spent_minutes=task.time_spent_minutes or 0,
            watchers=task.watchers,
            labels=task.labels,
            checklist=task.checklist or [],
            meta_data=task.meta_data,
            settings=task.settings,
            public_access=task.public_access,
            slug=task.slug,
            created_at=task.created_at,
            updated_at=task.updated_at,
            comments=[CommentDtoMapper.map_to_comment_dto(comment) for comment in task.comments if not comment.is_deleted],
            tags=[TagDtoMapper.map_to_tag_dto(tag) for tag in task.tags],
            subtasks=[
                SubtaskDto(
                    task_id=str(sub.task_id),
                    title=sub.title,
                    status=sub.status,
                    completed=sub.completed,
                    assignee_id=str(sub.assignee_id) if sub.assignee_id else None,
                )
                for sub in task.subtasks if not sub.is_deleted
            ]
        )

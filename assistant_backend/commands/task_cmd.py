from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from config import logger
from uuid import UUID


class TaskCommand(BaseModel):
    task_id: Optional[str] = None  # Will be generated if not provided
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    user_id: Optional[str] = None  # Set from the auth token by the controller
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    task_type: Optional[str] = "todo"
    status: Optional[str] = "todo"
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    public_access: bool = False  # Combined field for public access
    slug: Optional[str] = None
    board_id: Optional[str] = None
    epic_id: Optional[str] = None
    sprint_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    story_points: Optional[int] = None
    completed: bool = False
    is_deleted: bool = False
    due_on: Optional[datetime] = None
    assignee_id: Optional[str] = None
    reporter_id: Optional[str] = None
    watchers: Optional[list] = []
    labels: Optional[list] = []
    checklist: Optional[list] = []
    meta_data: Optional[dict] = {}
    settings: Optional[dict] = {}


class TaskDeleteCommand(BaseModel):
    task_id: str
    user_id: str
    workspace_id: str


class TaskUpdateCommand(BaseModel):
    # All Optional (even though the controller always overwrites these from
    # the URL path / auth token right after validation) -- Pydantic
    # validates the raw request body BEFORE the controller runs, so a
    # required field here 422s any partial update whose body doesn't
    # happen to include it. Same bug class already fixed for
    # ContactUpdate/DealUpdate/BoardUpdateCommand earlier this session --
    # caught here because the new Kanban drag-and-drop only PUTs `{status}`.
    task_id: Optional[str] = None
    workspace_id: Optional[str] = None
    user_id: Optional[str] = None
    assignee_id: Optional[str] = None
    reporter_id: Optional[str] = None
    # None (not []/{}) so a partial update that omits these leaves them
    # untouched -- the handler only skips a field when it's None, so an
    # empty-collection default silently wiped labels/watchers/meta_data
    # on every Kanban drag or backlog epic/sprint change. Send [] / {}
    # explicitly to clear.
    watchers: Optional[list] = None
    labels: Optional[list] = None
    checklist: Optional[list] = None
    public_access: Optional[bool] = None  # Combined field for public access
    meta_data: Optional[dict] = None
    settings: Optional[dict] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    task_type: Optional[str] = None
    status: Optional[str] = None
    board_id: Optional[str] = None
    # "" clears the assignment (moves the card to no-epic / back to
    # backlog); None means "leave unchanged", same as every other
    # optional field on this command.
    epic_id: Optional[str] = None
    sprint_id: Optional[str] = None
    story_points: Optional[int] = None
    order: Optional[int] = None
    completed: Optional[bool] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    due_on: Optional[datetime] = None
    is_deleted: Optional[bool] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

    def __init__(self, **data):
        try:
            logger.info(f"Received TaskUpdateCommand data: {data}")
            super().__init__(**data)
            logger.info(f"Successfully validated TaskUpdateCommand: {self.dict()}")
        except Exception as e:
            logger.error(f"Error validating TaskUpdateCommand: {str(e)}")
            logger.error(f"Invalid data received: {data}")
            raise


class TimeBlockCommand(BaseModel):
    workspace_id: str
    user_id: str
    start_time: datetime
    end_time: datetime
    description: str
    status: str = "pending"

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class TimeBlockUpdateCommand(BaseModel):
    id: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    description: Optional[str] = None
    status: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
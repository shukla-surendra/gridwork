from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class CommentCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    user_id: Optional[str] = None  # Set from the auth token by the controller
    content: str
    task_id: str


class CommentUpdateCommand(BaseModel):
    comment_id: Optional[str] = None
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    user_id: Optional[str] = None  # Set from the auth token by the controller
    content: Optional[str] = None
    properties: Optional[dict] = None


class CommentDeleteCommand(BaseModel):
    comment_id: str
    workspace_id: str
    user_id: Optional[str] = None


class PageCommentCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    page_id: Optional[str] = None  # Set from the URL path by the controller
    user_id: Optional[str] = None  # Set from the auth token by the controller
    content: str 
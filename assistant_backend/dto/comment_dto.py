from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from uuid import UUID

class CommentDto(BaseModel):
    comment_id: str
    workspace_id: str
    content: str
    user_id: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    task_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    edited: bool = False
    # Set on imported comments whose author isn't a
    # member here; the comment is stored under the importing user.
    author_name: Optional[str] = None
    user: Optional[Dict[str, Any]] = None

class CommentDtoMapper:
    @staticmethod
    def map_to_comment_dto(comment) -> CommentDto:
        return CommentDto(
            comment_id=str(comment.comment_id),
            workspace_id=str(comment.workspace_id),
            content=comment.content,
            user_id=str(comment.user_id),
            entity_type=comment.entity_type,
            entity_id=str(comment.entity_id) if comment.entity_id else None,
            task_id=str(comment.task_id) if comment.task_id else None,
            created_at=comment.created_at.isoformat() if comment.created_at else None,
            updated_at=comment.updated_at.isoformat() if comment.updated_at else None,
            edited=bool((comment.properties or {}).get("edited")),
            author_name=(comment.properties or {}).get("author_name"),
            user={
                'user_id': str(comment.user.user_id),
                'first_name': comment.user.first_name,
                'last_name': comment.user.last_name,
                'avatar_url': comment.user.avatar_url,
            } if comment.user else None,
        ) 
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from handlers.comment_handler import CommentHandler
from commands.comment_cmd import CommentCommand, CommentUpdateCommand, CommentDeleteCommand
from dto.comment_dto import CommentDto
from dto.comment_dto import CommentDtoMapper
from modules.access import require_module_enabled

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/comments", tags=["comments"])

# Already a live, always-on feature before the module registry existed --
# default_enabled=True so no existing workspace loses it silently.
gate = require_module_enabled("comments", default_enabled=True)

@router.post("/", response_model=CommentDto, status_code=status.HTTP_201_CREATED)
async def create_comment(command: CommentCommand, workspace_id: str, user: dict = Depends(gate)):
    handler = CommentHandler()
    assert command.workspace_id == workspace_id
    assert command.user_id == user.get("user_id")
    try:
        comment = handler.create_comment(command)
        return CommentDtoMapper.map_to_comment_dto(comment)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{comment_id}", response_model=CommentDto)
async def update_comment(comment_id: str, workspace_id: str, command: CommentUpdateCommand, user: dict = Depends(gate)):
    handler = CommentHandler()
    try:
        command.comment_id = comment_id
        comment = handler.update_comment(command)
        return CommentDtoMapper.map_to_comment_dto(comment)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(comment_id: str, workspace_id: str, user: dict = Depends(gate)):
    handler = CommentHandler()
    try:
        command = CommentDeleteCommand(comment_id=comment_id, workspace_id=workspace_id)
        handler.delete_comment(command)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{comment_id}", response_model=CommentDto)
async def get_comment(comment_id: str, workspace_id: str, user: dict = Depends(gate)):
    handler = CommentHandler()
    try:
        comment = handler.get_comment(comment_id)
        return CommentDtoMapper.map_to_comment_dto(comment)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks/{task_id}", response_model=List[CommentDto])
async def list_comments(workspace_id: str, task_id: str, user: dict = Depends(gate)):
    handler = CommentHandler()
    try:
        comments = handler.list_comments(workspace_id, task_id)
        return [CommentDtoMapper.map_to_comment_dto(comment) for comment in comments]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

comment_router = router 
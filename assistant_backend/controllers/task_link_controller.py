from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from starlette.responses import Response
from modules.access import require_module_enabled
from handlers.task_link_handler import TaskLinkHandler
from handlers.workspace_handlers import WorkspaceHandler
from commands.task_link_cmd import TaskLinkCommand
from dto.task_link_dto import TaskLinkDto, TaskLinkDtoMapper
from config import logger


router = APIRouter(
    prefix="/api/v1/workspaces/{workspace_id}/tasks/{task_id}/links",
    tags=["Task Links"],
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Internal server error"},
        status.HTTP_403_FORBIDDEN: {"description": "Operation not permitted"},
        status.HTTP_400_BAD_REQUEST: {"description": "Bad request"}
    },
)

# Already a live, always-on feature before the module registry existed --
# default_enabled=True so no existing workspace loses it silently.
gate = require_module_enabled("task_links", default_enabled=True)


def _verify_workspace_access(workspace_id: str, user_id: str):
    WorkspaceHandler().get_workspace(workspace_id, user_id)


@router.post("/", response_model=TaskLinkDto, status_code=status.HTTP_201_CREATED)
async def create_link(workspace_id: str, task_id: str, command: TaskLinkCommand, user: dict = Depends(gate)):
    _verify_workspace_access(workspace_id, user.get("user_id"))
    command.workspace_id = workspace_id
    command.source_task_id = task_id
    try:
        link = TaskLinkHandler().create_link(command)
        return TaskLinkDtoMapper.map_to_task_link_dto(link, viewpoint_task_id=task_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating task link: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[TaskLinkDto])
async def list_links(workspace_id: str, task_id: str, user: dict = Depends(gate)):
    _verify_workspace_access(workspace_id, user.get("user_id"))
    try:
        links = TaskLinkHandler().list_links(task_id, workspace_id)
        return [TaskLinkDtoMapper.map_to_task_link_dto(link, viewpoint_task_id=task_id) for link in links]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing task links: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_link(workspace_id: str, task_id: str, link_id: str, user: dict = Depends(gate)):
    _verify_workspace_access(workspace_id, user.get("user_id"))
    try:
        TaskLinkHandler().delete_link(link_id, task_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting task link: {e}")
        raise HTTPException(status_code=500, detail=str(e))


task_link_router = router

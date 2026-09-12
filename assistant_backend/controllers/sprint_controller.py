from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from starlette.responses import Response
from modules.access import require_module_enabled
from handlers.sprint_handler import SprintHandler
from handlers.workspace_handlers import WorkspaceHandler
from commands.sprint_cmd import SprintCommand, SprintUpdateCommand
from dto.sprint_dto import SprintDto, SprintDtoMapper
from config import logger


router = APIRouter(
    prefix="/api/v1/workspaces/{workspace_id}/boards/{board_id}/sprints",
    tags=["Sprints"],
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Internal server error"},
        status.HTTP_403_FORBIDDEN: {"description": "Operation not permitted"},
        status.HTTP_400_BAD_REQUEST: {"description": "Bad request"}
    },
)

# Already a live, always-on feature before the module registry existed --
# default_enabled=True so no existing workspace loses it silently.
gate = require_module_enabled("sprints", default_enabled=True)


def _verify_workspace_access(workspace_id: str, user_id: str):
    WorkspaceHandler().get_workspace(workspace_id, user_id)


@router.post("/", response_model=SprintDto, status_code=status.HTTP_201_CREATED)
async def create_sprint(workspace_id: str, board_id: str, command: SprintCommand, user: dict = Depends(gate)):
    _verify_workspace_access(workspace_id, user.get("user_id"))
    command.workspace_id = workspace_id
    command.board_id = board_id
    try:
        sprint = SprintHandler().create_sprint(command)
        return SprintDtoMapper.map_to_sprint_dto(sprint)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating sprint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[SprintDto])
async def list_sprints(workspace_id: str, board_id: str, user: dict = Depends(gate)):
    _verify_workspace_access(workspace_id, user.get("user_id"))
    try:
        sprints = SprintHandler().list_sprints(board_id)
        return [SprintDtoMapper.map_to_sprint_dto(sprint) for sprint in sprints]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing sprints: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sprint_id}", response_model=SprintDto)
async def get_sprint(workspace_id: str, board_id: str, sprint_id: str, user: dict = Depends(gate)):
    _verify_workspace_access(workspace_id, user.get("user_id"))
    try:
        sprint = SprintHandler().get_sprint(sprint_id)
        if str(sprint.board_id) != str(board_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")
        return SprintDtoMapper.map_to_sprint_dto(sprint)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting sprint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{sprint_id}", response_model=SprintDto)
async def update_sprint(workspace_id: str, board_id: str, sprint_id: str, command: SprintUpdateCommand, user: dict = Depends(gate)):
    _verify_workspace_access(workspace_id, user.get("user_id"))
    command.sprint_id = sprint_id
    try:
        sprint = SprintHandler().update_sprint(command)
        return SprintDtoMapper.map_to_sprint_dto(sprint)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating sprint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{sprint_id}/start", response_model=SprintDto)
async def start_sprint(workspace_id: str, board_id: str, sprint_id: str, user: dict = Depends(gate)):
    _verify_workspace_access(workspace_id, user.get("user_id"))
    try:
        sprint = SprintHandler().start_sprint(sprint_id)
        return SprintDtoMapper.map_to_sprint_dto(sprint)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting sprint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{sprint_id}/complete", response_model=SprintDto)
async def complete_sprint(workspace_id: str, board_id: str, sprint_id: str, user: dict = Depends(gate)):
    _verify_workspace_access(workspace_id, user.get("user_id"))
    try:
        sprint = SprintHandler().complete_sprint(sprint_id)
        return SprintDtoMapper.map_to_sprint_dto(sprint)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing sprint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{sprint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sprint(workspace_id: str, board_id: str, sprint_id: str, user: dict = Depends(gate)):
    _verify_workspace_access(workspace_id, user.get("user_id"))
    try:
        SprintHandler().delete_sprint(sprint_id, board_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting sprint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


sprint_router = router

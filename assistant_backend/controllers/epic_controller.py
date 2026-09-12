from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from starlette.responses import Response
from modules.access import require_module_enabled
from handlers.epic_handler import EpicHandler
from handlers.workspace_handlers import WorkspaceHandler
from commands.epic_cmd import EpicCommand, EpicUpdateCommand
from dto.epic_dto import EpicDto, EpicDtoMapper
from config import logger


router = APIRouter(
    prefix="/api/v1/workspaces/{workspace_id}/boards/{board_id}/epics",
    tags=["Epics"],
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Internal server error"},
        status.HTTP_403_FORBIDDEN: {"description": "Operation not permitted"},
        status.HTTP_400_BAD_REQUEST: {"description": "Bad request"}
    },
)

# Already a live, always-on feature before the module registry existed --
# default_enabled=True so no existing workspace loses it silently.
gate = require_module_enabled("epics", default_enabled=True)


def _verify_workspace_access(workspace_id: str, user_id: str):
    WorkspaceHandler().get_workspace(workspace_id, user_id)


@router.post("/", response_model=EpicDto, status_code=status.HTTP_201_CREATED)
async def create_epic(workspace_id: str, board_id: str, command: EpicCommand, user: dict = Depends(gate)):
    _verify_workspace_access(workspace_id, user.get("user_id"))
    command.workspace_id = workspace_id
    command.board_id = board_id
    try:
        epic = EpicHandler().create_epic(command)
        return EpicDtoMapper.map_to_epic_dto(epic)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating epic: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[EpicDto])
async def list_epics(workspace_id: str, board_id: str, user: dict = Depends(gate)):
    _verify_workspace_access(workspace_id, user.get("user_id"))
    try:
        epics = EpicHandler().list_epics(board_id)
        return [EpicDtoMapper.map_to_epic_dto(epic) for epic in epics]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing epics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{epic_id}", response_model=EpicDto)
async def get_epic(workspace_id: str, board_id: str, epic_id: str, user: dict = Depends(gate)):
    _verify_workspace_access(workspace_id, user.get("user_id"))
    try:
        epic = EpicHandler().get_epic(epic_id)
        if str(epic.board_id) != str(board_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Epic not found")
        return EpicDtoMapper.map_to_epic_dto(epic)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting epic: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{epic_id}", response_model=EpicDto)
async def update_epic(workspace_id: str, board_id: str, epic_id: str, command: EpicUpdateCommand, user: dict = Depends(gate)):
    _verify_workspace_access(workspace_id, user.get("user_id"))
    command.epic_id = epic_id
    try:
        epic = EpicHandler().update_epic(command)
        return EpicDtoMapper.map_to_epic_dto(epic)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating epic: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{epic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_epic(workspace_id: str, board_id: str, epic_id: str, user: dict = Depends(gate)):
    _verify_workspace_access(workspace_id, user.get("user_id"))
    try:
        EpicHandler().delete_epic(epic_id, board_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting epic: {e}")
        raise HTTPException(status_code=500, detail=str(e))


epic_router = router

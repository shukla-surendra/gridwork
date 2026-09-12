from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
from handlers.activity_handler import ActivityHandler
from commands.activity_cmd import ActivityCommand, ActivityUpdateCommand, ActivityDeleteCommand
from adapters.orm.models.pg_models import Activity
from dto.activity_dto import ActivityDto
from dto.activity_dto import ActivityDtoMapper
from modules.access import require_module_enabled

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/activities", tags=["activities"])

# Already a live, always-on feature before the module registry existed --
# default_enabled=True so no existing workspace loses it silently.
gate = require_module_enabled("activity", default_enabled=True)

@router.post("/", response_model=ActivityDto, status_code=status.HTTP_201_CREATED)
async def create_activity(command: ActivityCommand, workspace_id: str, user: dict = Depends(gate)):
    handler = ActivityHandler()
    command.workspace_id = workspace_id
    command.user_id = user.get("user_id")
    try:
        activity = handler.create_activity(command)
        return ActivityDtoMapper.map_to_activity_dto(activity)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{activity_id}", response_model=ActivityDto)
async def update_activity(activity_id: str, command: ActivityUpdateCommand, workspace_id: str, user: dict = Depends(gate)):
    handler = ActivityHandler()
    # ActivityUpdateCommand has no workspace_id/user_id fields (and
    # update_activity doesn't use them) -- assigning them here raised
    # "ActivityUpdateCommand object has no field ..." on every call.
    command.activity_id = activity_id
    try:
        activity = handler.update_activity(command)
        return ActivityDtoMapper.map_to_activity_dto(activity)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(activity_id: str, workspace_id: str, user: dict = Depends(gate)):
    handler = ActivityHandler()
    try:
        command = ActivityDeleteCommand(activity_id=activity_id, workspace_id=workspace_id, user_id=user.get("user_id"))
        handler.delete_activity(command)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{activity_id}", response_model=ActivityDto)
async def get_activity(activity_id: str, workspace_id: str, user: dict = Depends(gate)):
    handler = ActivityHandler()
    try:
        activity = handler.get_activity(activity_id, workspace_id)
        return ActivityDtoMapper.map_to_activity_dto(activity)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[ActivityDto])
async def list_activities(
    workspace_id: str,
    entity_type: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(gate),
):
    handler = ActivityHandler()
    try:
        # list_activities's 2nd positional param is entity_id, not a user
        # filter -- passing the caller's user_id there was silently
        # filtering every activity out (no row's entity_id ever matches a
        # user_id), so this endpoint always returned an empty list.
        activities = handler.list_activities(workspace_id, entity_type=entity_type, limit=limit)
        return [ActivityDtoMapper.map_to_activity_dto(a) for a in activities]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

activity_router = router 
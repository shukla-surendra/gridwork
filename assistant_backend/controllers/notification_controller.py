from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from handlers.notification_handler import NotificationHandler
from commands.notification_cmd import NotificationCommand, NotificationUpdateCommand, NotificationDeleteCommand
from dto.notification_dto import NotificationDto
from dto.notification_dto import NotificationDtoMapper
from modules.access import require_module_enabled

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/notifications", tags=["notifications"])

# Already a live, always-on feature before the module registry existed --
# default_enabled=True so no existing workspace loses it silently.
gate = require_module_enabled("notifications", default_enabled=True)

@router.post("/", response_model=NotificationDto, status_code=status.HTTP_201_CREATED)
async def create_notification(workspace_id: str, command: NotificationCommand, user: dict = Depends(gate)):
    handler = NotificationHandler()
    try:
        command.workspace_id = workspace_id
        command.user_id = user.get("user_id")
        notification = handler.create_notification(command)
        return NotificationDtoMapper.map_to_notification_dto(notification)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/read-all")
async def mark_all_read(workspace_id: str, user: dict = Depends(gate)):
    """Mark every one of the caller's notifications in this workspace read"""
    return {"updated": NotificationHandler().mark_all_read(workspace_id, user.get("user_id"))}

@router.put("/{notification_id}", response_model=NotificationDto)
async def update_notification(notification_id: str, workspace_id: str, command: NotificationUpdateCommand, user: dict = Depends(gate)):
    handler = NotificationHandler()
    try:
        command.notification_id = notification_id
        command.workspace_id = workspace_id
        command.user_id = user.get("user_id")
        notification = handler.update_notification(command)
        return NotificationDtoMapper.map_to_notification_dto(notification)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(notification_id: str, workspace_id: str, user: dict = Depends(gate)):
    handler = NotificationHandler()
    try:
        command = NotificationDeleteCommand(notification_id=notification_id, workspace_id=workspace_id, user_id=user.get("user_id"))
        handler.delete_notification(command)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{notification_id}", response_model=NotificationDto)
async def get_notification(notification_id: str, workspace_id: str, user: dict = Depends(gate)):
    handler = NotificationHandler()
    try:
        notification = handler.get_notification(notification_id, workspace_id, user.get("user_id"))
        return NotificationDtoMapper.map_to_notification_dto(notification)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[NotificationDto])
async def list_notifications(workspace_id: str, entity_id: Optional[str] = None, entity_type: Optional[str] = None, user: dict = Depends(gate)):
    handler = NotificationHandler()
    try:
        notifications = handler.list_notifications(workspace_id, user.get("user_id"), entity_id, entity_type)
        return [NotificationDtoMapper.map_to_notification_dto(notification) for notification in notifications]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

notification_router = router

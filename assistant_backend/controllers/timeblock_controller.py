from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from dto.task_dto import TaskDto
from commands.task_cmd import TaskCommand, TaskUpdateCommand, TaskDeleteCommand
from handlers.task_handler import TaskHandler
from config import logger
from constants import TaskType
from authorization.auth import get_auth_details

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}")

# NOT actually reachable from the current frontend -- the Time Block page
# reads/writes through the core /tasks endpoint with task_type=time_block
# instead (see services/taskservice.js), so these routes are effectively
# dead code today. "timeblocks" is a nav-only module (modules/registry.py,
# NAV_ONLY_MODULES) enforced client-side, not via require_module_enabled
# here -- Time Blocking is just a Task subtype, and Tasks stays core/
# ungated (see that comment for why).

@router.post("/timeblocks", status_code=status.HTTP_201_CREATED)
async def create_time_block(
    workspace_id: str,
    task_cmd: TaskCommand,
    user: dict = Depends(get_auth_details)
):
    """Create a new time block"""
    try:
        # Set task type to TIME_BLOCK
        task_cmd.task_type = TaskType.TIME_BLOCK.value
        task_cmd.workspace_id = workspace_id
        task_cmd.user_id = user.get("user_id")

        return TaskHandler().create_task(task_cmd)
    except Exception as e:
        logger.error(f"Error creating time block: {e}")
        raise HTTPException(status_code=500, detail="Failed to create time block")

@router.get("/timeblocks", status_code=status.HTTP_200_OK)
async def get_time_blocks(
    workspace_id: str,
    user: dict = Depends(get_auth_details),
    skip: int = 0,
    limit: int = 50
):
    """Get all time blocks for a workspace"""
    try:
        return TaskHandler().list_tasks(
            workspace_id=workspace_id,
            user_id=user.get("user_id"),
            skip=skip,
            limit=limit,
            task_type=TaskType.TIME_BLOCK.value
        )
    except Exception as e:
        logger.error(f"Error getting time blocks: {e}")
        raise HTTPException(status_code=500, detail="Failed to get time blocks")

@router.put("/timeblocks/{task_id}", status_code=status.HTTP_200_OK)
async def update_time_block(
    workspace_id: str,
    task_id: str,
    task_cmd: TaskUpdateCommand,
    user: dict = Depends(get_auth_details)
):
    """Update a time block"""
    try:
        task_cmd.task_id = task_id
        task_cmd.workspace_id = workspace_id
        task_cmd.user_id = user.get("user_id")
        task_cmd.task_type = TaskType.TIME_BLOCK.value
        
        return TaskHandler().update_task(task_cmd)
    except Exception as e:
        logger.error(f"Error updating time block: {e}")
        raise HTTPException(status_code=500, detail="Failed to update time block")

@router.delete("/timeblocks/{task_id}", status_code=status.HTTP_200_OK)
async def delete_time_block(
    workspace_id: str,
    task_id: str,
    user: dict = Depends(get_auth_details)
):
    """Delete a time block"""
    try:
        delete_cmd = TaskDeleteCommand(
            task_id=task_id,
            workspace_id=workspace_id,
            user_id=user.get("user_id")
        )
        return TaskHandler().delete_task(delete_cmd)
    except Exception as e:
        logger.error(f"Error deleting time block: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete time block")

timeblock_router = router 
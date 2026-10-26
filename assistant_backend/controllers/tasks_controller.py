from fastapi import APIRouter, Depends, HTTPException
from starlette import status
from starlette.responses import Response
from commands.task_cmd import TaskCommand, TaskDeleteCommand, TaskUpdateCommand
from handlers.task_handler import TaskHandler
from authorization.auth import get_auth_details
from config import logger


router = APIRouter(
    prefix="/api/v1/workspaces/{workspace_id}",
    tags=["Tasks and Notes"],
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Internal server error"},
        status.HTTP_403_FORBIDDEN: {"description": "Operation not permitted"}
    },
)


@router.post("/tasks", status_code=status.HTTP_201_CREATED)
async def create_tasks(
    workspace_id: str,
    tasks_cmd: TaskCommand, 
    user: dict = Depends(get_auth_details)
):
    """Create a new task in DynamoDB"""
    try:
        tasks_cmd.workspace_id = workspace_id
        tasks_cmd.user_id = user.get("user_id")
        return TaskHandler().create_task(tasks_cmd)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise HTTPException(status_code=500, detail="Failed to create task")


@router.get("/tasks", status_code=status.HTTP_200_OK)
async def list_tasks(
    workspace_id: str,
    user: dict = Depends(get_auth_details),
    task_status: str = None,
    order: str = 'desc',
    task_type: str = None,
    board_id: str = None,
    sprint_id: str = None,
    backlog_only: bool = False,
    epic_id: str = None,
    skip: int = 0,
    page_size: int = 50,
    priority: int = None
):
    """List tasks with filtering and pagination"""
    try:
        user_id = user.get("user_id")
        return TaskHandler().list_tasks(
            workspace_id=workspace_id,
            board_id=board_id,
            user_id=user_id,
            skip=skip,
            limit=page_size,
            task_status=task_status,
            task_type=task_type,
            order=order,
            priority=priority,
            sprint_id=sprint_id,
            backlog_only=backlog_only,
            epic_id=epic_id
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error listing tasks: {e}")
        raise HTTPException(status_code=500, detail="Failed to list tasks")


@router.get("/tasks/key/{ticket_key}", status_code=status.HTTP_200_OK)
async def get_task_by_key(
    workspace_id: str,
    ticket_key: str,
    user: dict = Depends(get_auth_details)
):
    """Get a single task by its Jira-style key, e.g. ENG-42"""
    try:
        return TaskHandler().get_task_by_key(
            workspace_id=workspace_id,
            ticket_key=ticket_key,
            user_id=user.get("user_id")
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error getting task by key: {e}")
        raise HTTPException(status_code=500, detail="Failed to get task")


@router.get("/tasks/{task_id}", status_code=status.HTTP_200_OK)
async def get_task(
    workspace_id: str,
    task_id: str,
    user: dict = Depends(get_auth_details)
):
    """Get a single task by ID"""
    try:
        return TaskHandler().get_task(
            workspace_id=workspace_id,
            task_id=task_id,
            user_id=user.get("user_id")
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error getting task: {e}")
        raise HTTPException(status_code=500, detail="Failed to get task")


@router.get("/posts/{slug}", status_code=status.HTTP_200_OK)
async def get_post_by_slug(
    workspace_id: str,
    slug: str,
    user: dict = Depends(get_auth_details)
):
    """Get a task by its slug"""
    try:
        return TaskHandler().get_task_by_slug(
            workspace_id=workspace_id,
            slug=slug,
            user_id=user.get("user_id")
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error getting task by slug: {e}")
        raise HTTPException(status_code=500, detail="Failed to get task")


@router.put("/tasks/{task_id}", status_code=status.HTTP_200_OK)
async def update_task(
    workspace_id: str,
    task_id: str,
    task_cmd: TaskUpdateCommand,
    user: dict = Depends(get_auth_details)
):
    """Update an existing task"""
    try:
        task_cmd.workspace_id = workspace_id
        task_cmd.task_id = task_id
        task_cmd.user_id = user.get("user_id")
        return TaskHandler().update_task(task_cmd)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating task: {e}")
        raise HTTPException(status_code=500, detail="Failed to update task")


@router.delete("/tasks/{task_id}", status_code=status.HTTP_200_OK)
async def delete_task(
    workspace_id: str,
    task_id: str,
    user: dict = Depends(get_auth_details)
):
    """Soft delete a task"""
    try:
        task_cmd = TaskDeleteCommand(
            task_id=task_id,
            user_id=user.get("user_id"),
            workspace_id=workspace_id
        )
        TaskHandler().delete_task(task_cmd)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting task: {str(e)}")


tasks_router = router




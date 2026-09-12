from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from pydantic import BaseModel
from core.agent import Agent
from authorization.auth import get_auth_details
from handlers.workspace_handlers import WorkspaceHandler
from modules.access import is_module_enabled

router = APIRouter(
    prefix="/api/v1/assistant",
    tags=["Assistant"],
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Internal server error"},
    },
)

class CommandRequest(BaseModel):
    """Request model for assistant commands."""
    command: str
    workspace_id: str

class CommandResponse(BaseModel):
    """Response model for assistant commands."""
    message: str
    data: Dict[str, Any] = {}

@router.post("/command", response_model=CommandResponse)
async def process_command(
    request: CommandRequest,
    user: dict = Depends(get_auth_details)
):
    """Process a natural language command via OpenAI, then execute it
    against the real Task/Reminder handlers."""
    # workspace_id arrives in the request body, not the URL path, so it
    # can't be gated via require_module_enabled's path-param-binding
    # dependency (see modules/access.py) -- checked by hand instead.
    WorkspaceHandler().get_workspace(request.workspace_id, user.get("user_id"))
    if not is_module_enabled(request.workspace_id, "assistant", default_enabled=True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The 'assistant' module is not enabled for this workspace",
        )
    try:
        agent = Agent(user.get("user_id"), request.workspace_id)
        response = agent.process_command(request.command)
        return CommandResponse(**response)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

assistant_router = router

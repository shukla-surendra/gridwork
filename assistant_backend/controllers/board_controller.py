from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from starlette.responses import Response
from authorization.auth import get_auth_details
from handlers.board_handler import BoardHandler
from handlers.workspace_handlers import WorkspaceHandler
from commands.board_cmd import BoardCommand, BoardUpdateCommand, BoardDeleteCommand
from dto.board_dto import BoardDto, BoardDtoMapper
from adapters.orm.models.database import SessionLocal
from handlers import issue_import_handler
from pydantic import BaseModel
from config import logger


router = APIRouter(
    prefix="/api/v1/workspaces/{workspace_id}/boards",
    tags=["Boards"],
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Internal server error"},
        status.HTTP_403_FORBIDDEN: {"description": "Operation not permitted"},
        status.HTTP_400_BAD_REQUEST: {"description": "Bad request"}
    },
)


def _verify_workspace_access(workspace_id: str, user_id: str):
    """Raises 404/403 unless the caller owns or is a member of the
    workspace -- WorkspaceHandler.get_workspace() already does exactly
    this check for the /workspaces routes; boards live under a workspace
    so they need the same gate, not a bespoke one."""
    WorkspaceHandler().get_workspace(workspace_id, user_id)


@router.post("/", response_model=BoardDto, status_code=status.HTTP_201_CREATED)
async def create_board(workspace_id: str, command: BoardCommand, user: dict = Depends(get_auth_details)):
    """Create a new board in a workspace"""
    _verify_workspace_access(workspace_id, user.get("user_id"))
    command.workspace_id = workspace_id
    command.user_id = user.get("user_id")
    try:
        board = BoardHandler().create_board(command)
        return BoardDtoMapper.map_to_board_dto(board)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating board: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[BoardDto])
async def list_boards(workspace_id: str, user: dict = Depends(get_auth_details)):
    """List all boards in a workspace"""
    _verify_workspace_access(workspace_id, user.get("user_id"))
    try:
        boards = BoardHandler().list_boards(workspace_id)
        return [BoardDtoMapper.map_to_board_dto(board) for board in boards]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing boards: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{board_id}", response_model=BoardDto)
async def get_board(workspace_id: str, board_id: str, user: dict = Depends(get_auth_details)):
    """Get a single board by ID"""
    _verify_workspace_access(workspace_id, user.get("user_id"))
    try:
        board = BoardHandler().get_board(board_id)
        if str(board.workspace_id) != str(workspace_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
        return BoardDtoMapper.map_to_board_dto(board)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting board: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{board_id}", response_model=BoardDto)
async def update_board(workspace_id: str, board_id: str, command: BoardUpdateCommand, user: dict = Depends(get_auth_details)):
    """Update an existing board"""
    _verify_workspace_access(workspace_id, user.get("user_id"))
    command.board_id = board_id
    try:
        board = BoardHandler().update_board(command)
        return BoardDtoMapper.map_to_board_dto(board)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating board: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(workspace_id: str, board_id: str, user: dict = Depends(get_auth_details)):
    """Soft delete a board"""
    _verify_workspace_access(workspace_id, user.get("user_id"))
    try:
        command = BoardDeleteCommand(board_id=board_id, workspace_id=workspace_id, user_id=user.get("user_id"))
        BoardHandler().delete_board(command)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting board: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class IssueImportRequest(BaseModel):
    csv: str
    # Preview by default: nothing is saved unless the caller says so.
    dry_run: bool = True


@router.post("/{board_id}/import")
def import_issues(workspace_id: str, board_id: str, body: IssueImportRequest, user: dict = Depends(get_auth_details)):
    """Import a CSV issue export into this board (owners/admins only)."""
    _verify_workspace_access(workspace_id, user.get("user_id"))
    db = SessionLocal()
    try:
        return issue_import_handler.import_issues_csv(db, workspace_id, board_id, user.get("user_id"), body.csv, dry_run=body.dry_run)
    finally:
        db.close()


board_router = router

from fastapi import APIRouter, Depends, UploadFile, File
from starlette.responses import Response
from starlette import status
from fastapi import HTTPException
from commands.user_cmd import (
    UserCommand, 
    LoginCommand,
    EmailVerificationRequest,
    UserUpdateCommand,
    ChangePasswordCommand,
)
from handlers.user_handler import UserHandler
from authorization.auth import get_auth_details

router = APIRouter(
    prefix="/api/v1/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def create_users(users_cmd: UserCommand):
    """Create a new user with Cognito and DynamoDB"""
    return UserHandler().sign_up(cmd=users_cmd)

@router.post("/login", status_code=status.HTTP_200_OK)
async def login_user(users_cmd: LoginCommand):
    """Authenticate user with Cognito"""
    return UserHandler().login(cmd=users_cmd)

@router.post("/demo", status_code=status.HTTP_200_OK)
async def create_demo_account():
    """Create a brand-new, fully-seeded demo account (unique user +
    workspace with sample tasks/board/CRM/docs/chat data every call) and
    return it in the same shape login() does -- deliberately public/
    unauthenticated so a 'Try Demo' button can log a visitor straight in
    with no signup form. Falls under the same per-IP unauthenticated rate
    limit as signup/login (middleware/rate_limit.py) -- no separate
    stricter limit for this route specifically."""
    return UserHandler().create_demo_account()

@router.get("/me", status_code=status.HTTP_200_OK)
async def get_me(user: dict = Depends(get_auth_details)):
    """Get current user's profile"""
    return UserHandler().get_user(user.get("user_id"))

@router.post("/me/password", status_code=status.HTTP_200_OK)
async def change_password(cmd: ChangePasswordCommand, user: dict = Depends(get_auth_details)):
    """Change the signed-in user's password (current password required)"""
    return UserHandler().change_password(user.get("user_id"), cmd)

@router.put("/{user_id}", status_code=status.HTTP_200_OK)
async def update_users(user_id: str, user_cmd: UserUpdateCommand, user: dict = Depends(get_auth_details)):
    """Update user profile in both Cognito and DynamoDB"""
    if user.get("user_id") == str(user_id):
        user_cmd.user_id = user_id
        return UserHandler().update_user(user_cmd)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operation not permitted")

@router.post("/{user_id}/avatar", status_code=status.HTTP_200_OK)
async def upload_avatar(user_id: str, file: UploadFile = File(...), user: dict = Depends(get_auth_details)):
    """Upload/replace the caller's own profile picture"""
    if user.get("user_id") == str(user_id):
        return await UserHandler().update_avatar(user_id, file)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operation not permitted")

@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(user_id: str, user: dict = Depends(get_auth_details)):
    """Soft delete user in DynamoDB and delete from Cognito"""
    if user.get("user_id") == str(user_id):
        UserHandler().delete_user(user_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operation not permitted")

@router.get("/{user_id}", status_code=status.HTTP_200_OK)
async def get_user(user_id: str, user: dict = Depends(get_auth_details)):
    """Get user profile by ID"""
    if user.get("user_id") == str(user_id):
        return UserHandler().get_user(user_id)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operation not permitted")

@router.get("/", status_code=status.HTTP_200_OK)
async def list_users(user: dict = Depends(get_auth_details)):
    """List all active users"""
    return UserHandler().list_users()

@router.post("/email-verification/verify")
async def verify_email_with_token(token_cmd: EmailVerificationRequest):
    """Verify email with Cognito and update DynamoDB"""
    return UserHandler().verify_email(token_cmd)

@router.get("/workspaces/{user_id}", status_code=status.HTTP_200_OK)
async def get_user_workspaces(user_id: str, user: dict = Depends(get_auth_details)):
    """Get all workspaces where user is a member"""
    if user.get("user_id") == str(user_id):
        return UserHandler().get_user_workspaces(user_id)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operation not permitted")

@router.get("/workspaces/{user_id}/owned", status_code=status.HTTP_200_OK)
async def get_owned_workspaces(user_id: str, user: dict = Depends(get_auth_details)):
    """Get all workspaces owned by the user"""
    if user.get("user_id") == str(user_id):
        return UserHandler().get_owned_workspaces(user_id)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operation not permitted")

users_router = router



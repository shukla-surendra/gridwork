""""""
from starlette import status
from fastapi import HTTPException, UploadFile
from commands.user_cmd import UserCommand, UserUpdateCommand, ChangePasswordCommand
from utils.passwords import validate_password_strength
from dto.user_dto import UserDtoMapper
from config import logger, get_config
from commands.user_cmd import EmailVerificationRequest, LoginCommand
from adapters.factory import AdapterFactory, StorageType, AuthType
from adapters.orm.models.database import SessionLocal
from adapters.orm.fixtures import create_demo_account
from adapters.blob import AzureBlobStorage

ALLOWED_AVATAR_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}
MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024  # 5MB

config = get_config()

class UserHandler:
    def __init__(self):
        self.factory = AdapterFactory()
        self.storage = self.factory.get_storage_adapter(StorageType(config.storage_type))
        self.auth = self.factory.get_auth_adapter(AuthType(config.auth_type))

    def get_user(self, identifier):
        """Get user by email or user_id"""
        try:
            # First try to get user by ID
            user = self.storage.get_user_by_id(identifier)
            if not user:
                # If not found by ID, try to get by email
                user = self.storage.get_user_by_email(identifier)
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
            return UserDtoMapper.map_to_user_dto_mapper(user)
        except Exception as e:
            logger.error(f"Error getting user: {e}")
            raise HTTPException(status_code=500, detail="Failed to get user")

    def update_user(self, user_cmd: UserUpdateCommand):
        try:
            # Get existing user from storage
            user = self.storage.get_user_by_id(user_cmd.user_id)
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

            # Update user attributes
            update_data = {}
            if user_cmd.first_name:
                update_data['first_name'] = user_cmd.first_name
            if user_cmd.last_name:
                update_data['last_name'] = user_cmd.last_name
            if user_cmd.bio is not None:
                update_data['bio'] = user_cmd.bio

            if update_data:
                updated_user = self.storage.update_user(user_cmd.user_id, update_data)
                if not updated_user:
                    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user")
                # Map through the DTO rather than returning the storage
                # adapter's raw dict -- that dict includes password_hash,
                # which this route has no response_model to filter out.
                return UserDtoMapper.map_to_user_dto_mapper(updated_user)
            return UserDtoMapper.map_to_user_dto_mapper(user)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            raise HTTPException(status_code=500, detail="Failed to update user")

    async def update_avatar(self, user_id: str, file: UploadFile):
        if file.content_type not in ALLOWED_AVATAR_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported image type: {file.content_type}"
            )

        content = await file.read(MAX_AVATAR_SIZE_BYTES + 1)
        if len(content) > MAX_AVATAR_SIZE_BYTES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image must be 5MB or smaller")

        try:
            avatar_url = AzureBlobStorage().upload_avatar(user_id, content, file.content_type)
            updated_user = self.storage.update_user(user_id, {"avatar_url": avatar_url})
            if not updated_user:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save avatar")
            updated_user.pop("password_hash", None)
            return updated_user
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error uploading avatar: {e}")
            raise HTTPException(status_code=500, detail="Failed to upload avatar")

    def list_users(self):
        try:
            # Get all active users from storage
            users = self.storage.list_users()
            return self.list_map_to_dto(users)
        except Exception as e:
            logger.error(f"Error listing users: {e}")
            raise HTTPException(status_code=500, detail="Failed to list users")

    def delete_user(self, user_id: str):
        try:
            # Soft delete user in storage
            success = self.storage.delete_user(user_id)
            if not success:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete user")
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            raise HTTPException(status_code=500, detail="Failed to delete user")

    def change_password(self, user_id: str, cmd: ChangePasswordCommand):
        """Requires the current password, so a stolen session token alone
        can't be used to lock the real owner out of their account."""
        user = self.storage.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if not self.storage.verify_password(user['password_hash'], cmd.current_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
        if cmd.new_password == cmd.current_password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different from the current one")
        try:
            validate_password_strength(cmd.new_password)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        try:
            self.storage.update_user(user_id, {'password': cmd.new_password})
        except Exception as e:
            logger.error(f"Error changing password: {e}")
            raise HTTPException(status_code=500, detail="Failed to change password")
        return {"message": "Password changed"}

    def verify_email(self, tcr_cmd: EmailVerificationRequest):
        try:
            # Update email verification status in storage
            success = self.storage.verify_email(tcr_cmd.email)
            if not success:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to verify email")
            return {"message": "Email verified successfully"}
        except Exception as e:
            logger.error(f"Error verifying email: {e}")
            raise HTTPException(status_code=500, detail="Failed to verify email")

    def login(self, cmd: LoginCommand):
        try:
            # Get user from storage
            user = self.storage.get_user_by_email(cmd.email)
            if not user:
                logger.error(f"User with email {cmd.email} not found")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )

            # Verify password
            if not self.storage.verify_password(user['password_hash'], cmd.password):
                logger.error(f"Invalid password for user {cmd.email}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )

            # Get default workspace
            from handlers.workspace_handlers import WorkspaceHandler
            workspace_handler = WorkspaceHandler()
            default_workspace = workspace_handler.get_default_workspace(user['user_id'])

            # Generate JWT token
            token = self.auth.generate_token(user)
            return {
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "user_id": user['user_id'],
                    "email": user['email'],
                    "first_name": user['first_name'],
                    "last_name": user['last_name'],
                    "role": user['role'],
                    "avatar_url": user.get('avatar_url'),
                    "default_workspace": {
                        "workspace_id": default_workspace.workspace_id if default_workspace else None,
                        "name": default_workspace.name if default_workspace else None
                    }
                }
            }
        except HTTPException as he:
            raise he
        except Exception as e:
            logger.error(f"Error during login: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to login user"
            )

    def create_demo_account(self):
        """Creates a brand-new, fully-seeded demo user + workspace (see
        adapters/orm/fixtures.py's create_demo_account) and returns the
        exact same shape login() does, so the frontend can treat this as
        an ordinary successful login -- no password, no signup form."""
        db = SessionLocal()
        try:
            owner, workspace = create_demo_account(db)
            # generate_token() only reads user_id/email/role -- build the
            # plain dict it expects rather than passing the ORM object,
            # since it indexes with user['key'] not attribute access.
            token = self.auth.generate_token({
                "user_id": owner.user_id,
                "email": owner.email,
                "role": owner.role,
            })
            return {
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "user_id": owner.user_id,
                    "email": owner.email,
                    "first_name": owner.first_name,
                    "last_name": owner.last_name,
                    "role": owner.role,
                    "avatar_url": owner.avatar_url,
                    "default_workspace": {
                        "workspace_id": workspace.workspace_id,
                        "name": workspace.name,
                    }
                }
            }
        except Exception as e:
            logger.error(f"Error creating demo account: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create demo account"
            )
        finally:
            db.close()

    def sign_up(self, cmd: UserCommand):
        try:
            # Create user data dictionary with all required fields
            user_data = {
                'email': cmd.email,
                'first_name': cmd.first_name,
                'last_name': cmd.last_name,
                'status': 'ACTIVE',
                'role': 'USER',
                'user_type': 'FREE',
                'password': cmd.password  # This will be hashed in the storage adapter
            }

            logger.info(f"Creating user with data: {user_data}")

            # Create user in storage
            try:
                user = self.storage.create_user(user_data)
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to create user in database"
                    )
                logger.info(f"User created successfully: {user}")

                # Create default workspace for the user
                try:
                    from handlers.workspace_handlers import WorkspaceHandler
                    from commands.workspace_cmd import WorkspaceCreateCommand

                    workspace_handler = WorkspaceHandler()
                    default_workspace = WorkspaceCreateCommand(
                        name=f"{cmd.first_name}'s Workspace",
                        description="My default workspace",
                        owner_id=user.get("user_id"),
                        is_default=True)
                    workspace = workspace_handler.create_workspace(default_workspace)
                    logger.info(f"Default workspace created successfully: {workspace}")

                    # Create default board for the workspace
                    try:
                        from handlers.board_handler import BoardHandler
                        from commands.board_cmd import BoardCommand

                        board_handler = BoardHandler()
                        default_board = BoardCommand(
                            name="My Board",
                            description="Default board",
                            workspace_id=workspace.workspace_id
                        )
                        board = board_handler.create_board(default_board)
                        logger.info(f"Default board created successfully: {board}")
                    except Exception as board_error:
                        logger.error(f"Error creating default board: {str(board_error)}")
                        # Don't fail the signup if board creation fails
                        pass

                    # Update user with default workspace
                    user['default_workspace'] = {
                        'workspace_id': workspace.workspace_id,
                        'workspace_name': workspace.name
                    }
                except Exception as workspace_error:
                    logger.error(f"Error creating default workspace: {str(workspace_error)}")
                    # Don't fail the signup if workspace creation fails
                    pass

                return user
            except HTTPException:
                raise
            except Exception as storage_error:
                logger.error(f"Storage error in sign up: {str(storage_error)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user in database"
                )

        except HTTPException as he:
            raise he
        except Exception as e:
            logger.error(f"Error in sign up: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to sign up user"
            )

    @staticmethod
    def list_map_to_dto(list_data):
        return [UserDtoMapper.map_to_user_dto_mapper(user_obj) for user_obj in list_data]
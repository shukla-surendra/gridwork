from datetime import datetime
from starlette import status
from fastapi import HTTPException
from commands.workspace_cmd import (
    WorkspaceCreateCommand,
    WorkspaceInviteMemberCommand
)
from dto.workspace_dto import WorkspaceDtoMapper
from adapters.orm.models.pg_models import Workspace, workspace_users, User, Board
from config import logger
from adapters.orm.models.database import get_db
from sqlalchemy import select
from uuid import UUID


class WorkspaceHandler:
    def __init__(self):
        self.db = next(get_db())

    def create_workspace(self, workspace: WorkspaceCreateCommand):
        """ Create a new workspace in PostgreSQL """
        try:
            new_workspace = Workspace(
                name=workspace.name,
                description=workspace.description,
                owner_id=workspace.owner_id,
                is_default=workspace.is_default,
                settings={}
            )
            self.db.add(new_workspace)
            self.db.commit()
            self.db.refresh(new_workspace)
            return WorkspaceDtoMapper.map_to_workspace_dto_mapper(new_workspace)
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating workspace: {e}")
            raise HTTPException(status_code=500, detail="Failed to create workspace")

    def update_workspace(self, workspace_id: str, user_id: str, name: str = None, 
                        description: str = None, settings: dict = None):
        """ Update an existing workspace """
        try:
            workspace = self.db.query(Workspace).filter(
                Workspace.workspace_id == workspace_id,
                Workspace.is_deleted == False
            ).first()
            
            if not workspace:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

            if str(workspace.owner_id) != str(user_id):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                 detail="Not authorized to update this workspace")

            if name:
                workspace.name = name
            if description:
                workspace.description = description
            if settings:
                workspace.settings = settings

            workspace.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(workspace)
            return WorkspaceDtoMapper.map_to_workspace_dto_mapper(workspace)

        except HTTPException as he:
            self.db.rollback()
            raise he
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating workspace: {e}")
            raise HTTPException(status_code=500, detail="Failed to update workspace")

    def list_workspaces(self, user_id: str):
        """ List workspaces owned by user """
        try:
            logger.info(f"Listing workspaces for user_id: {user_id}")
            workspaces = self.db.query(Workspace).filter(
                Workspace.owner_id == user_id,
                Workspace.is_deleted == False
            ).all()
            
            logger.info(f"Found {len(workspaces)} workspaces")
            mapped_workspaces = []
            for workspace in workspaces:
                try:
                    logger.info(f"Mapping workspace: {workspace}")
                    mapped_workspace = WorkspaceDtoMapper.map_to_workspace_dto_mapper(workspace)
                    mapped_workspaces.append(mapped_workspace)
                except Exception as e:
                    logger.error(f"Error mapping workspace {workspace}: {str(e)}")
                    raise
            
            logger.info(f"Successfully mapped {len(mapped_workspaces)} workspaces")
            return mapped_workspaces
        except Exception as e:
            logger.error(f"Error listing workspaces: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to list workspaces: {str(e)}")

    def find_workspaces_by_member(self, user_id: str):
        """ Find workspaces where user is a member """
        try:
            logger.info(f"Finding workspaces for member user_id: {user_id}")
            workspaces = self.db.query(Workspace).join(
                workspace_users
            ).filter(
                workspace_users.c.user_id == user_id,
                Workspace.is_deleted == False
            ).all()
            
            logger.info(f"Found {len(workspaces)} workspaces for member")
            mapped_workspaces = []
            for workspace in workspaces:
                try:
                    logger.info(f"Mapping workspace: {workspace}")
                    mapped_workspace = WorkspaceDtoMapper.map_to_workspace_dto_mapper(workspace)
                    mapped_workspaces.append(mapped_workspace)
                except Exception as e:
                    logger.error(f"Error mapping workspace {workspace}: {str(e)}")
                    raise
            
            logger.info(f"Successfully mapped {len(mapped_workspaces)} workspaces for member")
            return mapped_workspaces
        except Exception as e:
            logger.error(f"Error finding workspaces by member: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to find workspaces: {str(e)}")

    def get_workspace(self, workspace_id: str, user_id: str):
        """ Get a single workspace """
        try:
            workspace = self.db.query(Workspace).filter(
                Workspace.workspace_id == workspace_id,
                Workspace.is_deleted == False
            ).first()
            
            if not workspace:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                 detail="Workspace not found")

            if str(workspace.owner_id) != str(user_id):
                is_member = self.db.execute(
                    select(workspace_users)
                    .where(workspace_users.c.workspace_id == workspace.workspace_id)
                    .where(workspace_users.c.user_id == user_id)
                ).first()
                if not is_member:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                     detail="Not authorized to access this workspace")

            return WorkspaceDtoMapper.map_to_workspace_dto_mapper(workspace)
        except HTTPException as he:
            raise he
        except Exception as e:
            logger.error(f"Error getting workspace: {e}")
            raise HTTPException(status_code=500, detail="Failed to get workspace")

    def get_workspace_boards(self, workspace_id: str, user_id: str):
        """ Get all boards in a workspace -- same query BoardHandler.list_boards
        does, exposed here too since workspace_controller.py's GET
        /{workspace_id}/boards route already calls this method name. """
        try:
            self.get_workspace(workspace_id, user_id)  # raises 403/404 if not a member
            from dto.board_dto import BoardDtoMapper
            boards = self.db.query(Board).filter(
                Board.workspace_id == workspace_id,
                Board.is_deleted == False
            ).all()
            return [BoardDtoMapper.map_to_board_dto(board) for board in boards]
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting workspace boards: {e}")
            raise HTTPException(status_code=500, detail="Failed to get workspace boards")

    def add_user_to_workspace(self, workspace_id: str, owner_id: str, user_id: str):
        """ Add a user to a workspace """
        try:
            workspace = self.db.query(Workspace).filter(
                Workspace.workspace_id == workspace_id,
                Workspace.is_deleted == False
            ).first()
            
            if not workspace:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                 detail="Workspace not found")

            if workspace.owner_id != owner_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, 
                                 detail="Not authorized to modify this workspace")

            if user_id not in workspace.users:
                workspace.users.append(user_id)
                workspace.updated_at = datetime.utcnow()
                self.db.commit()
                self.db.refresh(workspace)

            return WorkspaceDtoMapper.map_to_workspace_dto_mapper(workspace)
        except HTTPException as he:
            self.db.rollback()
            raise he
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error adding user to workspace: {e}")
            raise HTTPException(status_code=500, detail="Failed to add user to workspace")

    def remove_user_from_workspace(self, workspace_id: str, owner_id: str, user_id: str):
        """ Remove a user from a workspace """
        try:
            workspace = self.db.query(Workspace).filter(
                Workspace.workspace_id == workspace_id,
                Workspace.is_deleted == False
            ).first()
            
            if not workspace:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                 detail="Workspace not found")

            if str(workspace.owner_id) != str(owner_id):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                 detail="Not authorized to modify this workspace")

            if str(user_id) == str(owner_id):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                 detail="Workspace owner cannot be removed")

            self.db.execute(
                workspace_users.delete()
                .where(workspace_users.c.workspace_id == workspace.workspace_id)
                .where(workspace_users.c.user_id == UUID(user_id))
            )
            workspace.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(workspace)

            return WorkspaceDtoMapper.map_to_workspace_dto_mapper(workspace)
        except HTTPException as he:
            self.db.rollback()
            raise he
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error removing user from workspace: {e}")
            raise HTTPException(status_code=500, detail="Failed to remove user from workspace")

    def get_default_workspace(self, user_id: str):
        """Get the default workspace for a user"""
        logger.info(f"######################## Getting default workspace for user_id: {user_id}")
        try:
            workspace = self.db.query(Workspace).filter(
                Workspace.owner_id == user_id,
                Workspace.is_default == True,
                Workspace.is_deleted == False
            ).first()
            
            logger.info(f"Default workspace: {workspace}")
            if not workspace:
                # If no default workspace is set, get the first workspace
                workspace = self.db.query(Workspace).filter(
                    Workspace.owner_id == user_id,
                    Workspace.is_deleted == False
                ).first()
                
                if workspace:
                    # Set it as default
                    workspace.is_default = True
                    self.db.commit()
                    self.db.refresh(workspace)
            
            return WorkspaceDtoMapper.map_to_workspace_dto_mapper(workspace) if workspace else None
        except Exception as e:
            logger.error(f"Error getting default workspace: {e}")
            raise HTTPException(status_code=500, detail="Failed to get default workspace")

    def set_default_workspace(self, workspace_id: str, user_id: str):
        """Set a workspace as default for a user"""
        try:
            # First, unset any existing default workspace
            self.db.query(Workspace).filter(
                Workspace.owner_id == user_id,
                Workspace.is_default == True
            ).update({"is_default": False})
            
            # Then set the new default workspace
            workspace = self.db.query(Workspace).filter(
                Workspace.workspace_id == workspace_id,
                Workspace.owner_id == user_id,
                Workspace.is_deleted == False
            ).first()
            
            if not workspace:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                 detail="Workspace not found")
            
            workspace.is_default = True
            self.db.commit()
            self.db.refresh(workspace)
            
            return WorkspaceDtoMapper.map_to_workspace_dto_mapper(workspace)
        except HTTPException as he:
            self.db.rollback()
            raise he
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error setting default workspace: {e}")
            raise HTTPException(status_code=500, detail="Failed to set default workspace")

    def get_workspace_members(self, workspace_id: str, user_id: str):
        """Get all members of a workspace"""
        try:
            workspace = self.db.query(Workspace).filter(
                Workspace.workspace_id == workspace_id,
                Workspace.is_deleted == False
            ).first()
            
            if not workspace:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                 detail="Workspace not found")
            # str(...) comparison: owner_id is a UUID object, user_id is a
            # plain string from the JWT -- same bug class already fixed
            # elsewhere in this file. workspace.users doesn't exist as a
            # relationship on the real model; membership is checked against
            # the real workspace_users join table instead, same as
            # remove_user_from_workspace below.
            if str(workspace.owner_id) != str(user_id):
                is_member = self.db.execute(
                    select(workspace_users.c.user_id)
                    .where(
                        workspace_users.c.workspace_id == workspace_id,
                        workspace_users.c.user_id == user_id,
                    )
                ).first()
                if not is_member:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                     detail="Not authorized to access this workspace")

            # Get all members with their roles
            members = self.db.execute(
                select(User, workspace_users.c.role)
                .join(workspace_users, User.user_id == workspace_users.c.user_id)
                .where(workspace_users.c.workspace_id == workspace_id)
            ).all()

            # Workspaces created at signup have no workspace_users row for
            # their owner -- add them, or they can't be assigned work.
            if not any(str(m[0].user_id) == str(workspace.owner_id) for m in members):
                owner = self.db.query(User).filter(User.user_id == workspace.owner_id).first()
                if owner:
                    members = [(owner, "owner"), *members]

            return [
                {
                    "user_id": str(member[0].user_id),
                    "name": f"{member[0].first_name} {member[0].last_name or ''}".strip(),
                    "email": member[0].email,
                    "role": "owner" if str(member[0].user_id) == str(workspace.owner_id) else member[1],
                    # Prefer the user's real avatar_url (set at signup/via
                    # profile upload) -- ui-avatars.com's generated-initials
                    # image is only a fallback for whoever hasn't set one.
                    "avatar": member[0].avatar_url or f"https://ui-avatars.com/api/?name={member[0].first_name}+{member[0].last_name or ''}"
                }
                for member in members
            ]
        except HTTPException as he:
            raise he
        except Exception as e:
            logger.error(f"Error getting workspace members: {e}")
            raise HTTPException(status_code=500, detail="Failed to get workspace members")

    def invite_member_to_workspace(self, command: WorkspaceInviteMemberCommand):
        """Invite a member to a workspace"""
        try:
            # Check if workspace exists and user is owner
            workspace = self.db.query(Workspace).filter(
                Workspace.workspace_id == UUID(command.workspace_id),
                Workspace.owner_id == UUID(command.owner_id)
            ).first()
            
            if not workspace:
                raise HTTPException(
                    status_code=404,
                    detail="Workspace not found or you don't have permission"
                )

            # Check if user exists
            user = self.db.query(User).filter(User.email == command.email).first()
            if not user:
                raise HTTPException(
                    status_code=404,
                    detail="User not found"
                )

            # Check if user is already a member
            existing_member = self.db.query(workspace_users).filter(
                workspace_users.c.workspace_id == UUID(command.workspace_id),
                workspace_users.c.user_id == user.user_id
            ).first()

            if existing_member:
                raise HTTPException(
                    status_code=400,
                    detail="User is already a member of this workspace"
                )

            # Add user to workspace
            stmt = workspace_users.insert().values(
                workspace_id=UUID(command.workspace_id),
                user_id=user.user_id,
                role=command.role
            )
            self.db.execute(stmt)
            self.db.commit()

            return {
                "message": f"Successfully invited {command.email} to the workspace",
                "user_id": str(user.user_id),
                "email": user.email,
                "role": command.role
            }

        except HTTPException as he:
            raise he
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error inviting member to workspace: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to invite member to workspace"
            )

    def update_member_role(self, workspace_id: str, owner_id: str, user_id: str, role: str):
        """Update a member's role in a workspace"""
        try:
            workspace = self.db.query(Workspace).filter(
                Workspace.workspace_id == workspace_id,
                Workspace.is_deleted == False
            ).first()
            
            if not workspace:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                 detail="Workspace not found")

            if str(workspace.owner_id) != str(owner_id):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                 detail="Not authorized to modify this workspace")

            # Check if user is a member
            member = self.db.execute(
                select(workspace_users)
                .where(workspace_users.c.workspace_id == workspace_id)
                .where(workspace_users.c.user_id == user_id)
            ).first()

            if not member:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                 detail="User is not a member of this workspace")

            # Update role
            self.db.execute(
                workspace_users.update()
                .where(workspace_users.c.workspace_id == workspace_id)
                .where(workspace_users.c.user_id == user_id)
                .values(role=role)
            )
            self.db.commit()

            # Get updated member details
            user = self.db.query(User).filter(User.user_id == user_id).first()
            return {
                "user_id": str(user.user_id),
                "name": f"{user.first_name} {user.last_name or ''}".strip(),
                "email": user.email,
                "role": role,
                "avatar": user.avatar_url or f"https://ui-avatars.com/api/?name={user.first_name}+{user.last_name or ''}"
            }
        except HTTPException as he:
            self.db.rollback()
            raise he
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating member role: {e}")
            raise HTTPException(status_code=500, detail="Failed to update member role")
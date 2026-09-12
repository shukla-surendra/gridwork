from typing import List, Dict, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from uuid import UUID


class WorkspaceCreateCommand(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: Optional[bool] = False
    # Optional so a client just sending {name, description} doesn't 422
    # before the controller gets a chance to fill this in from the auth
    # token -- a client-supplied owner_id must never be trusted directly
    # (see controllers/workspace_controller.py's create_workspace).
    owner_id: Optional[str] = None
    members: List[str] = []
    settings: Optional[dict] = None
    properties: Optional[dict] = None


class WorkspaceUpdateCommand(BaseModel):
    # Optional, and in fact never read (the handler uses the workspace_id
    # from the URL path instead -- see update_workspace in
    # controllers/workspace_controller.py) -- this being a *required*
    # field meant every real caller, which only ever sends {name,
    # description, ...}, 422'd before reaching the handler at all.
    workspace_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    members: Optional[List[str]] = None
    settings: Optional[dict] = None
    properties: Optional[dict] = None


class WorkspaceDeleteCommand(BaseModel):
    workspace_id: str
    owner_id: str


class WorkspaceInviteMemberCommand(BaseModel):
    # Both filled in by the controller from the URL path / auth token
    # AFTER Pydantic validation -- Optional so a client that only sends
    # {email, role} (the real shape the frontend actually sends) doesn't
    # 422 before the controller ever gets a chance to fill these in.
    workspace_id: Optional[str] = None
    owner_id: Optional[str] = None
    email: EmailStr
    role: str = "member"





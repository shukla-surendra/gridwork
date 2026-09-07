from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class CompanyBase(BaseModel):
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    size: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class CompanyCreate(CompanyBase):
    workspace_id: UUID


class CompanyUpdate(BaseModel):
    # All optional (unlike CompanyBase) so a partial update -- e.g. just
    # changing the industry -- doesn't 422 for missing the other fields.
    name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    size: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class ContactBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    company_id: Optional[UUID] = None
    job_title: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    social_media: Optional[Dict[str, str]] = None
    tags: Optional[List[str]] = None
    status: str = "active"
    source: Optional[str] = None
    notes: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None


class ContactCreate(ContactBase):
    workspace_id: UUID


class ContactUpdate(BaseModel):
    # All optional (unlike ContactBase, which requires first_name/last_name)
    # so a partial update -- e.g. just linking a company_id -- doesn't 422
    # for missing the name fields.
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    company_id: Optional[UUID] = None
    job_title: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    social_media: Optional[Dict[str, str]] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None


class DealBase(BaseModel):
    title: str
    value: Optional[int] = None
    currency: str = "USD"
    stage: str
    order: Optional[int] = None
    probability: Optional[int] = None
    expected_close_date: Optional[datetime] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    status: str = "active"
    properties: Optional[Dict[str, Any]] = None


class DealCreate(DealBase):
    workspace_id: UUID
    contact_id: UUID


class DealUpdate(BaseModel):
    # All optional (unlike DealBase, which requires title/stage) so a
    # drag-and-drop pipeline move can PUT just {"stage": ..., "order": ...}
    # without resending the whole deal.
    title: Optional[str] = None
    value: Optional[int] = None
    currency: Optional[str] = None
    stage: Optional[str] = None
    order: Optional[int] = None
    probability: Optional[int] = None
    expected_close_date: Optional[datetime] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None


class ContactActivityBase(BaseModel):
    type: str
    title: str
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: str = "pending"
    properties: Optional[Dict[str, Any]] = None


class ContactActivityCreate(ContactActivityBase):
    workspace_id: UUID
    contact_id: UUID
    user_id: UUID


class ContactActivityUpdate(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None


class DealActivityBase(BaseModel):
    type: str
    title: str
    description: Optional[str] = None
    old_stage: Optional[str] = None
    new_stage: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None


class DealActivityCreate(DealActivityBase):
    workspace_id: UUID
    deal_id: UUID
    user_id: UUID


class DealActivityUpdate(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    old_stage: Optional[str] = None
    new_stage: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None

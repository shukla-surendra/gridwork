from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from .commands import CompanyBase, ContactBase, DealBase, ContactActivityBase, DealActivityBase, LeadBase


class CompanyResponse(CompanyBase):
    company_id: UUID
    workspace_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ContactResponse(ContactBase):
    contact_id: UUID
    workspace_id: UUID
    company_ref: Optional[CompanyResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DealResponse(DealBase):
    deal_id: UUID
    workspace_id: UUID
    contact_id: UUID
    contact: Optional[ContactResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ContactActivityResponse(ContactActivityBase):
    activity_id: UUID
    workspace_id: UUID
    contact_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DealActivityResponse(DealActivityBase):
    activity_id: UUID
    workspace_id: UUID
    deal_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeadResponse(LeadBase):
    lead_id: UUID
    workspace_id: UUID
    converted_at: Optional[datetime] = None
    converted_contact_id: Optional[UUID] = None
    converted_company_id: Optional[UUID] = None
    converted_deal_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeadActivityResponse(BaseModel):
    activity_id: UUID
    workspace_id: UUID
    lead_id: UUID
    user_id: UUID
    type: str
    title: str
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: str
    properties: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeadConversionResult(BaseModel):
    """What CRMHandler.convert_lead actually created -- company/deal are
    only present if the conversion request asked for them (see
    LeadConvertCommand)."""
    lead: LeadResponse
    contact: ContactResponse
    company: Optional[CompanyResponse] = None
    deal: Optional[DealResponse] = None

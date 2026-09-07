from typing import Optional
from datetime import datetime
from uuid import UUID
from .commands import CompanyBase, ContactBase, DealBase, ContactActivityBase, DealActivityBase


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

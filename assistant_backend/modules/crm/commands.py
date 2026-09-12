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
    # Optional -- the controller always overwrites this from the URL path
    # (see create_company in controller.py), never trusting whatever a
    # client sends here. A member of workspace A must not be able to
    # write into workspace B just by naming its ID in the body.
    workspace_id: Optional[UUID] = None


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
    # Optional and controller-assigned from the URL path, same reasoning
    # as CompanyCreate.workspace_id above. This was previously required
    # with no default and the controller never filled it in -- since the
    # real frontend (contactsSlice.js's addContact) never sends it either,
    # every "Create Contact" in the app was 422ing outright.
    workspace_id: Optional[UUID] = None


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
    # Soft reference to modules.billing.models.Quote.quote_id -- no FK
    # constraint, deliberately: Billing is a separate, independently
    # toggleable module, and CRM must keep working standalone whether or
    # not it's enabled. Resolved by the frontend (GET
    # /billing/quotes/{id}) when it wants to show quote status on a deal,
    # never joined here.
    quote_id: Optional[UUID] = None


class DealCreate(DealBase):
    # Optional and controller-assigned from the URL path, same reasoning
    # as ContactCreate.workspace_id above -- this was required with no
    # default and the frontend (dealsSlice.js's addDeal) never sends it,
    # so every "Create Deal" was 422ing outright.
    workspace_id: Optional[UUID] = None
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
    quote_id: Optional[UUID] = None


class ContactActivityBase(BaseModel):
    type: str
    title: str
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: str = "pending"
    properties: Optional[Dict[str, Any]] = None


class ContactActivityCreate(ContactActivityBase):
    # All three set by the controller (path + auth token), not trusted
    # from the client -- same reasoning as ContactCreate.workspace_id.
    workspace_id: Optional[UUID] = None
    contact_id: Optional[UUID] = None
    user_id: Optional[UUID] = None


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
    # All three set by the controller (path + auth token), not trusted
    # from the client -- same reasoning as ContactActivityCreate above.
    workspace_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    user_id: Optional[UUID] = None


class DealActivityUpdate(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    old_stage: Optional[str] = None
    new_stage: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None


# -- Leads --------------------------------------------------------------
#
# The pre-qualification stage Zoho/Odoo both put ahead of Contacts/Deals --
# a Lead isn't a real Contact yet, and "Convert" is the one action that
# turns it into one (see LeadConvertCommand and CRMHandler.convert_lead).

class LeadBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    source: Optional[str] = None
    status: str = "new"  # new | contacted | qualified | unqualified | converted
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    properties: Optional[Dict[str, Any]] = None


class LeadCreate(LeadBase):
    # Optional and controller-assigned from the URL path, same reasoning
    # as ContactCreate.workspace_id.
    workspace_id: Optional[UUID] = None


class LeadUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    properties: Optional[Dict[str, Any]] = None


class LeadConvertCommand(BaseModel):
    """What to create alongside the Contact that conversion always makes.
    Mirrors Zoho's "Convert Lead" dialog: Company and Deal are each
    optional, and an existing Company can be linked instead of minting a
    new one (e.g. a second lead from a company already in the CRM)."""
    create_company: bool = True  # only applies if lead.company_name is set and company_id isn't given
    company_id: Optional[UUID] = None  # link to an existing company instead of creating one
    create_deal: bool = True
    deal_title: Optional[str] = None  # defaults to "<Lead name> Deal" in the handler
    deal_value: Optional[int] = None
    deal_currency: str = "USD"
    deal_stage: str = "new"


class LeadActivityCreate(BaseModel):
    type: str
    title: str
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: str = "pending"
    properties: Optional[Dict[str, Any]] = None
    # All three set by the controller (path + auth token), not trusted
    # from the client -- same reasoning as ContactActivityCreate.
    workspace_id: Optional[UUID] = None
    lead_id: Optional[UUID] = None
    user_id: Optional[UUID] = None


class LeadActivityUpdate(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None

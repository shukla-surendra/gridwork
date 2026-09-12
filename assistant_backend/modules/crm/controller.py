from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from modules.access import require_module_enabled
from .handlers import CRMHandler
from .commands import (
    CompanyCreate, CompanyUpdate,
    ContactCreate, ContactUpdate, DealCreate, DealUpdate,
    ContactActivityCreate, ContactActivityUpdate,
    DealActivityCreate, DealActivityUpdate,
    LeadCreate, LeadUpdate, LeadConvertCommand,
    LeadActivityCreate, LeadActivityUpdate,
)
from .dto import (
    CompanyResponse, ContactResponse, DealResponse,
    ContactActivityResponse, DealActivityResponse,
    LeadResponse, LeadActivityResponse, LeadConversionResult,
)

MODULE_KEY = "crm"

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/crm", tags=["crm"])

# Already a live, always-on feature before the module registry existed --
# default_enabled=True so no existing workspace loses it silently.
gate = require_module_enabled(MODULE_KEY, default_enabled=True)

# Company routes
@router.post("/companies", response_model=CompanyResponse)
def create_company(workspace_id: str, company: CompanyCreate, user: dict = Depends(gate)):
    # Always the path's workspace_id, never whatever the body claims --
    # see CompanyCreate.workspace_id in commands.py for why.
    company.workspace_id = workspace_id
    handler = CRMHandler()
    return handler.create_company(company)

@router.get("/companies", response_model=List[CompanyResponse])
def get_workspace_companies(workspace_id: str, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.get_workspace_companies(workspace_id)

@router.get("/companies/{company_id}", response_model=CompanyResponse)
def get_company(workspace_id: str, company_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.get_company(company_id)

@router.get("/companies/{company_id}/contacts", response_model=List[ContactResponse])
def get_company_contacts(workspace_id: str, company_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.get_company_contacts(company_id)

@router.put("/companies/{company_id}", response_model=CompanyResponse)
def update_company(workspace_id: str, company_id: UUID, company: CompanyUpdate, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.update_company(company_id, company)

@router.delete("/companies/{company_id}")
def delete_company(workspace_id: str, company_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.delete_company(company_id)

# Contact routes
@router.post("/contacts", response_model=ContactResponse)
def create_contact(workspace_id: str, contact: ContactCreate, user: dict = Depends(gate)):
    # Always the path's workspace_id -- this used to be a required field
    # the client never sent (contactsSlice.js's addContact), 422ing every
    # real "Create Contact"; see ContactCreate.workspace_id in commands.py.
    contact.workspace_id = workspace_id
    handler = CRMHandler()
    return handler.create_contact(contact)

@router.get("/contacts/{contact_id}", response_model=ContactResponse)
def get_contact(workspace_id: str, contact_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.get_contact(contact_id)

@router.get("/contacts", response_model=List[ContactResponse])
def get_workspace_contacts(workspace_id: str, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.get_workspace_contacts(workspace_id)

@router.put("/contacts/{contact_id}", response_model=ContactResponse)
def update_contact(workspace_id: str, contact_id: UUID, contact: ContactUpdate, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.update_contact(contact_id, contact)

@router.delete("/contacts/{contact_id}")
def delete_contact(workspace_id: str,contact_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.delete_contact(contact_id)

# Deal routes
@router.post("/deals", response_model=DealResponse)
def create_deal(workspace_id: str, deal: DealCreate, user: dict = Depends(gate)):
    # Always the path's workspace_id -- this used to be a required field
    # the client never sent (dealsSlice.js's addDeal), 422ing every real
    # "Create Deal"; see DealCreate.workspace_id in commands.py.
    deal.workspace_id = workspace_id
    handler = CRMHandler()
    return handler.create_deal(deal)

@router.get("/deals/{deal_id}", response_model=DealResponse)
def get_deal(workspace_id: str, deal_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.get_deal(deal_id)

@router.get("/deals", response_model=List[DealResponse])
def get_workspace_deals(workspace_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.get_workspace_deals(workspace_id)

@router.get("/contacts/{contact_id}/deals", response_model=List[DealResponse])
def get_contact_deals(workspace_id: str, contact_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.get_contact_deals(contact_id)

@router.put("/deals/{deal_id}", response_model=DealResponse)
def update_deal(workspace_id: str, deal_id: UUID, deal: DealUpdate, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.update_deal(deal_id, deal)

@router.delete("/deals/{deal_id}")
def delete_deal(workspace_id: str, deal_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.delete_deal(deal_id)

# Activity routes
@router.post("/contacts/{contact_id}/activities", response_model=ContactActivityResponse)
def create_contact_activity(
    workspace_id: str,
    contact_id: UUID,
    activity: ContactActivityCreate,
    user: dict = Depends(gate)
):
    handler = CRMHandler()
    activity.workspace_id = workspace_id
    activity.contact_id = contact_id
    activity.user_id = user.get("user_id")
    return handler.create_contact_activity(activity)

@router.get("/contacts/{contact_id}/activities", response_model=List[ContactActivityResponse])
def get_contact_activities(workspace_id: str, contact_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.get_contact_activities(contact_id)

@router.put("/contacts/{contact_id}/activities/{activity_id}", response_model=ContactActivityResponse)
def update_contact_activity(
    workspace_id: str, contact_id: UUID, activity_id: UUID,
    activity: ContactActivityUpdate, user: dict = Depends(gate)
):
    handler = CRMHandler()
    return handler.update_contact_activity(activity_id, activity)

@router.delete("/contacts/{contact_id}/activities/{activity_id}")
def delete_contact_activity(workspace_id: str, contact_id: UUID, activity_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.delete_contact_activity(activity_id)

@router.post("/deals/{deal_id}/activities", response_model=DealActivityResponse)
def create_deal_activity(
    workspace_id: str,
    deal_id: UUID,
    activity: DealActivityCreate,
    user: dict = Depends(gate)
):
    handler = CRMHandler()
    activity.workspace_id = workspace_id
    activity.deal_id = deal_id
    activity.user_id = user.get("user_id")
    return handler.create_deal_activity(activity)

@router.get("/deals/{deal_id}/activities", response_model=List[DealActivityResponse])
def get_deal_activities(workspace_id: str, deal_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.get_deal_activities(deal_id)

@router.put("/deals/{deal_id}/activities/{activity_id}", response_model=DealActivityResponse)
def update_deal_activity(
    workspace_id: str, deal_id: UUID, activity_id: UUID,
    activity: DealActivityUpdate, user: dict = Depends(gate)
):
    handler = CRMHandler()
    return handler.update_deal_activity(activity_id, activity)

@router.delete("/deals/{deal_id}/activities/{activity_id}")
def delete_deal_activity(workspace_id: str, deal_id: UUID, activity_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.delete_deal_activity(activity_id)

# Lead routes
@router.post("/leads", response_model=LeadResponse)
def create_lead(workspace_id: str, lead: LeadCreate, user: dict = Depends(gate)):
    lead.workspace_id = workspace_id
    handler = CRMHandler()
    return handler.create_lead(lead)

@router.get("/leads", response_model=List[LeadResponse])
def get_workspace_leads(workspace_id: str, status_filter: Optional[str] = None, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.get_workspace_leads(workspace_id, status_filter)

@router.get("/leads/{lead_id}", response_model=LeadResponse)
def get_lead(workspace_id: str, lead_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.get_lead(lead_id, workspace_id)

@router.put("/leads/{lead_id}", response_model=LeadResponse)
def update_lead(workspace_id: str, lead_id: UUID, lead: LeadUpdate, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.update_lead(lead_id, workspace_id, lead)

@router.delete("/leads/{lead_id}")
def delete_lead(workspace_id: str, lead_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.delete_lead(lead_id, workspace_id)

@router.post("/leads/{lead_id}/convert", response_model=LeadConversionResult)
def convert_lead(workspace_id: str, lead_id: UUID, command: LeadConvertCommand, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.convert_lead(lead_id, workspace_id, command)

# Lead activity routes
@router.post("/leads/{lead_id}/activities", response_model=LeadActivityResponse)
def create_lead_activity(
    workspace_id: str,
    lead_id: UUID,
    activity: LeadActivityCreate,
    user: dict = Depends(gate)
):
    handler = CRMHandler()
    activity.workspace_id = workspace_id
    activity.lead_id = lead_id
    activity.user_id = user.get("user_id")
    return handler.create_lead_activity(activity)

@router.get("/leads/{lead_id}/activities", response_model=List[LeadActivityResponse])
def get_lead_activities(workspace_id: str, lead_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.get_lead_activities(lead_id)

@router.put("/leads/{lead_id}/activities/{activity_id}", response_model=LeadActivityResponse)
def update_lead_activity(
    workspace_id: str, lead_id: UUID, activity_id: UUID,
    activity: LeadActivityUpdate, user: dict = Depends(gate)
):
    handler = CRMHandler()
    return handler.update_lead_activity(activity_id, activity)

@router.delete("/leads/{lead_id}/activities/{activity_id}")
def delete_lead_activity(workspace_id: str, lead_id: UUID, activity_id: UUID, user: dict = Depends(gate)):
    handler = CRMHandler()
    return handler.delete_lead_activity(activity_id)

crm_router = router

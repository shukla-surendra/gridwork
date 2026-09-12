import datetime
from adapters.orm.models.database import SessionLocal
from fastapi import HTTPException
from typing import List
from uuid import UUID
import logging

from .models import Company, Contact, Deal, ContactActivity, DealActivity, Lead, LeadActivity
from .commands import (
    CompanyCreate, CompanyUpdate,
    ContactCreate, ContactUpdate, DealCreate, DealUpdate,
    ContactActivityCreate, DealActivityCreate,
    ContactActivityUpdate, DealActivityUpdate,
    LeadCreate, LeadUpdate, LeadConvertCommand,
    LeadActivityCreate, LeadActivityUpdate,
)
from sqlalchemy.orm import joinedload

LEAD_STATUSES = ("new", "contacted", "qualified", "unqualified", "converted")

logger = logging.getLogger(__name__)

class CRMHandler:
    def __init__(self):
        self.db = SessionLocal()

    # Company methods
    def create_company(self, company: CompanyCreate) -> Company:
        try:
            db_company = Company(**company.model_dump())
            self.db.add(db_company)
            self.db.commit()
            self.db.refresh(db_company)
            return db_company
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating company: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create company")

    def get_company(self, company_id: UUID) -> Company:
        company = self.db.query(Company).filter(
            Company.company_id == company_id,
            Company.is_deleted == False
        ).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        return company

    def get_workspace_companies(self, workspace_id: UUID) -> List[Company]:
        return self.db.query(Company).filter(
            Company.workspace_id == workspace_id,
            Company.is_deleted == False
        ).order_by(Company.name.asc()).all()

    def get_company_contacts(self, company_id: UUID) -> List[Contact]:
        return self.db.query(Contact).options(joinedload(Contact.company_ref)).filter(
            Contact.company_id == company_id,
            Contact.is_deleted == False
        ).all()

    def update_company(self, company_id: UUID, company: CompanyUpdate) -> Company:
        db_company = self.get_company(company_id)
        try:
            for key, value in company.model_dump(exclude_unset=True).items():
                setattr(db_company, key, value)
            self.db.commit()
            self.db.refresh(db_company)
            return db_company
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating company: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update company")

    def delete_company(self, company_id: UUID) -> bool:
        db_company = self.get_company(company_id)
        try:
            db_company.is_deleted = True
            # Unlink rather than cascade-delete -- a company going away
            # shouldn't take its contacts with it, same reasoning as
            # epic/task unlinking elsewhere in this app.
            self.db.query(Contact).filter(Contact.company_id == company_id).update({"company_id": None})
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting company: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete company")

    # Contact methods
    def create_contact(self, contact: ContactCreate) -> Contact:
        try:
            db_contact = Contact(**contact.model_dump())
            self.db.add(db_contact)
            self.db.commit()
            self.db.refresh(db_contact)
            _ = db_contact.company_ref  # force lazy load while self.db is still open (see create_deal for why)
            return db_contact
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating contact: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create contact")

    def get_contact(self, contact_id: UUID) -> Contact:
        contact = self.db.query(Contact).options(joinedload(Contact.company_ref)).filter(
            Contact.contact_id == contact_id,
            Contact.is_deleted == False
        ).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        return contact

    def get_workspace_contacts(self, workspace_id: UUID) -> List[Contact]:
        return self.db.query(Contact).options(joinedload(Contact.company_ref)).filter(
            Contact.workspace_id == workspace_id,
            Contact.is_deleted == False
        ).all()

    def update_contact(self, contact_id: UUID, contact: ContactUpdate) -> Contact:
        db_contact = self.get_contact(contact_id)
        try:
            for key, value in contact.model_dump(exclude_unset=True).items():
                setattr(db_contact, key, value)
            self.db.commit()
            self.db.refresh(db_contact)
            _ = db_contact.company_ref  # re-resolve in case company_id just changed
            return db_contact
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating contact: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update contact")

    def delete_contact(self, contact_id: UUID) -> bool:
        db_contact = self.get_contact(contact_id)
        try:
            db_contact.is_deleted = True
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting contact: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete contact")

    # Deal methods
    def create_deal(self, deal: DealCreate) -> Deal:
        try:
            db_deal = Deal(**deal.model_dump())
            self.db.add(db_deal)
            self.db.commit()
            self.db.refresh(db_deal)
            _ = db_deal.contact.company_ref  # force both levels of lazy load now, while
            # self.db is still open -- DealResponse.contact is a ContactResponse, which
            # itself has a company_ref field, so both Deal.contact AND
            # Contact.company_ref need loading, not just the first hop. self.db closes
            # in __del__ whenever this handler gets garbage collected, which can happen
            # before FastAPI serializes the response (non-deterministic timing ->
            # DetachedInstanceError under load -- this exact gap, missing only the
            # second hop, was reproducible via pytest tests/test_crm.py).
            return db_deal
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating deal: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create deal")

    def get_deal(self, deal_id: UUID) -> Deal:
        deal = self.db.query(Deal).options(
            joinedload(Deal.contact).joinedload(Contact.company_ref)
        ).filter(
            Deal.deal_id == deal_id,
            Deal.is_deleted == False
        ).first()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        return deal

    def get_workspace_deals(self, workspace_id: UUID) -> List[Deal]:
        return self.db.query(Deal).options(
            joinedload(Deal.contact).joinedload(Contact.company_ref)
        ).filter(
            Deal.workspace_id == workspace_id,
            Deal.is_deleted == False
        ).all()

    def get_contact_deals(self, contact_id: UUID) -> List[Deal]:
        return self.db.query(Deal).options(
            joinedload(Deal.contact).joinedload(Contact.company_ref)
        ).filter(
            Deal.contact_id == contact_id,
            Deal.is_deleted == False
        ).all()

    def update_deal(self, deal_id: UUID, deal: DealUpdate) -> Deal:
        db_deal = self.get_deal(deal_id)
        try:
            for key, value in deal.model_dump(exclude_unset=True).items():
                setattr(db_deal, key, value)
            self.db.commit()
            self.db.refresh(db_deal)
            # get_deal()'s joinedload chain loaded this before commit(), but
            # expire_on_commit=True (the session default) marks it stale on
            # every commit -- re-force it now, same reasoning as create_deal.
            _ = db_deal.contact.company_ref
            return db_deal
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating deal: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update deal")

    def delete_deal(self, deal_id: UUID) -> bool:
        db_deal = self.get_deal(deal_id)
        try:
            db_deal.is_deleted = True
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting deal: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete deal")

    # Activity methods
    def create_contact_activity(self, activity: ContactActivityCreate) -> ContactActivity:
        try:
            db_activity = ContactActivity(**activity.model_dump())
            self.db.add(db_activity)
            self.db.commit()
            self.db.refresh(db_activity)
            return db_activity
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating contact activity: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create contact activity")

    def get_contact_activities(self, contact_id: UUID) -> List[ContactActivity]:
        return self.db.query(ContactActivity).filter(
            ContactActivity.contact_id == contact_id,
            ContactActivity.is_deleted == False
        ).order_by(ContactActivity.created_at.desc()).all()

    def get_contact_activity(self, activity_id: UUID) -> ContactActivity:
        activity = self.db.query(ContactActivity).filter(
            ContactActivity.activity_id == activity_id,
            ContactActivity.is_deleted == False
        ).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        return activity

    def update_contact_activity(self, activity_id: UUID, activity: ContactActivityUpdate) -> ContactActivity:
        db_activity = self.get_contact_activity(activity_id)
        try:
            for key, value in activity.model_dump(exclude_unset=True).items():
                setattr(db_activity, key, value)
            self.db.commit()
            self.db.refresh(db_activity)
            return db_activity
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating contact activity: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update contact activity")

    def delete_contact_activity(self, activity_id: UUID) -> bool:
        db_activity = self.get_contact_activity(activity_id)
        try:
            db_activity.is_deleted = True
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting contact activity: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete contact activity")

    def create_deal_activity(self, activity: DealActivityCreate) -> DealActivity:
        try:
            db_activity = DealActivity(**activity.model_dump())
            self.db.add(db_activity)
            self.db.commit()
            self.db.refresh(db_activity)
            return db_activity
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating deal activity: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create deal activity")

    def get_deal_activities(self, deal_id: UUID) -> List[DealActivity]:
        # No is_deleted filter here -- DealActivity has no such column
        # (unlike ContactActivity); this used to reference one anyway and
        # threw AttributeError on every single call, 500ing this endpoint
        # unconditionally.
        return self.db.query(DealActivity).filter(
            DealActivity.deal_id == deal_id
        ).order_by(DealActivity.created_at.desc()).all()

    def get_deal_activity(self, activity_id: UUID) -> DealActivity:
        # DealActivity has no is_deleted column (unlike ContactActivity) --
        # deletes below are hard deletes, so a plain existence check is enough.
        activity = self.db.query(DealActivity).filter(
            DealActivity.activity_id == activity_id
        ).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        return activity

    def update_deal_activity(self, activity_id: UUID, activity: DealActivityUpdate) -> DealActivity:
        db_activity = self.get_deal_activity(activity_id)
        try:
            for key, value in activity.model_dump(exclude_unset=True).items():
                setattr(db_activity, key, value)
            self.db.commit()
            self.db.refresh(db_activity)
            return db_activity
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating deal activity: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update deal activity")

    def delete_deal_activity(self, activity_id: UUID) -> bool:
        db_activity = self.get_deal_activity(activity_id)
        try:
            self.db.delete(db_activity)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting deal activity: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete deal activity")

    # -- Leads ----------------------------------------------------------------

    def create_lead(self, lead: LeadCreate) -> Lead:
        try:
            db_lead = Lead(**lead.model_dump())
            self.db.add(db_lead)
            self.db.commit()
            self.db.refresh(db_lead)
            return db_lead
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating lead: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create lead")

    def get_lead(self, lead_id: UUID, workspace_id: UUID) -> Lead:
        lead = self.db.query(Lead).filter(
            Lead.lead_id == lead_id,
            Lead.workspace_id == workspace_id,
            Lead.is_deleted == False
        ).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        return lead

    def get_workspace_leads(self, workspace_id: UUID, status_filter: str = None) -> List[Lead]:
        query = self.db.query(Lead).filter(
            Lead.workspace_id == workspace_id,
            Lead.is_deleted == False
        )
        if status_filter:
            query = query.filter(Lead.status == status_filter)
        return query.order_by(Lead.created_at.desc()).all()

    def update_lead(self, lead_id: UUID, workspace_id: UUID, lead: LeadUpdate) -> Lead:
        db_lead = self.get_lead(lead_id, workspace_id)
        if db_lead.status == "converted":
            raise HTTPException(status_code=400, detail="A converted lead can't be edited")
        try:
            for key, value in lead.model_dump(exclude_unset=True).items():
                setattr(db_lead, key, value)
            self.db.commit()
            self.db.refresh(db_lead)
            return db_lead
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating lead: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update lead")

    def delete_lead(self, lead_id: UUID, workspace_id: UUID) -> bool:
        db_lead = self.get_lead(lead_id, workspace_id)
        try:
            db_lead.is_deleted = True
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting lead: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete lead")

    def convert_lead(self, lead_id: UUID, workspace_id: UUID, command: LeadConvertCommand) -> dict:
        """The one action that turns a Lead into the real thing: always a
        Contact, optionally a Company (new or an existing one to link)
        and a Deal. Everything happens in one transaction -- either the
        whole conversion lands, or none of it does; a lead half-converted
        by a mid-way failure would be worse than the 500 this raises
        instead."""
        db_lead = self.get_lead(lead_id, workspace_id)
        if db_lead.status == "converted":
            raise HTTPException(status_code=400, detail="Lead is already converted")
        try:
            company = None
            company_id = None
            if command.company_id:
                company = self.db.query(Company).filter(
                    Company.company_id == command.company_id,
                    Company.workspace_id == workspace_id,
                    Company.is_deleted == False
                ).first()
                if not company:
                    raise HTTPException(status_code=404, detail="Company not found")
                company_id = company.company_id
            elif command.create_company and db_lead.company_name:
                company = Company(workspace_id=workspace_id, name=db_lead.company_name)
                self.db.add(company)
                self.db.flush()  # assign company.company_id without committing yet
                company_id = company.company_id

            contact = Contact(
                workspace_id=workspace_id,
                first_name=db_lead.first_name,
                last_name=db_lead.last_name,
                email=db_lead.email,
                phone=db_lead.phone,
                company=db_lead.company_name,
                company_id=company_id,
                job_title=db_lead.job_title,
                source=db_lead.source or "lead_conversion",
                notes=db_lead.notes,
            )
            self.db.add(contact)
            self.db.flush()

            deal = None
            if command.create_deal:
                deal = Deal(
                    workspace_id=workspace_id,
                    contact_id=contact.contact_id,
                    title=command.deal_title or f"{db_lead.first_name} {db_lead.last_name} Deal",
                    value=command.deal_value,
                    currency=command.deal_currency,
                    stage=command.deal_stage,
                    status="active",
                )
                self.db.add(deal)
                self.db.flush()

            db_lead.status = "converted"
            db_lead.converted_at = datetime.datetime.now(datetime.UTC)
            db_lead.converted_contact_id = contact.contact_id
            db_lead.converted_company_id = company_id
            db_lead.converted_deal_id = deal.deal_id if deal else None

            self.db.commit()
            self.db.refresh(db_lead)
            self.db.refresh(contact)
            if company:
                self.db.refresh(company)
            if deal:
                self.db.refresh(deal)
            # Force these while self.db is still open -- ContactResponse
            # has a company_ref field and DealResponse a contact field
            # (itself carrying company_ref), same lazy-load-after-close
            # trap create_deal's comment above explains in full.
            _ = contact.company_ref
            if deal:
                _ = deal.contact.company_ref
            return {"lead": db_lead, "contact": contact, "company": company, "deal": deal}
        except HTTPException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error converting lead: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to convert lead")

    # -- Lead activities ----------------------------------------------------

    def create_lead_activity(self, activity: LeadActivityCreate) -> LeadActivity:
        try:
            db_activity = LeadActivity(**activity.model_dump())
            self.db.add(db_activity)
            self.db.commit()
            self.db.refresh(db_activity)
            return db_activity
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating lead activity: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create lead activity")

    def get_lead_activities(self, lead_id: UUID) -> List[LeadActivity]:
        return self.db.query(LeadActivity).filter(
            LeadActivity.lead_id == lead_id,
            LeadActivity.is_deleted == False
        ).order_by(LeadActivity.created_at.desc()).all()

    def get_lead_activity(self, activity_id: UUID) -> LeadActivity:
        activity = self.db.query(LeadActivity).filter(
            LeadActivity.activity_id == activity_id,
            LeadActivity.is_deleted == False
        ).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        return activity

    def update_lead_activity(self, activity_id: UUID, activity: LeadActivityUpdate) -> LeadActivity:
        db_activity = self.get_lead_activity(activity_id)
        try:
            for key, value in activity.model_dump(exclude_unset=True).items():
                setattr(db_activity, key, value)
            self.db.commit()
            self.db.refresh(db_activity)
            return db_activity
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating lead activity: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update lead activity")

    def delete_lead_activity(self, activity_id: UUID) -> bool:
        db_activity = self.get_lead_activity(activity_id)
        try:
            db_activity.is_deleted = True
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting lead activity: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete lead activity")

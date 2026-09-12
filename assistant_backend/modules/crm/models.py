import datetime
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from adapters.orm.models.base import Base


class Company(Base):
    """An account/organization a Contact belongs to. Kept separate from
    Contact.company (a free-text string, left in place for rows created
    before this existed) so a company can be looked up, edited, and rolled
    up to (all contacts + deals for one account) without depending on
    exact string matches."""
    __tablename__ = "companies"

    company_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    name = Column(String, nullable=False)
    industry = Column(String, nullable=True)
    website = Column(String, nullable=True)
    size = Column(String, nullable=True)  # e.g. "1-10", "11-50", "51-200"
    phone = Column(String, nullable=True)
    address = Column(JSONB, nullable=True)
    description = Column(Text, nullable=True)
    tags = Column(JSONB, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    workspace = relationship("Workspace")
    contacts = relationship("Contact", back_populates="company_ref")


class Contact(Base):
    __tablename__ = "contacts"

    contact_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.company_id", ondelete="SET NULL"), nullable=True)
    job_title = Column(String, nullable=True)
    address = Column(JSONB, nullable=True)
    social_media = Column(JSONB, nullable=True)
    tags = Column(JSONB, nullable=True)
    status = Column(String, nullable=False, default="active")
    source = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    properties = Column(JSONB, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    workspace = relationship("Workspace", back_populates="contacts")
    deals = relationship("Deal", back_populates="contact")
    activities = relationship("ContactActivity", back_populates="contact")
    company_ref = relationship("Company", back_populates="contacts")


class Deal(Base):
    __tablename__ = "deals"

    deal_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.contact_id"), nullable=False)
    title = Column(String, nullable=False)
    value = Column(Integer, nullable=True)
    currency = Column(String, nullable=True, default="USD")
    stage = Column(String, nullable=False)
    order = Column(Integer, nullable=True)  # position within its stage column on the pipeline board
    probability = Column(Integer, nullable=True)
    expected_close_date = Column(DateTime, nullable=True)
    description = Column(Text, nullable=True)
    tags = Column(JSONB, nullable=True)
    status = Column(String, nullable=False, default="active")
    properties = Column(JSONB, nullable=True)
    # Soft reference to modules.billing.models.Quote.quote_id -- no FK
    # constraint on purpose. See DealBase.quote_id in commands.py for why.
    quote_id = Column(UUID(as_uuid=True), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    workspace = relationship("Workspace", back_populates="deals")
    contact = relationship("Contact", back_populates="deals")
    activities = relationship("DealActivity", back_populates="deal")


class ContactActivity(Base):
    __tablename__ = "contact_activities"

    activity_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.contact_id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    type = Column(String, nullable=False)  # email, call, meeting, note
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=False, default="pending")
    properties = Column(JSONB, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    workspace = relationship("Workspace", back_populates="contact_activities")
    contact = relationship("Contact", back_populates="activities")
    user = relationship("User")


class DealActivity(Base):
    __tablename__ = "deal_activities"

    activity_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.deal_id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    type = Column(String, nullable=False)  # stage_change, note, task
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    old_stage = Column(String, nullable=True)
    new_stage = Column(String, nullable=True)
    properties = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    workspace = relationship("Workspace", back_populates="deal_activities")
    deal = relationship("Deal", back_populates="activities")
    user = relationship("User")


class Lead(Base):
    """Pre-qualification stage ahead of Contact/Deal -- the Zoho/Odoo
    funnel this app didn't have at all until now. A Lead becomes a real
    Contact (and optionally a Company + Deal) only through
    CRMHandler.convert_lead, never by editing it into one; the
    converted_*_id columns record what conversion actually created, for
    an audit trail back from the lead."""
    __tablename__ = "leads"

    lead_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    source = Column(String, nullable=True)
    status = Column(String, nullable=False, default="new")  # new | contacted | qualified | unqualified | converted
    notes = Column(Text, nullable=True)
    tags = Column(JSONB, nullable=True)
    properties = Column(JSONB, nullable=True)
    converted_at = Column(DateTime, nullable=True)
    converted_contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.contact_id"), nullable=True)
    converted_company_id = Column(UUID(as_uuid=True), ForeignKey("companies.company_id"), nullable=True)
    converted_deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.deal_id"), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    workspace = relationship("Workspace")


class LeadActivity(Base):
    __tablename__ = "lead_activities"

    activity_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id"), nullable=False)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.lead_id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    type = Column(String, nullable=False)  # email, call, meeting, note
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=False, default="pending")
    properties = Column(JSONB, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    lead = relationship("Lead")
    user = relationship("User")

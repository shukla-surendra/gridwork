import datetime
import uuid
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Boolean, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from adapters.orm.models.base import Base


class Employee(Base):
    __tablename__ = "hr_employees"

    employee_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    job_title = Column(String, nullable=True)
    department = Column(String, nullable=True)
    employment_type = Column(String, nullable=False, default="full_time")  # full_time | part_time | contractor | intern
    status = Column(String, nullable=False, default="active")  # active | on_leave | terminated
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    # Org chart -- ON DELETE SET NULL so a removed manager promotes their
    # direct reports rather than orphaning the FK; delete_employee() also
    # does this explicitly for the soft-delete path, where the real FK
    # action never fires (see Page.parent_page_id for the same reasoning).
    manager_id = Column(UUID(as_uuid=True), ForeignKey("hr_employees.employee_id", ondelete="SET NULL"), nullable=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    # Annual allocation per leave type, e.g. {"vacation": 20, "sick": 10} --
    # "used" is always computed on demand from approved LeaveRequests
    # rather than stored, so it can never drift out of sync with history.
    leave_allocations = Column(JSONB, nullable=True)
    # Assigned onboarding checklist -- [{"id","text","done"}, ...], the same
    # JSONB-list-of-items shape Task.checklist already uses.
    onboarding_checklist = Column(JSONB, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.UTC), onupdate=lambda: datetime.datetime.now(datetime.UTC))

    user = relationship("User", foreign_keys=[user_id])
    manager = relationship("Employee", remote_side=[employee_id], backref="direct_reports")


class LeaveRequest(Base):
    __tablename__ = "hr_leave_requests"

    leave_request_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("hr_employees.employee_id", ondelete="CASCADE"), nullable=False)
    leave_type = Column(String, nullable=False)  # vacation | sick | personal | unpaid | other
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    days = Column(Integer, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pending")  # pending | approved | rejected | cancelled
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("hr_employees.employee_id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.UTC), onupdate=lambda: datetime.datetime.now(datetime.UTC))

    employee = relationship("Employee", foreign_keys=[employee_id])
    reviewer = relationship("Employee", foreign_keys=[reviewed_by])


class OnboardingTemplate(Base):
    __tablename__ = "hr_onboarding_templates"

    template_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    items = Column(JSONB, nullable=True)  # ["Set up laptop", "Sign NDA", ...]
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.UTC), onupdate=lambda: datetime.datetime.now(datetime.UTC))

import datetime
import uuid
from sqlalchemy import Column, String, Numeric, Date, Time, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from adapters.orm.models.base import Base


class Seat(Base):
    __tablename__ = "lib_seats"

    seat_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    seat_number = Column(String, nullable=False)
    section = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)  # false = under maintenance / decommissioned, not bookable
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))


class Shift(Base):
    """A named time window a seat can be booked for (Morning, Evening,
    Full Day, 24 Hours, ...) -- workspace-defined, not a fixed enum,
    since every library runs its own shift schedule. `is_full_day` marks
    a shift where start_time/end_time aren't meaningful (a 24-hour or
    full-day seat), so the UI can skip showing a time range for it."""
    __tablename__ = "lib_shifts"

    shift_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    is_full_day = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))


class Member(Base):
    __tablename__ = "lib_members"

    member_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    joined_on = Column(Date, nullable=False)
    status = Column(String, nullable=False, default="active")  # active | inactive
    notes = Column(String, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))


class Booking(Base):
    """A member's seat+shift assignment for a date range -- the thing a
    membership fee actually pays for. Availability is computed from this
    table (see LibraryHandler._overlapping_booking): a seat+shift is free
    for a date range as long as no other *active* booking's range
    overlaps it, so cancelled/expired bookings free up the seat again."""
    __tablename__ = "lib_bookings"

    booking_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey("lib_members.member_id", ondelete="CASCADE"), nullable=False)
    seat_id = Column(UUID(as_uuid=True), ForeignKey("lib_seats.seat_id", ondelete="CASCADE"), nullable=False)
    shift_id = Column(UUID(as_uuid=True), ForeignKey("lib_shifts.shift_id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    fee_amount = Column(Numeric(12, 2), nullable=True)
    payment_status = Column(String, nullable=False, default="pending")  # paid | pending | overdue
    status = Column(String, nullable=False, default="active")  # active | cancelled | expired
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    member = relationship("Member")
    seat = relationship("Seat")
    shift = relationship("Shift")


class Attendance(Base):
    """One row per booking per day it was explicitly marked -- present
    (via check-in) or absent (via the mark-absent action). A day with no
    row simply has no record either way; this table isn't meant to be a
    complete present/absent calendar, only a log of what staff actually
    recorded."""
    __tablename__ = "lib_attendance"

    attendance_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("lib_bookings.booking_id", ondelete="CASCADE"), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey("lib_members.member_id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String, nullable=False)  # present | absent
    check_in_at = Column(DateTime, nullable=True)
    check_out_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    booking = relationship("Booking")
    member = relationship("Member")

from pydantic import BaseModel
from typing import Optional
from datetime import date, time


class SeatCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    seat_number: str
    section: Optional[str] = None


class SeatUpdateCommand(BaseModel):
    seat_id: Optional[str] = None
    seat_number: Optional[str] = None
    section: Optional[str] = None
    is_active: Optional[bool] = None


class ShiftCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    name: str
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_full_day: bool = False


class ShiftUpdateCommand(BaseModel):
    shift_id: Optional[str] = None
    name: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_full_day: Optional[bool] = None


class MemberCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    joined_on: Optional[date] = None
    notes: Optional[str] = None


class MemberUpdateCommand(BaseModel):
    member_id: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None  # active | inactive
    notes: Optional[str] = None


class BookingCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    member_id: str
    seat_id: str
    shift_id: str
    start_date: date
    end_date: date
    fee_amount: Optional[float] = None
    payment_status: str = "pending"  # paid | pending | overdue


class BookingUpdateCommand(BaseModel):
    booking_id: Optional[str] = None
    seat_id: Optional[str] = None
    shift_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    fee_amount: Optional[float] = None
    payment_status: Optional[str] = None  # paid | pending | overdue
    status: Optional[str] = None  # active | cancelled | expired


class CheckInCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    booking_id: str
    # Named on_date, not date -- a Pydantic field named exactly the same
    # as its own type (`date: Optional[date]`) breaks annotation
    # resolution (typing.get_type_hints looks the name up on the class
    # itself first and finds the field, not the `datetime.date` import),
    # silently turning the type into NoneType and rejecting every real
    # date value. Same reasoning in MarkAbsentCommand and AttendanceDto.
    on_date: Optional[date] = None  # defaults to today in the handler


class MarkAbsentCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    booking_id: str
    on_date: Optional[date] = None  # defaults to today in the handler

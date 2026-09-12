from pydantic import BaseModel
from typing import Optional
from datetime import date, time, datetime


class SeatDto(BaseModel):
    seat_id: str
    workspace_id: str
    seat_number: str
    section: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ShiftDto(BaseModel):
    shift_id: str
    workspace_id: str
    name: str
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_full_day: bool
    created_at: datetime
    updated_at: datetime


class MemberDto(BaseModel):
    member_id: str
    workspace_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    joined_on: date
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class BookingDto(BaseModel):
    booking_id: str
    workspace_id: str
    member_id: str
    member_name: str
    seat_id: str
    seat_number: str
    shift_id: str
    shift_name: str
    start_date: date
    end_date: date
    fee_amount: Optional[float] = None
    payment_status: str
    status: str
    created_at: datetime
    updated_at: datetime


class AttendanceDto(BaseModel):
    attendance_id: str
    workspace_id: str
    booking_id: str
    member_id: str
    member_name: str
    # Named on_date, not date -- see the comment on CheckInCommand.on_date
    # in commands.py for why a field can't share its type's name.
    on_date: date
    status: str
    check_in_at: Optional[datetime] = None
    check_out_at: Optional[datetime] = None


class SeatAvailabilityDto(BaseModel):
    """One row per seat for a given shift+date -- the seat map view."""
    seat_id: str
    seat_number: str
    section: Optional[str] = None
    is_active: bool
    is_occupied: bool
    booking_id: Optional[str] = None
    member_id: Optional[str] = None
    member_name: Optional[str] = None


class LibraryDtoMapper:
    @staticmethod
    def map_seat(seat) -> SeatDto:
        return SeatDto(
            seat_id=str(seat.seat_id),
            workspace_id=str(seat.workspace_id),
            seat_number=seat.seat_number,
            section=seat.section,
            is_active=seat.is_active,
            created_at=seat.created_at,
            updated_at=seat.updated_at,
        )

    @staticmethod
    def map_shift(shift) -> ShiftDto:
        return ShiftDto(
            shift_id=str(shift.shift_id),
            workspace_id=str(shift.workspace_id),
            name=shift.name,
            start_time=shift.start_time,
            end_time=shift.end_time,
            is_full_day=shift.is_full_day,
            created_at=shift.created_at,
            updated_at=shift.updated_at,
        )

    @staticmethod
    def map_member(member) -> MemberDto:
        return MemberDto(
            member_id=str(member.member_id),
            workspace_id=str(member.workspace_id),
            name=member.name,
            phone=member.phone,
            email=member.email,
            joined_on=member.joined_on,
            status=member.status,
            notes=member.notes,
            created_at=member.created_at,
            updated_at=member.updated_at,
        )

    @staticmethod
    def map_booking(booking) -> BookingDto:
        return BookingDto(
            booking_id=str(booking.booking_id),
            workspace_id=str(booking.workspace_id),
            member_id=str(booking.member_id),
            member_name=booking.member.name,
            seat_id=str(booking.seat_id),
            seat_number=booking.seat.seat_number,
            shift_id=str(booking.shift_id),
            shift_name=booking.shift.name,
            start_date=booking.start_date,
            end_date=booking.end_date,
            fee_amount=float(booking.fee_amount) if booking.fee_amount is not None else None,
            payment_status=booking.payment_status,
            status=booking.status,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
        )

    @staticmethod
    def map_attendance(attendance) -> AttendanceDto:
        return AttendanceDto(
            attendance_id=str(attendance.attendance_id),
            workspace_id=str(attendance.workspace_id),
            booking_id=str(attendance.booking_id),
            member_id=str(attendance.member_id),
            member_name=attendance.member.name,
            on_date=attendance.date,
            status=attendance.status,
            check_in_at=attendance.check_in_at,
            check_out_at=attendance.check_out_at,
        )

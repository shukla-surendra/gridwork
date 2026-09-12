import datetime
from uuid import UUID
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload
from fastapi import HTTPException, status
from adapters.orm.models.database import SessionLocal
from .models import Seat, Shift, Member, Booking, Attendance
from .commands import (
    SeatCommand, SeatUpdateCommand,
    ShiftCommand, ShiftUpdateCommand,
    MemberCommand, MemberUpdateCommand,
    BookingCommand, BookingUpdateCommand,
    CheckInCommand, MarkAbsentCommand,
)
from .dto import SeatAvailabilityDto
import logging

logger = logging.getLogger(__name__)

MEMBER_STATUSES = ("active", "inactive")
PAYMENT_STATUSES = ("paid", "pending", "overdue")
BOOKING_STATUSES = ("active", "cancelled", "expired")
ATTENDANCE_STATUSES = ("present", "absent")


class LibraryHandler:
    def __init__(self):
        self.db = SessionLocal()

    # -- Seats ------------------------------------------------------------

    def create_seat(self, command: SeatCommand) -> Seat:
        try:
            existing = self.db.query(Seat).filter(
                Seat.workspace_id == UUID(command.workspace_id),
                Seat.seat_number == command.seat_number,
                Seat.is_deleted == False
            ).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Seat '{command.seat_number}' already exists")

            seat = Seat(
                workspace_id=UUID(command.workspace_id),
                seat_number=command.seat_number,
                section=command.section,
            )
            self.db.add(seat)
            self.db.commit()
            self.db.refresh(seat)
            return seat
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating seat: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create seat")

    def list_seats(self, workspace_id: str) -> list[Seat]:
        return self.db.query(Seat).filter(
            Seat.workspace_id == UUID(workspace_id),
            Seat.is_deleted == False
        ).order_by(Seat.seat_number.asc()).all()

    def get_seat(self, seat_id: str) -> Seat:
        seat = self.db.query(Seat).filter(
            Seat.seat_id == UUID(seat_id),
            Seat.is_deleted == False
        ).first()
        if not seat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seat not found")
        return seat

    def update_seat(self, command: SeatUpdateCommand) -> Seat:
        try:
            seat = self.get_seat(command.seat_id)
            if command.seat_number is not None and command.seat_number != seat.seat_number:
                existing = self.db.query(Seat).filter(
                    Seat.workspace_id == seat.workspace_id,
                    Seat.seat_number == command.seat_number,
                    Seat.is_deleted == False,
                    Seat.seat_id != seat.seat_id
                ).first()
                if existing:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Seat '{command.seat_number}' already exists")
                seat.seat_number = command.seat_number
            if command.section is not None:
                seat.section = command.section
            if command.is_active is not None:
                seat.is_active = command.is_active
            self.db.commit()
            self.db.refresh(seat)
            return seat
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating seat: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update seat")

    def delete_seat(self, seat_id: str, workspace_id: str):
        try:
            seat = self.db.query(Seat).filter(
                Seat.seat_id == UUID(seat_id),
                Seat.workspace_id == UUID(workspace_id),
                Seat.is_deleted == False
            ).first()
            if not seat:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seat not found")
            seat.is_deleted = True
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting seat: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete seat")

    # -- Shifts -------------------------------------------------------------

    def create_shift(self, command: ShiftCommand) -> Shift:
        try:
            shift = Shift(
                workspace_id=UUID(command.workspace_id),
                name=command.name,
                start_time=command.start_time,
                end_time=command.end_time,
                is_full_day=command.is_full_day,
            )
            self.db.add(shift)
            self.db.commit()
            self.db.refresh(shift)
            return shift
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating shift: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create shift")

    def list_shifts(self, workspace_id: str) -> list[Shift]:
        return self.db.query(Shift).filter(
            Shift.workspace_id == UUID(workspace_id),
            Shift.is_deleted == False
        ).order_by(Shift.created_at.asc()).all()

    def get_shift(self, shift_id: str) -> Shift:
        shift = self.db.query(Shift).filter(
            Shift.shift_id == UUID(shift_id),
            Shift.is_deleted == False
        ).first()
        if not shift:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
        return shift

    def update_shift(self, command: ShiftUpdateCommand) -> Shift:
        try:
            shift = self.get_shift(command.shift_id)
            if command.name is not None:
                shift.name = command.name
            if command.start_time is not None:
                shift.start_time = command.start_time
            if command.end_time is not None:
                shift.end_time = command.end_time
            if command.is_full_day is not None:
                shift.is_full_day = command.is_full_day
            self.db.commit()
            self.db.refresh(shift)
            return shift
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating shift: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update shift")

    def delete_shift(self, shift_id: str, workspace_id: str):
        try:
            shift = self.db.query(Shift).filter(
                Shift.shift_id == UUID(shift_id),
                Shift.workspace_id == UUID(workspace_id),
                Shift.is_deleted == False
            ).first()
            if not shift:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
            shift.is_deleted = True
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting shift: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete shift")

    # -- Members --------------------------------------------------------

    def create_member(self, command: MemberCommand) -> Member:
        try:
            member = Member(
                workspace_id=UUID(command.workspace_id),
                name=command.name,
                phone=command.phone,
                email=command.email,
                joined_on=command.joined_on or datetime.date.today(),
                notes=command.notes,
            )
            self.db.add(member)
            self.db.commit()
            self.db.refresh(member)
            return member
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating member: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create member")

    def list_members(self, workspace_id: str) -> list[Member]:
        return self.db.query(Member).filter(
            Member.workspace_id == UUID(workspace_id),
            Member.is_deleted == False
        ).order_by(Member.created_at.desc()).all()

    def get_member(self, member_id: str) -> Member:
        member = self.db.query(Member).filter(
            Member.member_id == UUID(member_id),
            Member.is_deleted == False
        ).first()
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        return member

    def update_member(self, command: MemberUpdateCommand) -> Member:
        try:
            member = self.get_member(command.member_id)
            if command.name is not None:
                member.name = command.name
            if command.phone is not None:
                member.phone = command.phone
            if command.email is not None:
                member.email = command.email
            if command.status is not None:
                if command.status not in MEMBER_STATUSES:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"status must be one of {MEMBER_STATUSES}")
                member.status = command.status
            if command.notes is not None:
                member.notes = command.notes
            self.db.commit()
            self.db.refresh(member)
            return member
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating member: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update member")

    def delete_member(self, member_id: str, workspace_id: str):
        try:
            member = self.db.query(Member).filter(
                Member.member_id == UUID(member_id),
                Member.workspace_id == UUID(workspace_id),
                Member.is_deleted == False
            ).first()
            if not member:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
            member.is_deleted = True
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting member: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete member")

    # -- Bookings ---------------------------------------------------------

    def _booking_query(self):
        """Every Booking read the API returns needs .member/.seat/.shift
        for the DTO (see dto.py's map_booking) -- joinedload them here so
        that data comes back in the same query instead of a lazy load.
        That matters because this handler's session closes (see __del__)
        as soon as the handler object goes out of scope, which happens
        the instant the controller's one-liner
        `LibraryHandler().get_booking(...)` returns -- a bare lazy-load
        attempt after that point hits SQLAlchemy's "not bound to a
        Session" error, not a fresh query."""
        return self.db.query(Booking).options(
            joinedload(Booking.member), joinedload(Booking.seat), joinedload(Booking.shift)
        )

    def _overlapping_booking(self, workspace_id: str, seat_id: str, shift_id: str, start_date, end_date, exclude_booking_id: str = None) -> Booking:
        """The seat-availability check: is there any other *active*
        booking on this seat+shift whose date range overlaps
        [start_date, end_date]? Standard interval overlap -- two ranges
        overlap unless one ends before the other starts."""
        query = self.db.query(Booking).filter(
            Booking.workspace_id == UUID(workspace_id),
            Booking.seat_id == UUID(seat_id),
            Booking.shift_id == UUID(shift_id),
            Booking.status == "active",
            Booking.start_date <= end_date,
            Booking.end_date >= start_date,
        )
        if exclude_booking_id:
            query = query.filter(Booking.booking_id != UUID(exclude_booking_id))
        return query.first()

    def create_booking(self, command: BookingCommand) -> Booking:
        try:
            if command.start_date > command.end_date:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_date must be on or before end_date")
            if command.payment_status not in PAYMENT_STATUSES:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"payment_status must be one of {PAYMENT_STATUSES}")

            # Existence + workspace scoping in one check, same pattern as
            # Inventory's stock movements -- a member/seat/shift from a
            # different workspace must 404, not silently attach.
            member = self.db.query(Member).filter(
                Member.member_id == UUID(command.member_id),
                Member.workspace_id == UUID(command.workspace_id),
                Member.is_deleted == False
            ).first()
            if not member:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

            seat = self.db.query(Seat).filter(
                Seat.seat_id == UUID(command.seat_id),
                Seat.workspace_id == UUID(command.workspace_id),
                Seat.is_deleted == False
            ).first()
            if not seat:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seat not found")
            if not seat.is_active:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Seat is not active")

            shift = self.db.query(Shift).filter(
                Shift.shift_id == UUID(command.shift_id),
                Shift.workspace_id == UUID(command.workspace_id),
                Shift.is_deleted == False
            ).first()
            if not shift:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

            conflict = self._overlapping_booking(command.workspace_id, command.seat_id, command.shift_id, command.start_date, command.end_date)
            if conflict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Seat '{seat.seat_number}' is already booked for shift '{shift.name}' during that date range"
                )

            booking = Booking(
                workspace_id=UUID(command.workspace_id),
                member_id=UUID(command.member_id),
                seat_id=UUID(command.seat_id),
                shift_id=UUID(command.shift_id),
                start_date=command.start_date,
                end_date=command.end_date,
                fee_amount=command.fee_amount,
                payment_status=command.payment_status,
            )
            self.db.add(booking)
            self.db.commit()
            # Not self.db.refresh(booking) -- refresh only reloads column
            # attributes, not relationships, and commit's default
            # expire_on_commit leaves .member/.seat/.shift expired
            # either way. Re-fetching with the eager-load query is what
            # actually makes them safe to read after this handler closes.
            return self._booking_query().filter(Booking.booking_id == booking.booking_id).one()
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating booking: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create booking")

    def list_bookings(self, workspace_id: str, member_id: str = None, seat_id: str = None, status_filter: str = None) -> list[Booking]:
        query = self._booking_query().filter(Booking.workspace_id == UUID(workspace_id))
        if member_id:
            query = query.filter(Booking.member_id == UUID(member_id))
        if seat_id:
            query = query.filter(Booking.seat_id == UUID(seat_id))
        if status_filter:
            query = query.filter(Booking.status == status_filter)
        return query.order_by(Booking.start_date.desc()).all()

    def get_booking(self, booking_id: str) -> Booking:
        booking = self._booking_query().filter(Booking.booking_id == UUID(booking_id)).first()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
        return booking

    def update_booking(self, command: BookingUpdateCommand) -> Booking:
        try:
            booking = self.get_booking(command.booking_id)

            new_seat_id = command.seat_id or str(booking.seat_id)
            new_shift_id = command.shift_id or str(booking.shift_id)
            new_start = command.start_date or booking.start_date
            new_end = command.end_date or booking.end_date
            if new_start > new_end:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_date must be on or before end_date")

            # Only worth re-checking availability if the seat, shift, or
            # dates are actually changing -- re-running it unconditionally
            # would spuriously conflict with the booking's own unchanged row.
            if command.seat_id or command.shift_id or command.start_date or command.end_date:
                conflict = self._overlapping_booking(
                    str(booking.workspace_id), new_seat_id, new_shift_id, new_start, new_end,
                    exclude_booking_id=str(booking.booking_id)
                )
                if conflict:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Seat is already booked for that shift during that date range")

            if command.seat_id is not None:
                booking.seat_id = UUID(command.seat_id)
            if command.shift_id is not None:
                booking.shift_id = UUID(command.shift_id)
            if command.start_date is not None:
                booking.start_date = command.start_date
            if command.end_date is not None:
                booking.end_date = command.end_date
            if command.fee_amount is not None:
                booking.fee_amount = command.fee_amount
            if command.payment_status is not None:
                if command.payment_status not in PAYMENT_STATUSES:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"payment_status must be one of {PAYMENT_STATUSES}")
                booking.payment_status = command.payment_status
            if command.status is not None:
                if command.status not in BOOKING_STATUSES:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"status must be one of {BOOKING_STATUSES}")
                booking.status = command.status

            self.db.commit()
            return self._booking_query().filter(Booking.booking_id == booking.booking_id).one()
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating booking: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update booking")

    def cancel_booking(self, booking_id: str, workspace_id: str) -> Booking:
        try:
            booking = self.db.query(Booking).filter(
                Booking.booking_id == UUID(booking_id),
                Booking.workspace_id == UUID(workspace_id),
            ).first()
            if not booking:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
            # Cancelled, not deleted -- attendance rows reference this
            # booking, and a cancelled booking frees the seat back up for
            # _overlapping_booking without losing that history.
            booking.status = "cancelled"
            self.db.commit()
            return self._booking_query().filter(Booking.booking_id == booking.booking_id).one()
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error cancelling booking: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to cancel booking")

    # -- Seat map / availability ------------------------------------------

    def get_seat_availability(self, workspace_id: str, shift_id: str, on_date) -> list[SeatAvailabilityDto]:
        shift = self.get_shift(shift_id)
        if str(shift.workspace_id) != str(workspace_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

        seats = self.list_seats(workspace_id)
        bookings = self.db.query(Booking).options(joinedload(Booking.member)).filter(
            Booking.workspace_id == UUID(workspace_id),
            Booking.shift_id == UUID(shift_id),
            Booking.status == "active",
            Booking.start_date <= on_date,
            Booking.end_date >= on_date,
        ).all()
        booking_by_seat = {str(b.seat_id): b for b in bookings}

        rows = []
        for seat in seats:
            booking = booking_by_seat.get(str(seat.seat_id))
            rows.append(SeatAvailabilityDto(
                seat_id=str(seat.seat_id),
                seat_number=seat.seat_number,
                section=seat.section,
                is_active=seat.is_active,
                is_occupied=booking is not None,
                booking_id=str(booking.booking_id) if booking else None,
                member_id=str(booking.member_id) if booking else None,
                member_name=booking.member.name if booking else None,
            ))
        return rows

    # -- Attendance ---------------------------------------------------------

    def _attendance_query(self):
        """Same reasoning as _booking_query -- map_attendance (dto.py)
        needs .member, so eager-load it rather than leave it for a lazy
        load this handler's session won't be around for."""
        return self.db.query(Attendance).options(joinedload(Attendance.member))

    def _get_or_init_attendance(self, booking: Booking, on_date) -> Attendance:
        attendance = self.db.query(Attendance).filter(
            Attendance.booking_id == booking.booking_id,
            Attendance.date == on_date,
        ).first()
        if not attendance:
            attendance = Attendance(
                workspace_id=booking.workspace_id,
                booking_id=booking.booking_id,
                member_id=booking.member_id,
                date=on_date,
                status="present",
            )
            self.db.add(attendance)
        return attendance

    def check_in(self, command: CheckInCommand) -> Attendance:
        try:
            booking = self.db.query(Booking).filter(
                Booking.booking_id == UUID(command.booking_id),
                Booking.workspace_id == UUID(command.workspace_id),
            ).first()
            if not booking:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
            if booking.status != "active":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is not active")

            on_date = command.on_date or datetime.date.today()
            if not (booking.start_date <= on_date <= booking.end_date):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Date is outside the booking's date range")

            attendance = self._get_or_init_attendance(booking, on_date)
            attendance.status = "present"
            attendance.check_in_at = datetime.datetime.now(datetime.UTC)
            self.db.commit()
            return self._attendance_query().filter(Attendance.attendance_id == attendance.attendance_id).one()
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error checking in: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to check in")

    def check_out(self, booking_id: str, workspace_id: str, on_date=None) -> Attendance:
        try:
            on_date = on_date or datetime.date.today()
            attendance = self.db.query(Attendance).filter(
                Attendance.booking_id == UUID(booking_id),
                Attendance.workspace_id == UUID(workspace_id),
                Attendance.date == on_date,
            ).first()
            if not attendance:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No check-in found for that date")
            attendance.check_out_at = datetime.datetime.now(datetime.UTC)
            self.db.commit()
            return self._attendance_query().filter(Attendance.attendance_id == attendance.attendance_id).one()
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error checking out: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to check out")

    def mark_absent(self, command: MarkAbsentCommand) -> Attendance:
        try:
            booking = self.db.query(Booking).filter(
                Booking.booking_id == UUID(command.booking_id),
                Booking.workspace_id == UUID(command.workspace_id),
            ).first()
            if not booking:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

            on_date = command.on_date or datetime.date.today()
            attendance = self._get_or_init_attendance(booking, on_date)
            attendance.status = "absent"
            self.db.commit()
            return self._attendance_query().filter(Attendance.attendance_id == attendance.attendance_id).one()
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error marking absent: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to mark absent")

    def list_attendance(self, workspace_id: str, member_id: str = None, booking_id: str = None, date_from=None, date_to=None) -> list[Attendance]:
        query = self._attendance_query().filter(Attendance.workspace_id == UUID(workspace_id))
        if member_id:
            query = query.filter(Attendance.member_id == UUID(member_id))
        if booking_id:
            query = query.filter(Attendance.booking_id == UUID(booking_id))
        if date_from:
            query = query.filter(Attendance.date >= date_from)
        if date_to:
            query = query.filter(Attendance.date <= date_to)
        return query.order_by(Attendance.date.desc()).all()

    def __del__(self):
        self.db.close()

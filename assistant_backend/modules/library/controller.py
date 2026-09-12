from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import date
from starlette.responses import Response
from modules.access import require_module_enabled
from .commands import (
    SeatCommand, SeatUpdateCommand,
    ShiftCommand, ShiftUpdateCommand,
    MemberCommand, MemberUpdateCommand,
    BookingCommand, BookingUpdateCommand,
    CheckInCommand, MarkAbsentCommand,
)
from .dto import SeatDto, ShiftDto, MemberDto, BookingDto, AttendanceDto, SeatAvailabilityDto, LibraryDtoMapper
from .handlers import LibraryHandler
from config import logger

MODULE_KEY = "library"

router = APIRouter(
    prefix="/api/v1/workspaces/{workspace_id}/library",
    tags=["Library"],
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Internal server error"},
        status.HTTP_403_FORBIDDEN: {"description": "Operation not permitted"},
        status.HTTP_400_BAD_REQUEST: {"description": "Bad request"},
    },
)

gate = require_module_enabled(MODULE_KEY, default_enabled=False)


# -- Seats --------------------------------------------------------------

@router.post("/seats", response_model=SeatDto, status_code=status.HTTP_201_CREATED)
async def create_seat(workspace_id: str, command: SeatCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        seat = LibraryHandler().create_seat(command)
        return LibraryDtoMapper.map_seat(seat)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating seat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/seats", response_model=List[SeatDto])
async def list_seats(workspace_id: str, user: dict = Depends(gate)):
    try:
        seats = LibraryHandler().list_seats(workspace_id)
        return [LibraryDtoMapper.map_seat(s) for s in seats]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing seats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/seats/{seat_id}", response_model=SeatDto)
async def update_seat(workspace_id: str, seat_id: str, command: SeatUpdateCommand, user: dict = Depends(gate)):
    command.seat_id = seat_id
    try:
        seat = LibraryHandler().update_seat(command)
        return LibraryDtoMapper.map_seat(seat)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating seat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/seats/{seat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_seat(workspace_id: str, seat_id: str, user: dict = Depends(gate)):
    try:
        LibraryHandler().delete_seat(seat_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting seat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Shifts ---------------------------------------------------------------

@router.post("/shifts", response_model=ShiftDto, status_code=status.HTTP_201_CREATED)
async def create_shift(workspace_id: str, command: ShiftCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        shift = LibraryHandler().create_shift(command)
        return LibraryDtoMapper.map_shift(shift)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating shift: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/shifts", response_model=List[ShiftDto])
async def list_shifts(workspace_id: str, user: dict = Depends(gate)):
    try:
        shifts = LibraryHandler().list_shifts(workspace_id)
        return [LibraryDtoMapper.map_shift(s) for s in shifts]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing shifts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/shifts/{shift_id}", response_model=ShiftDto)
async def update_shift(workspace_id: str, shift_id: str, command: ShiftUpdateCommand, user: dict = Depends(gate)):
    command.shift_id = shift_id
    try:
        shift = LibraryHandler().update_shift(command)
        return LibraryDtoMapper.map_shift(shift)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating shift: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/shifts/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shift(workspace_id: str, shift_id: str, user: dict = Depends(gate)):
    try:
        LibraryHandler().delete_shift(shift_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting shift: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Members --------------------------------------------------------------

@router.post("/members", response_model=MemberDto, status_code=status.HTTP_201_CREATED)
async def create_member(workspace_id: str, command: MemberCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        member = LibraryHandler().create_member(command)
        return LibraryDtoMapper.map_member(member)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating member: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/members", response_model=List[MemberDto])
async def list_members(workspace_id: str, user: dict = Depends(gate)):
    try:
        members = LibraryHandler().list_members(workspace_id)
        return [LibraryDtoMapper.map_member(m) for m in members]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing members: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/members/{member_id}", response_model=MemberDto)
async def get_member(workspace_id: str, member_id: str, user: dict = Depends(gate)):
    try:
        member = LibraryHandler().get_member(member_id)
        if str(member.workspace_id) != str(workspace_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        return LibraryDtoMapper.map_member(member)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting member: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/members/{member_id}", response_model=MemberDto)
async def update_member(workspace_id: str, member_id: str, command: MemberUpdateCommand, user: dict = Depends(gate)):
    command.member_id = member_id
    try:
        member = LibraryHandler().update_member(command)
        return LibraryDtoMapper.map_member(member)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating member: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(workspace_id: str, member_id: str, user: dict = Depends(gate)):
    try:
        LibraryHandler().delete_member(member_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting member: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Bookings ---------------------------------------------------------------

@router.post("/bookings", response_model=BookingDto, status_code=status.HTTP_201_CREATED)
async def create_booking(workspace_id: str, command: BookingCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        booking = LibraryHandler().create_booking(command)
        return LibraryDtoMapper.map_booking(booking)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating booking: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bookings", response_model=List[BookingDto])
async def list_bookings(
    workspace_id: str,
    member_id: Optional[str] = None,
    seat_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    user: dict = Depends(gate),
):
    try:
        bookings = LibraryHandler().list_bookings(workspace_id, member_id, seat_id, status_filter)
        return [LibraryDtoMapper.map_booking(b) for b in bookings]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing bookings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bookings/{booking_id}", response_model=BookingDto)
async def get_booking(workspace_id: str, booking_id: str, user: dict = Depends(gate)):
    try:
        booking = LibraryHandler().get_booking(booking_id)
        if str(booking.workspace_id) != str(workspace_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
        return LibraryDtoMapper.map_booking(booking)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting booking: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/bookings/{booking_id}", response_model=BookingDto)
async def update_booking(workspace_id: str, booking_id: str, command: BookingUpdateCommand, user: dict = Depends(gate)):
    command.booking_id = booking_id
    try:
        booking = LibraryHandler().update_booking(command)
        return LibraryDtoMapper.map_booking(booking)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating booking: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bookings/{booking_id}/cancel", response_model=BookingDto)
async def cancel_booking(workspace_id: str, booking_id: str, user: dict = Depends(gate)):
    try:
        booking = LibraryHandler().cancel_booking(booking_id, workspace_id)
        return LibraryDtoMapper.map_booking(booking)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling booking: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Seat map / availability ------------------------------------------------

@router.get("/seat-map", response_model=List[SeatAvailabilityDto])
async def get_seat_map(workspace_id: str, shift_id: str, on_date: date, user: dict = Depends(gate)):
    try:
        return LibraryHandler().get_seat_availability(workspace_id, shift_id, on_date)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting seat map: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Attendance ---------------------------------------------------------

@router.post("/attendance/check-in", response_model=AttendanceDto, status_code=status.HTTP_201_CREATED)
async def check_in(workspace_id: str, command: CheckInCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        attendance = LibraryHandler().check_in(command)
        return LibraryDtoMapper.map_attendance(attendance)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking in: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/attendance/{booking_id}/check-out", response_model=AttendanceDto)
async def check_out(workspace_id: str, booking_id: str, on_date: Optional[date] = None, user: dict = Depends(gate)):
    try:
        attendance = LibraryHandler().check_out(booking_id, workspace_id, on_date)
        return LibraryDtoMapper.map_attendance(attendance)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking out: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/attendance/mark-absent", response_model=AttendanceDto, status_code=status.HTTP_201_CREATED)
async def mark_absent(workspace_id: str, command: MarkAbsentCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        attendance = LibraryHandler().mark_absent(command)
        return LibraryDtoMapper.map_attendance(attendance)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking absent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attendance", response_model=List[AttendanceDto])
async def list_attendance(
    workspace_id: str,
    member_id: Optional[str] = None,
    booking_id: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    user: dict = Depends(gate),
):
    try:
        records = LibraryHandler().list_attendance(workspace_id, member_id, booking_id, date_from, date_to)
        return [LibraryDtoMapper.map_attendance(a) for a in records]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing attendance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


library_router = router

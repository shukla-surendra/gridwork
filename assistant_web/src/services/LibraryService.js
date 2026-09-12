import http from "../http-common";
import ConfigService from "../utils/config";

const base = () => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return `/api/v1/workspaces/${workspace_id}/library`;
};

const getSeats = () => http.get(`${base()}/seats`);
const createSeat = (data) => http.post(`${base()}/seats`, data);
const updateSeat = (id, data) => http.put(`${base()}/seats/${id}`, data);
const removeSeat = (id) => http.delete(`${base()}/seats/${id}`);

const getShifts = () => http.get(`${base()}/shifts`);
const createShift = (data) => http.post(`${base()}/shifts`, data);
const updateShift = (id, data) => http.put(`${base()}/shifts/${id}`, data);
const removeShift = (id) => http.delete(`${base()}/shifts/${id}`);

const getMembers = () => http.get(`${base()}/members`);
const getMember = (id) => http.get(`${base()}/members/${id}`);
const createMember = (data) => http.post(`${base()}/members`, data);
const updateMember = (id, data) => http.put(`${base()}/members/${id}`, data);
const removeMember = (id) => http.delete(`${base()}/members/${id}`);

const getBookings = (params = {}) => http.get(`${base()}/bookings`, { params });
const getBooking = (id) => http.get(`${base()}/bookings/${id}`);
const createBooking = (data) => http.post(`${base()}/bookings`, data);
const updateBooking = (id, data) => http.put(`${base()}/bookings/${id}`, data);
const cancelBooking = (id) => http.post(`${base()}/bookings/${id}/cancel`);

const getSeatMap = (shiftId, onDate) => http.get(`${base()}/seat-map`, { params: { shift_id: shiftId, on_date: onDate } });

const checkIn = (data) => http.post(`${base()}/attendance/check-in`, data);
const checkOut = (bookingId, onDate) => http.post(`${base()}/attendance/${bookingId}/check-out`, null, { params: onDate ? { on_date: onDate } : {} });
const markAbsent = (data) => http.post(`${base()}/attendance/mark-absent`, data);
const getAttendance = (params = {}) => http.get(`${base()}/attendance`, { params });

const LibraryService = {
  getSeats, createSeat, updateSeat, removeSeat,
  getShifts, createShift, updateShift, removeShift,
  getMembers, getMember, createMember, updateMember, removeMember,
  getBookings, getBooking, createBooking, updateBooking, cancelBooking,
  getSeatMap,
  checkIn, checkOut, markAbsent, getAttendance,
};

export default LibraryService;

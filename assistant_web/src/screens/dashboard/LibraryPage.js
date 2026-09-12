import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Heading, Text, HStack, VStack, Badge, IconButton, Button, SimpleGrid,
  useColorModeValue, useDisclosure, Spinner, Center, useToast, Tooltip,
  Tabs, TabList, TabPanels, Tab, TabPanel, Table, Thead, Tbody, Tr, Th, Td,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, Input, Select, NumberInput, NumberInputField, Checkbox, Textarea,
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiEdit2, FiBookOpen, FiCheckCircle, FiXCircle, FiSlash } from 'react-icons/fi';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import LibraryService from '../../services/LibraryService';

const todayIso = () => new Date().toISOString().slice(0, 10);
const addDaysIso = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const PAYMENT_COLORS = { paid: 'green', pending: 'yellow', overdue: 'red' };
const BOOKING_STATUS_COLORS = { active: 'teal', cancelled: 'gray', expired: 'orange' };

const emptySeat = { seat_number: '', section: '' };
const emptyShift = { name: '', start_time: '09:00', end_time: '17:00', is_full_day: false };
const emptyMember = { name: '', phone: '', email: '', joined_on: todayIso(), notes: '' };
const emptyBooking = { member_id: '', seat_id: '', shift_id: '', start_date: todayIso(), end_date: addDaysIso(30), fee_amount: '', payment_status: 'pending' };

export default function LibraryPage() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const toast = useToast();
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');
  const cardBg = useColorModeValue('white', 'gray.700');
  const occupiedBg = useColorModeValue('red.50', 'red.900');
  const freeBg = useColorModeValue('green.50', 'green.900');
  const inactiveBg = useColorModeValue('gray.100', 'gray.700');

  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [members, setMembers] = useState([]);
  const [bookings, setBookings] = useState([]);

  const activeMembers = useMemo(() => members.filter(m => m.status === 'active'), [members]);
  const activeSeats = useMemo(() => seats.filter(s => s.is_active), [seats]);

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      LibraryService.getSeats(),
      LibraryService.getShifts(),
      LibraryService.getMembers(),
      LibraryService.getBookings(),
    ])
      .then(([se, sh, m, b]) => {
        setSeats(se.data);
        setShifts(sh.data);
        setMembers(m.data);
        setBookings(b.data);
      })
      .catch(() => toast({ title: "Couldn't load library", status: "error", duration: 3000, isClosable: true }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // -- Seats --------------------------------------------------------------

  const seatModal = useDisclosure();
  const [editingSeat, setEditingSeat] = useState(null);
  const [seatForm, setSeatForm] = useState(emptySeat);

  const openNewSeat = () => { setEditingSeat(null); setSeatForm(emptySeat); seatModal.onOpen(); };
  const openEditSeat = (seat) => { setEditingSeat(seat); setSeatForm({ seat_number: seat.seat_number, section: seat.section || '' }); seatModal.onOpen(); };

  const handleSaveSeat = async () => {
    if (!seatForm.seat_number.trim()) return;
    try {
      if (editingSeat) {
        await LibraryService.updateSeat(editingSeat.seat_id, seatForm);
      } else {
        await LibraryService.createSeat(seatForm);
      }
      seatModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't save seat", description: error.response?.data?.detail, status: "error", duration: 3500, isClosable: true });
    }
  };

  const handleToggleSeatActive = async (seat) => {
    try {
      await LibraryService.updateSeat(seat.seat_id, { is_active: !seat.is_active });
      loadAll();
    } catch {
      toast({ title: "Couldn't update seat", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleDeleteSeat = async (seatId) => {
    try {
      await LibraryService.removeSeat(seatId);
      loadAll();
    } catch {
      toast({ title: "Couldn't delete seat", status: "error", duration: 3000, isClosable: true });
    }
  };

  // -- Shifts ---------------------------------------------------------------

  const shiftModal = useDisclosure();
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState(emptyShift);

  const openNewShift = () => { setEditingShift(null); setShiftForm(emptyShift); shiftModal.onOpen(); };
  const openEditShift = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      start_time: shift.start_time || '09:00',
      end_time: shift.end_time || '17:00',
      is_full_day: shift.is_full_day,
    });
    shiftModal.onOpen();
  };

  const handleSaveShift = async () => {
    if (!shiftForm.name.trim()) return;
    const payload = {
      name: shiftForm.name,
      is_full_day: shiftForm.is_full_day,
      start_time: shiftForm.is_full_day ? null : shiftForm.start_time,
      end_time: shiftForm.is_full_day ? null : shiftForm.end_time,
    };
    try {
      if (editingShift) {
        await LibraryService.updateShift(editingShift.shift_id, payload);
      } else {
        await LibraryService.createShift(payload);
      }
      shiftModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't save shift", description: error.response?.data?.detail, status: "error", duration: 3500, isClosable: true });
    }
  };

  const handleDeleteShift = async (shiftId) => {
    try {
      await LibraryService.removeShift(shiftId);
      loadAll();
    } catch {
      toast({ title: "Couldn't delete shift", status: "error", duration: 3000, isClosable: true });
    }
  };

  // -- Members --------------------------------------------------------------

  const memberModal = useDisclosure();
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm, setMemberForm] = useState(emptyMember);

  const openNewMember = () => { setEditingMember(null); setMemberForm(emptyMember); memberModal.onOpen(); };
  const openEditMember = (member) => {
    setEditingMember(member);
    setMemberForm({ name: member.name, phone: member.phone || '', email: member.email || '', joined_on: member.joined_on, notes: member.notes || '', status: member.status });
    memberModal.onOpen();
  };

  const handleSaveMember = async () => {
    if (!memberForm.name.trim()) return;
    try {
      if (editingMember) {
        await LibraryService.updateMember(editingMember.member_id, {
          name: memberForm.name, phone: memberForm.phone, email: memberForm.email, notes: memberForm.notes, status: memberForm.status,
        });
      } else {
        await LibraryService.createMember({
          name: memberForm.name, phone: memberForm.phone, email: memberForm.email, joined_on: memberForm.joined_on, notes: memberForm.notes,
        });
      }
      memberModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't save member", description: error.response?.data?.detail, status: "error", duration: 3500, isClosable: true });
    }
  };

  const handleDeleteMember = async (memberId) => {
    try {
      await LibraryService.removeMember(memberId);
      loadAll();
    } catch {
      toast({ title: "Couldn't delete member", status: "error", duration: 3000, isClosable: true });
    }
  };

  // -- Bookings ---------------------------------------------------------------

  const bookingModal = useDisclosure();
  const [editingBooking, setEditingBooking] = useState(null);
  const [bookingForm, setBookingForm] = useState(emptyBooking);

  const openNewBooking = (prefill = {}) => {
    setEditingBooking(null);
    setBookingForm({ ...emptyBooking, ...prefill });
    bookingModal.onOpen();
  };
  const openEditBooking = (booking) => {
    setEditingBooking(booking);
    setBookingForm({
      member_id: booking.member_id,
      seat_id: booking.seat_id,
      shift_id: booking.shift_id,
      start_date: booking.start_date,
      end_date: booking.end_date,
      fee_amount: booking.fee_amount ?? '',
      payment_status: booking.payment_status,
      status: booking.status,
    });
    bookingModal.onOpen();
  };

  const handleSaveBooking = async () => {
    if (!bookingForm.member_id || !bookingForm.seat_id || !bookingForm.shift_id) return;
    try {
      if (editingBooking) {
        await LibraryService.updateBooking(editingBooking.booking_id, {
          seat_id: bookingForm.seat_id,
          shift_id: bookingForm.shift_id,
          start_date: bookingForm.start_date,
          end_date: bookingForm.end_date,
          fee_amount: bookingForm.fee_amount === '' ? null : parseFloat(bookingForm.fee_amount),
          payment_status: bookingForm.payment_status,
          status: bookingForm.status,
        });
      } else {
        await LibraryService.createBooking({
          member_id: bookingForm.member_id,
          seat_id: bookingForm.seat_id,
          shift_id: bookingForm.shift_id,
          start_date: bookingForm.start_date,
          end_date: bookingForm.end_date,
          fee_amount: bookingForm.fee_amount === '' ? null : parseFloat(bookingForm.fee_amount),
          payment_status: bookingForm.payment_status,
        });
      }
      bookingModal.onClose();
      loadAll();
      if (seatMapShiftId) loadSeatMap();
    } catch (error) {
      toast({ title: "Couldn't save booking", description: error.response?.data?.detail, status: "error", duration: 4500, isClosable: true });
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await LibraryService.cancelBooking(bookingId);
      loadAll();
      if (seatMapShiftId) loadSeatMap();
    } catch {
      toast({ title: "Couldn't cancel booking", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleCheckIn = async (bookingId) => {
    try {
      await LibraryService.checkIn({ booking_id: bookingId, on_date: todayIso() });
      toast({ title: "Checked in for today", status: "success", duration: 2000, isClosable: true });
    } catch (error) {
      toast({ title: "Couldn't check in", description: error.response?.data?.detail, status: "error", duration: 3500, isClosable: true });
    }
  };

  const handleMarkAbsent = async (bookingId) => {
    try {
      await LibraryService.markAbsent({ booking_id: bookingId, on_date: todayIso() });
      toast({ title: "Marked absent for today", status: "success", duration: 2000, isClosable: true });
    } catch (error) {
      toast({ title: "Couldn't mark absent", description: error.response?.data?.detail, status: "error", duration: 3500, isClosable: true });
    }
  };

  // -- Seat map -------------------------------------------------------------

  const [seatMapShiftId, setSeatMapShiftId] = useState('');
  const [seatMapDate, setSeatMapDate] = useState(todayIso());
  const [seatMapRows, setSeatMapRows] = useState([]);
  const [seatMapLoading, setSeatMapLoading] = useState(false);

  const loadSeatMap = useCallback(() => {
    if (!seatMapShiftId || !seatMapDate) return;
    setSeatMapLoading(true);
    LibraryService.getSeatMap(seatMapShiftId, seatMapDate)
      .then(res => setSeatMapRows(res.data))
      .catch(() => toast({ title: "Couldn't load seat map", status: "error", duration: 3000, isClosable: true }))
      .finally(() => setSeatMapLoading(false));
  }, [seatMapShiftId, seatMapDate, toast]);

  useEffect(() => {
    if (shifts.length > 0 && !seatMapShiftId) setSeatMapShiftId(shifts[0].shift_id);
  }, [shifts, seatMapShiftId]);

  useEffect(() => { loadSeatMap(); }, [loadSeatMap]);

  const handleSeatClick = (row) => {
    if (!row.is_active) return;
    if (row.is_occupied) {
      toast({ title: row.member_name, description: 'This seat is booked for the selected shift and date.', status: 'info', duration: 2500, isClosable: true });
      return;
    }
    openNewBooking({ seat_id: row.seat_id, shift_id: seatMapShiftId, start_date: seatMapDate });
  };

  // -- Attendance ---------------------------------------------------------

  const [attendanceMemberId, setAttendanceMemberId] = useState('');
  const [attendanceFrom, setAttendanceFrom] = useState(addDaysIso(-7));
  const [attendanceTo, setAttendanceTo] = useState(todayIso());
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const loadAttendance = useCallback(() => {
    setAttendanceLoading(true);
    LibraryService.getAttendance({
      member_id: attendanceMemberId || undefined,
      date_from: attendanceFrom || undefined,
      date_to: attendanceTo || undefined,
    })
      .then(res => setAttendanceRows(res.data))
      .catch(() => toast({ title: "Couldn't load attendance", status: "error", duration: 3000, isClosable: true }))
      .finally(() => setAttendanceLoading(false));
  }, [attendanceMemberId, attendanceFrom, attendanceTo, toast]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  if (loading) {
    return (
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }}>
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Center py={20}><Spinner /></Center>
        </Box>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={pageBg}>
      <Navbar isCollapsed={isMenuCollapsed} />
      <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
        <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
        <Box as="main" p={{ base: 3, md: 4 }} minH="calc(100vh - 4rem)" bg={mainBg} borderRadius="lg" boxShadow="sm">
          <HStack mb={4}>
            <FiBookOpen size={20} />
            <Heading size="lg">Library</Heading>
          </HStack>

          <Tabs colorScheme="teal">
            <TabList overflowX="auto" overflowY="hidden">
              <Tab>Seat Map</Tab>
              <Tab>Bookings</Tab>
              <Tab>Members</Tab>
              <Tab>Seats</Tab>
              <Tab>Shifts</Tab>
              <Tab>Attendance</Tab>
            </TabList>
            <TabPanels>
              {/* Seat Map */}
              <TabPanel px={0}>
                <HStack mb={4} spacing={3} flexWrap="wrap">
                  <Select size="sm" maxW="220px" placeholder="Select shift" value={seatMapShiftId} onChange={(e) => setSeatMapShiftId(e.target.value)}>
                    {shifts.map(s => <option key={s.shift_id} value={s.shift_id}>{s.name}</option>)}
                  </Select>
                  <Input size="sm" type="date" maxW="180px" value={seatMapDate} onChange={(e) => setSeatMapDate(e.target.value)} />
                </HStack>

                {shifts.length === 0 ? (
                  <Text fontSize="sm" color="gray.400">Create a shift first (Shifts tab).</Text>
                ) : seats.length === 0 ? (
                  <Text fontSize="sm" color="gray.400">Add some seats first (Seats tab).</Text>
                ) : seatMapLoading ? (
                  <Center py={10}><Spinner /></Center>
                ) : (
                  <>
                    <HStack mb={3} spacing={4} fontSize="xs" color="gray.500">
                      <HStack><Box w={3} h={3} borderRadius="sm" bg={freeBg} border="1px solid" borderColor="green.300" /><Text>Free (click to book)</Text></HStack>
                      <HStack><Box w={3} h={3} borderRadius="sm" bg={occupiedBg} border="1px solid" borderColor="red.300" /><Text>Occupied</Text></HStack>
                      <HStack><Box w={3} h={3} borderRadius="sm" bg={inactiveBg} /><Text>Inactive</Text></HStack>
                    </HStack>
                    <SimpleGrid columns={{ base: 3, sm: 4, md: 6, lg: 8 }} spacing={3}>
                      {seatMapRows.map(row => (
                        <Tooltip key={row.seat_id} label={row.is_occupied ? row.member_name : (row.is_active ? 'Free' : 'Inactive')}>
                          <Box
                            onClick={() => handleSeatClick(row)}
                            cursor={row.is_active ? 'pointer' : 'not-allowed'}
                            bg={!row.is_active ? inactiveBg : row.is_occupied ? occupiedBg : freeBg}
                            border="1px solid"
                            borderColor={!row.is_active ? 'gray.300' : row.is_occupied ? 'red.300' : 'green.300'}
                            borderRadius="md"
                            p={3}
                            textAlign="center"
                            opacity={row.is_active ? 1 : 0.6}
                          >
                            <Text fontWeight="bold" fontSize="sm">{row.seat_number}</Text>
                            {row.section && <Text fontSize="2xs" color="gray.500" noOfLines={1}>{row.section}</Text>}
                            {row.is_occupied && <Text fontSize="2xs" noOfLines={1} mt={1}>{row.member_name}</Text>}
                          </Box>
                        </Tooltip>
                      ))}
                    </SimpleGrid>
                  </>
                )}
              </TabPanel>

              {/* Bookings */}
              <TabPanel px={0}>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={() => openNewBooking()} isDisabled={members.length === 0 || seats.length === 0 || shifts.length === 0}>
                    New Booking
                  </Button>
                </HStack>
                {(members.length === 0 || seats.length === 0 || shifts.length === 0) && (
                  <Text fontSize="sm" color="gray.400" mb={2}>Add at least one member, seat, and shift before creating a booking.</Text>
                )}
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Member</Th>
                        <Th>Seat</Th>
                        <Th>Shift</Th>
                        <Th>Dates</Th>
                        <Th isNumeric>Fee</Th>
                        <Th>Payment</Th>
                        <Th>Status</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {bookings.map(booking => (
                        <Tr key={booking.booking_id}>
                          <Td>{booking.member_name}</Td>
                          <Td>{booking.seat_number}</Td>
                          <Td>{booking.shift_name}</Td>
                          <Td whiteSpace="nowrap">{booking.start_date} &rarr; {booking.end_date}</Td>
                          <Td isNumeric>{booking.fee_amount != null ? booking.fee_amount.toFixed(2) : '-'}</Td>
                          <Td><Badge colorScheme={PAYMENT_COLORS[booking.payment_status] || 'gray'}>{booking.payment_status}</Badge></Td>
                          <Td><Badge colorScheme={BOOKING_STATUS_COLORS[booking.status] || 'gray'}>{booking.status}</Badge></Td>
                          <Td>
                            <HStack spacing={1}>
                              {booking.status === 'active' && (
                                <>
                                  <Tooltip label="Check in for today">
                                    <IconButton icon={<FiCheckCircle />} size="xs" variant="ghost" colorScheme="green" aria-label="Check in" onClick={() => handleCheckIn(booking.booking_id)} />
                                  </Tooltip>
                                  <Tooltip label="Mark absent for today">
                                    <IconButton icon={<FiXCircle />} size="xs" variant="ghost" colorScheme="orange" aria-label="Mark absent" onClick={() => handleMarkAbsent(booking.booking_id)} />
                                  </Tooltip>
                                </>
                              )}
                              <IconButton icon={<FiEdit2 />} size="xs" variant="ghost" aria-label="Edit booking" onClick={() => openEditBooking(booking)} />
                              {booking.status === 'active' && (
                                <Tooltip label="Cancel booking">
                                  <IconButton icon={<FiSlash />} size="xs" variant="ghost" colorScheme="red" aria-label="Cancel booking" onClick={() => handleCancelBooking(booking.booking_id)} />
                                </Tooltip>
                              )}
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {bookings.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No bookings yet.</Text>}
                </Box>
              </TabPanel>

              {/* Members */}
              <TabPanel px={0}>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={openNewMember}>
                    New Member
                  </Button>
                </HStack>
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Phone</Th>
                        <Th>Email</Th>
                        <Th>Joined</Th>
                        <Th>Status</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {members.map(member => (
                        <Tr key={member.member_id}>
                          <Td>{member.name}</Td>
                          <Td>{member.phone || '-'}</Td>
                          <Td>{member.email || '-'}</Td>
                          <Td>{member.joined_on}</Td>
                          <Td><Badge colorScheme={member.status === 'active' ? 'green' : 'gray'}>{member.status}</Badge></Td>
                          <Td>
                            <HStack spacing={1}>
                              <IconButton icon={<FiEdit2 />} size="xs" variant="ghost" aria-label="Edit member" onClick={() => openEditMember(member)} />
                              <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Delete member" onClick={() => handleDeleteMember(member.member_id)} />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {members.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No members yet.</Text>}
                </Box>
              </TabPanel>

              {/* Seats */}
              <TabPanel px={0}>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={openNewSeat}>
                    New Seat
                  </Button>
                </HStack>
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Seat</Th>
                        <Th>Section</Th>
                        <Th>Active</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {seats.map(seat => (
                        <Tr key={seat.seat_id}>
                          <Td>{seat.seat_number}</Td>
                          <Td>{seat.section || '-'}</Td>
                          <Td>
                            <Checkbox isChecked={seat.is_active} onChange={() => handleToggleSeatActive(seat)} />
                          </Td>
                          <Td>
                            <HStack spacing={1}>
                              <IconButton icon={<FiEdit2 />} size="xs" variant="ghost" aria-label="Edit seat" onClick={() => openEditSeat(seat)} />
                              <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Delete seat" onClick={() => handleDeleteSeat(seat.seat_id)} />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {seats.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No seats yet.</Text>}
                </Box>
              </TabPanel>

              {/* Shifts */}
              <TabPanel px={0}>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={openNewShift}>
                    New Shift
                  </Button>
                </HStack>
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Time</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {shifts.map(shift => (
                        <Tr key={shift.shift_id}>
                          <Td>{shift.name}</Td>
                          <Td>{shift.is_full_day ? <Badge colorScheme="purple">Full day</Badge> : `${shift.start_time || '-'} - ${shift.end_time || '-'}`}</Td>
                          <Td>
                            <HStack spacing={1}>
                              <IconButton icon={<FiEdit2 />} size="xs" variant="ghost" aria-label="Edit shift" onClick={() => openEditShift(shift)} />
                              <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Delete shift" onClick={() => handleDeleteShift(shift.shift_id)} />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {shifts.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No shifts yet.</Text>}
                </Box>
              </TabPanel>

              {/* Attendance */}
              <TabPanel px={0}>
                <HStack mb={3} spacing={3} flexWrap="wrap">
                  <Select size="sm" maxW="220px" placeholder="All members" value={attendanceMemberId} onChange={(e) => setAttendanceMemberId(e.target.value)}>
                    {members.map(m => <option key={m.member_id} value={m.member_id}>{m.name}</option>)}
                  </Select>
                  <Input size="sm" type="date" maxW="170px" value={attendanceFrom} onChange={(e) => setAttendanceFrom(e.target.value)} />
                  <Text fontSize="sm" color="gray.500">to</Text>
                  <Input size="sm" type="date" maxW="170px" value={attendanceTo} onChange={(e) => setAttendanceTo(e.target.value)} />
                </HStack>
                {attendanceLoading ? (
                  <Center py={10}><Spinner /></Center>
                ) : (
                  <Box overflowX="auto">
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>Date</Th>
                          <Th>Member</Th>
                          <Th>Status</Th>
                          <Th>Check In</Th>
                          <Th>Check Out</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {attendanceRows.map(row => (
                          <Tr key={row.attendance_id}>
                            <Td>{row.on_date}</Td>
                            <Td>{row.member_name}</Td>
                            <Td><Badge colorScheme={row.status === 'present' ? 'green' : 'red'}>{row.status}</Badge></Td>
                            <Td>{row.check_in_at ? new Date(row.check_in_at).toLocaleTimeString() : '-'}</Td>
                            <Td>{row.check_out_at ? new Date(row.check_out_at).toLocaleTimeString() : '-'}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                    {attendanceRows.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No attendance records for this range.</Text>}
                  </Box>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Box>

      {/* New/Edit Seat Modal */}
      <Modal isOpen={seatModal.isOpen} onClose={seatModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingSeat ? 'Edit Seat' : 'New Seat'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Seat Number</FormLabel>
                <Input size="sm" value={seatForm.seat_number} onChange={(e) => setSeatForm(f => ({ ...f, seat_number: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Section</FormLabel>
                <Input size="sm" placeholder="e.g. Silent Zone" value={seatForm.section} onChange={(e) => setSeatForm(f => ({ ...f, section: e.target.value }))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={seatModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleSaveSeat}>{editingSeat ? 'Save' : 'Create'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New/Edit Shift Modal */}
      <Modal isOpen={shiftModal.isOpen} onClose={shiftModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingShift ? 'Edit Shift' : 'New Shift'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Name</FormLabel>
                <Input size="sm" placeholder="e.g. Morning" value={shiftForm.name} onChange={(e) => setShiftForm(f => ({ ...f, name: e.target.value }))} />
              </FormControl>
              <FormControl>
                <Checkbox isChecked={shiftForm.is_full_day} onChange={(e) => setShiftForm(f => ({ ...f, is_full_day: e.target.checked }))}>
                  Full day / 24 hours (no fixed time range)
                </Checkbox>
              </FormControl>
              {!shiftForm.is_full_day && (
                <HStack w="100%">
                  <FormControl>
                    <FormLabel fontSize="sm">Start Time</FormLabel>
                    <Input size="sm" type="time" value={shiftForm.start_time} onChange={(e) => setShiftForm(f => ({ ...f, start_time: e.target.value }))} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">End Time</FormLabel>
                    <Input size="sm" type="time" value={shiftForm.end_time} onChange={(e) => setShiftForm(f => ({ ...f, end_time: e.target.value }))} />
                  </FormControl>
                </HStack>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={shiftModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleSaveShift}>{editingShift ? 'Save' : 'Create'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New/Edit Member Modal */}
      <Modal isOpen={memberModal.isOpen} onClose={memberModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingMember ? 'Edit Member' : 'New Member'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Name</FormLabel>
                <Input size="sm" value={memberForm.name} onChange={(e) => setMemberForm(f => ({ ...f, name: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Phone</FormLabel>
                <Input size="sm" value={memberForm.phone} onChange={(e) => setMemberForm(f => ({ ...f, phone: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Email</FormLabel>
                <Input size="sm" type="email" value={memberForm.email} onChange={(e) => setMemberForm(f => ({ ...f, email: e.target.value }))} />
              </FormControl>
              {!editingMember && (
                <FormControl>
                  <FormLabel fontSize="sm">Joined On</FormLabel>
                  <Input size="sm" type="date" value={memberForm.joined_on} onChange={(e) => setMemberForm(f => ({ ...f, joined_on: e.target.value }))} />
                </FormControl>
              )}
              {editingMember && (
                <FormControl>
                  <FormLabel fontSize="sm">Status</FormLabel>
                  <Select size="sm" value={memberForm.status} onChange={(e) => setMemberForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </FormControl>
              )}
              <FormControl>
                <FormLabel fontSize="sm">Notes</FormLabel>
                <Textarea size="sm" value={memberForm.notes} onChange={(e) => setMemberForm(f => ({ ...f, notes: e.target.value }))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={memberModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleSaveMember}>{editingMember ? 'Save' : 'Create'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New/Edit Booking Modal */}
      <Modal isOpen={bookingModal.isOpen} onClose={bookingModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingBooking ? 'Edit Booking' : 'New Booking'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired isDisabled={!!editingBooking}>
                <FormLabel fontSize="sm">Member</FormLabel>
                <Select size="sm" placeholder="Select member" value={bookingForm.member_id} onChange={(e) => setBookingForm(f => ({ ...f, member_id: e.target.value }))}>
                  {(editingBooking ? members : activeMembers).map(m => <option key={m.member_id} value={m.member_id}>{m.name}</option>)}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Seat</FormLabel>
                <Select size="sm" placeholder="Select seat" value={bookingForm.seat_id} onChange={(e) => setBookingForm(f => ({ ...f, seat_id: e.target.value }))}>
                  {activeSeats.map(s => <option key={s.seat_id} value={s.seat_id}>{s.seat_number}{s.section ? ` (${s.section})` : ''}</option>)}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Shift</FormLabel>
                <Select size="sm" placeholder="Select shift" value={bookingForm.shift_id} onChange={(e) => setBookingForm(f => ({ ...f, shift_id: e.target.value }))}>
                  {shifts.map(s => <option key={s.shift_id} value={s.shift_id}>{s.name}</option>)}
                </Select>
              </FormControl>
              <HStack w="100%">
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Start Date</FormLabel>
                  <Input size="sm" type="date" value={bookingForm.start_date} onChange={(e) => setBookingForm(f => ({ ...f, start_date: e.target.value }))} />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">End Date</FormLabel>
                  <Input size="sm" type="date" value={bookingForm.end_date} onChange={(e) => setBookingForm(f => ({ ...f, end_date: e.target.value }))} />
                </FormControl>
              </HStack>
              <HStack w="100%">
                <FormControl>
                  <FormLabel fontSize="sm">Fee Amount</FormLabel>
                  <NumberInput size="sm" value={bookingForm.fee_amount} onChange={(v) => setBookingForm(f => ({ ...f, fee_amount: v }))}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Payment</FormLabel>
                  <Select size="sm" value={bookingForm.payment_status} onChange={(e) => setBookingForm(f => ({ ...f, payment_status: e.target.value }))}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </Select>
                </FormControl>
              </HStack>
              {editingBooking && (
                <FormControl>
                  <FormLabel fontSize="sm">Status</FormLabel>
                  <Select size="sm" value={bookingForm.status} onChange={(e) => setBookingForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </Select>
                </FormControl>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={bookingModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleSaveBooking}>{editingBooking ? 'Save' : 'Create'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

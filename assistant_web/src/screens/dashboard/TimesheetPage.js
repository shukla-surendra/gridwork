import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, ButtonGroup, HStack, VStack, Text, Badge, Select, IconButton, Tooltip, Avatar, Progress,
  Table, Thead, Tbody, Tfoot, Tr, Th, Td, Menu, MenuButton, MenuList, MenuItem, MenuDivider,
  useColorModeValue, useDisclosure, useToast,
} from '@chakra-ui/react';
import { FiChevronLeft, FiChevronRight, FiClock, FiPlus } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import RouterLink from 'next/link';
import PageShell from '../../components/dashboard/PageShell';
import FeatureDisabledPage from '../../components/dashboard/FeatureDisabledPage';
import LogWorkModal from '../../components/timetracking/LogWorkModal';
import { selectIsModuleEnabled } from '../../slices/modules';
import TimeTrackingService from '../../services/TimeTrackingService';
import {
  addDays, formatDuration, formatHours, fromDateKey, startOfWeek, toDateKey,
} from '../../utils/duration';
import { browsePath } from '../../utils/issueLinks';

const TIME_OFF_LABELS = { vacation: 'Vacation', sick: 'Sick', holiday: 'Holiday', other: 'Off', away: 'Away' };

const weekLabel = (start) => {
  const end = addDays(start, 6);
  const fmt = (d, withYear) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });
  return `${fmt(start)} – ${fmt(end, true)}`;
};

// How a day's logged time compares to what the member was expected to
// log; past working days with nothing logged are flagged.
const dayTone = (day, today) => {
  if (!day.capacity_minutes) return day.logged_minutes ? 'blue' : null;
  if (day.logged_minutes >= day.capacity_minutes) return 'green';
  if (day.date < today) return day.logged_minutes ? 'orange' : 'red';
  return null;
};

function DayHeader({ dateKey, day, today, mutedColor }) {
  const date = fromDateKey(dateKey);
  return (
    <VStack spacing={0}>
      <Text fontWeight={dateKey === today ? 'bold' : 'semibold'} color={dateKey === today ? 'blue.500' : undefined}>
        {date.toLocaleDateString(undefined, { weekday: 'short' })}
      </Text>
      <Text fontSize="xs" color={mutedColor} textTransform="none">{date.getDate()}</Text>
      {day?.time_off && <Badge fontSize="2xs" colorScheme="purple" mt={1}>{TIME_OFF_LABELS[day.time_off]}</Badge>}
    </VStack>
  );
}

function MyTimesheet({ weekStart, members, canManage, currentUserId, initialUserId }) {
  const toast = useToast();
  const logModal = useDisclosure();
  const [userId, setUserId] = useState(initialUserId || currentUserId);
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalProps, setModalProps] = useState({});
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const cellHover = useColorModeValue('blue.50', 'whiteAlpha.100');
  const todayBg = useColorModeValue('blue.50', 'whiteAlpha.50');
  const today = toDateKey(new Date());
  const isMine = userId === currentUserId;
  const editable = isMine || canManage;

  useEffect(() => { setUserId(initialUserId || currentUserId); }, [initialUserId, currentUserId]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await TimeTrackingService.getTimesheet(toDateKey(weekStart), toDateKey(addDays(weekStart, 6)), userId);
      setSheet(res.data);
    } catch (err) {
      toast({ title: "Couldn't load the timesheet", description: err.response?.data?.detail, status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [weekStart, userId, toast]);

  useEffect(() => { load(); }, [load]);

  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => toDateKey(addDays(weekStart, i))), [weekStart]);
  const days = useMemo(() => Object.fromEntries((sheet?.days || []).map((d) => [d.date, d])), [sheet]);
  const rows = useMemo(() => {
    const byTask = {};
    (sheet?.worklogs || []).forEach((w) => {
      const row = byTask[w.task_id] || (byTask[w.task_id] = {
        task_id: w.task_id, ticket_key: w.ticket_key, title: w.task_title, status: w.task_status, cells: {}, total: 0,
      });
      (row.cells[w.work_date] = row.cells[w.work_date] || []).push(w);
      row.total += w.duration_minutes;
    });
    return Object.values(byTask).sort((a, b) => (a.ticket_key || '').localeCompare(b.ticket_key || '', undefined, { numeric: true }));
  }, [sheet]);

  const openLog = (props) => {
    setModalProps(props);
    logModal.onOpen();
  };
  const defaultDate = dates.includes(today) ? today : dates[0];
  const totalLogged = sheet?.total_logged_minutes || 0;
  const totalCapacity = sheet?.total_capacity_minutes || 0;

  return (
    <Box bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
      <HStack justify="space-between" mb={4} wrap="wrap" gap={3}>
        <HStack spacing={3}>
          {/* Other members' timesheets are admin-only (the API enforces it). */}
          {canManage && (
            <Select size="sm" w="220px" value={userId || ''} onChange={(e) => setUserId(e.target.value)} aria-label="Whose timesheet">
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.user_id === currentUserId ? `${m.name} (you)` : m.name}</option>)}
            </Select>
          )}
          <Box minW="200px">
            <HStack justify="space-between" fontSize="sm">
              <Text fontWeight="semibold">{formatDuration(totalLogged)} logged</Text>
              <Text color={mutedColor}>of {formatDuration(totalCapacity)} expected</Text>
            </HStack>
            <Progress mt={1} size="xs" borderRadius="full" value={totalCapacity ? (100 * totalLogged) / totalCapacity : 0}
              colorScheme={totalLogged >= totalCapacity ? 'green' : 'blue'} aria-label="Logged against expected" />
          </Box>
        </HStack>
        {editable && (
          <Button size="sm" colorScheme="blue" leftIcon={<FiPlus />} onClick={() => openLog({ initialDate: defaultDate })}>
            Log time
          </Button>
        )}
      </HStack>

      <Box overflowX="auto">
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th minW="260px">Issue</Th>
              {dates.map((d) => (
                <Th key={d} textAlign="center" bg={d === today ? todayBg : undefined} px={2}>
                  <DayHeader dateKey={d} day={days[d]} today={today} mutedColor={mutedColor} />
                </Th>
              ))}
              <Th isNumeric>Total</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.length === 0 && (
              <Tr>
                <Td colSpan={9} textAlign="center" py={10} color={mutedColor}>
                  {loading ? 'Loading…' : (
                    <VStack spacing={2}>
                      <Text>No time logged this week.</Text>
                      {editable && <Text fontSize="sm">Use <b>Log time</b>, or open an issue and log from its Time tracking section.</Text>}
                    </VStack>
                  )}
                </Td>
              </Tr>
            )}
            {rows.map((row) => (
              <Tr key={row.task_id}>
                <Td>
                  <HStack spacing={2} minW={0}>
                    <Badge as={RouterLink} href={browsePath(row.ticket_key)} colorScheme="blue" cursor="pointer">{row.ticket_key}</Badge>
                    <Text noOfLines={1} fontSize="sm" title={row.title}>{row.title}</Text>
                  </HStack>
                </Td>
                {dates.map((d) => {
                  const logs = row.cells[d] || [];
                  const minutes = logs.reduce((s, w) => s + w.duration_minutes, 0);
                  const issue = { task_id: row.task_id, ticket_key: row.ticket_key, title: row.title };
                  const cell = (
                    <Box textAlign="center" fontWeight={minutes ? 'semibold' : 'normal'} color={minutes ? undefined : mutedColor}>
                      {minutes ? formatHours(minutes) : (editable && d <= today ? '+' : '')}
                    </Box>
                  );
                  if (!editable || d > today) {
                    return <Td key={d} px={2} bg={d === today ? todayBg : undefined}>{cell}</Td>;
                  }
                  if (!logs.length) {
                    return (
                      <Td key={d} px={2} cursor="pointer" _hover={{ bg: cellHover }} bg={d === today ? todayBg : undefined}
                        onClick={() => openLog({ task: issue, initialDate: d })} aria-label={`Log time on ${row.ticket_key} for ${d}`}>
                        {cell}
                      </Td>
                    );
                  }
                  return (
                    <Td key={d} px={0} bg={d === today ? todayBg : undefined}>
                      <Menu placement="bottom" isLazy>
                        <MenuButton as={Box} w="100%" px={2} py={1} cursor="pointer" _hover={{ bg: cellHover }} borderRadius="md">
                          {cell}
                        </MenuButton>
                        <MenuList fontSize="sm">
                          {logs.map((w) => (
                            <MenuItem key={w.worklog_id} onClick={() => openLog({ worklog: w })}>
                              <Text as="span" fontWeight="semibold" mr={2}>{formatDuration(w.duration_minutes)}</Text>
                              <Text as="span" color={mutedColor} noOfLines={1}>{w.description || 'No description'}</Text>
                            </MenuItem>
                          ))}
                          <MenuDivider />
                          <MenuItem icon={<FiPlus />} onClick={() => openLog({ task: issue, initialDate: d })}>Log more time</MenuItem>
                        </MenuList>
                      </Menu>
                    </Td>
                  );
                })}
                <Td isNumeric fontWeight="semibold">{formatHours(row.total)}</Td>
              </Tr>
            ))}
          </Tbody>
          <Tfoot>
            <Tr>
              <Th>Logged</Th>
              {dates.map((d) => {
                const day = days[d];
                const tone = day && dayTone(day, today);
                return (
                  <Th key={d} textAlign="center" px={2} bg={d === today ? todayBg : undefined}>
                    <Text color={tone ? `${tone}.500` : mutedColor} fontSize="sm" textTransform="none">
                      {day?.logged_minutes ? formatHours(day.logged_minutes) : (tone === 'red' ? '0' : '–')}
                    </Text>
                  </Th>
                );
              })}
              <Th isNumeric fontSize="sm" textTransform="none">{formatHours(totalLogged) || '0'}</Th>
            </Tr>
            <Tr>
              <Th color={mutedColor}>Expected</Th>
              {dates.map((d) => (
                <Th key={d} textAlign="center" px={2} color={mutedColor} textTransform="none" bg={d === today ? todayBg : undefined}>
                  {days[d]?.capacity_minutes ? formatHours(days[d].capacity_minutes) : '–'}
                </Th>
              ))}
              <Th isNumeric color={mutedColor} textTransform="none">{formatHours(totalCapacity) || '0'}</Th>
            </Tr>
          </Tfoot>
        </Table>
      </Box>

      <LogWorkModal
        isOpen={logModal.isOpen}
        onClose={logModal.onClose}
        task={modalProps.task}
        worklog={modalProps.worklog}
        initialDate={modalProps.initialDate}
        userId={isMine ? undefined : userId}
        onSaved={load}
      />
    </Box>
  );
}

function TeamTimesheet({ weekStart, onOpenMember }) {
  const toast = useToast();
  const [team, setTeam] = useState(null);
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const rowHover = useColorModeValue('gray.50', 'whiteAlpha.50');
  const todayBg = useColorModeValue('blue.50', 'whiteAlpha.50');
  const today = toDateKey(new Date());

  useEffect(() => {
    TimeTrackingService.getTeamTimesheet(toDateKey(weekStart), toDateKey(addDays(weekStart, 6)))
      .then((res) => setTeam(res.data))
      .catch((err) => toast({ title: "Couldn't load the team timesheet", description: err.response?.data?.detail, status: 'error', duration: 3000 }));
  }, [weekStart, toast]);

  const dates = team?.days || [];
  const totals = (team?.members || []).reduce((acc, m) => ({
    logged: acc.logged + m.total_logged_minutes, capacity: acc.capacity + m.total_capacity_minutes,
  }), { logged: 0, capacity: 0 });

  return (
    <Box bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
      <Text fontSize="sm" color={mutedColor} mb={3}>
        Hours logged by each member against their workload scheme. Click a member to open their timesheet.
      </Text>
      <Box overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th minW="200px">Member</Th>
              {dates.map((d) => (
                <Th key={d} textAlign="center" px={2} bg={d === today ? todayBg : undefined}>
                  <DayHeader dateKey={d} today={today} mutedColor={mutedColor} />
                </Th>
              ))}
              <Th minW="160px">Week</Th>
            </Tr>
          </Thead>
          <Tbody>
            {(team?.members || []).map((m) => {
              const pct = m.total_capacity_minutes ? Math.round((100 * m.total_logged_minutes) / m.total_capacity_minutes) : null;
              return (
                <Tr key={m.user_id} cursor="pointer" _hover={{ bg: rowHover }} onClick={() => onOpenMember(m.user_id)}>
                  <Td>
                    <HStack>
                      <Avatar size="xs" name={m.name} src={m.avatar || undefined} />
                      <Text fontSize="sm" fontWeight="medium">{m.name}</Text>
                    </HStack>
                  </Td>
                  {m.days.map((day) => {
                    const tone = dayTone(day, today);
                    return (
                      <Td key={day.date} textAlign="center" px={2} bg={day.date === today ? todayBg : undefined}>
                        {day.time_off ? (
                          <Tooltip label={TIME_OFF_LABELS[day.time_off]}><Badge colorScheme="purple" fontSize="2xs">Off</Badge></Tooltip>
                        ) : (
                          <Tooltip label={`${formatDuration(day.logged_minutes)} of ${formatDuration(day.capacity_minutes)}`} isDisabled={!day.capacity_minutes && !day.logged_minutes}>
                            <Text fontSize="sm" fontWeight={day.logged_minutes ? 'semibold' : 'normal'} color={tone ? `${tone}.500` : mutedColor}>
                              {day.logged_minutes ? formatHours(day.logged_minutes) : (day.capacity_minutes && day.date < today ? '0' : '–')}
                            </Text>
                          </Tooltip>
                        )}
                      </Td>
                    );
                  })}
                  <Td>
                    <HStack justify="space-between" fontSize="xs">
                      <Text fontWeight="semibold">{formatHours(m.total_logged_minutes) || 0}h / {formatHours(m.total_capacity_minutes) || 0}h</Text>
                      {pct != null && <Text color={mutedColor}>{pct}%</Text>}
                    </HStack>
                    <Progress mt={1} size="xs" borderRadius="full" value={Math.min(pct || 0, 100)}
                      colorScheme={pct >= 100 ? 'green' : pct >= 75 ? 'blue' : 'orange'} aria-label={`${m.name} logged`} />
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
          <Tfoot>
            <Tr>
              <Th>Team</Th>
              {dates.map((d) => {
                const logged = (team?.members || []).reduce((s, m) => s + (m.days.find((x) => x.date === d)?.logged_minutes || 0), 0);
                return <Th key={d} textAlign="center" px={2} textTransform="none">{formatHours(logged) || '–'}</Th>;
              })}
              <Th textTransform="none">{formatHours(totals.logged) || 0}h / {formatHours(totals.capacity) || 0}h</Th>
            </Tr>
          </Tfoot>
        </Table>
      </Box>
    </Box>
  );
}

export default function TimesheetPage() {
  const enabled = useSelector((state) => selectIsModuleEnabled(state, 'time_tracking'));
  const currentUserId = useSelector((state) => state.auth.user?.user_id);
  const [view, setView] = useState('mine');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [members, setMembers] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [focusUser, setFocusUser] = useState(null);

  useEffect(() => {
    TimeTrackingService.getMemberSchemes()
      .then((res) => { setMembers(res.data.members || []); setCanManage(!!res.data.can_manage); })
      .catch(() => {});
  }, []);

  if (!enabled) return <FeatureDisabledPage featureName="Time tracking" />;

  const isThisWeek = toDateKey(weekStart) === toDateKey(startOfWeek(new Date()));
  const actions = (
    <>
      {canManage && (
        <ButtonGroup size="sm" isAttached variant="outline">
          <Button isActive={view === 'mine'} onClick={() => { setFocusUser(null); setView('mine'); }}>Timesheet</Button>
          <Button isActive={view === 'team'} onClick={() => setView('team')}>Team</Button>
        </ButtonGroup>
      )}
      <HStack spacing={1}>
        <IconButton size="sm" variant="ghost" icon={<FiChevronLeft />} aria-label="Previous week" onClick={() => setWeekStart((w) => addDays(w, -7))} />
        <Button size="sm" variant="outline" onClick={() => setWeekStart(startOfWeek(new Date()))} isDisabled={isThisWeek}>This week</Button>
        <IconButton size="sm" variant="ghost" icon={<FiChevronRight />} aria-label="Next week" onClick={() => setWeekStart((w) => addDays(w, 7))} />
        <Text fontSize="sm" fontWeight="medium" minW="170px" textAlign="center">{weekLabel(weekStart)}</Text>
      </HStack>
    </>
  );

  return (
    <PageShell title="Timesheets" icon={FiClock} actions={actions}>
      {view === 'mine' || !canManage ? (
        <MyTimesheet
          weekStart={weekStart}
          members={members}
          canManage={canManage}
          currentUserId={currentUserId}
          initialUserId={focusUser}
        />
      ) : (
        <TeamTimesheet weekStart={weekStart} onOpenMember={(id) => { setFocusUser(id); setView('mine'); }} />
      )}
    </PageShell>
  );
}

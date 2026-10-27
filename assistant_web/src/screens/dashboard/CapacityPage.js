import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, ButtonGroup, HStack, VStack, Text, Badge, Select, Avatar, Progress, Tooltip, IconButton,
  Table, Thead, Tbody, Tr, Th, Td, Input, NumberInput, NumberInputField, Collapse, SimpleGrid, Stat, StatLabel,
  StatNumber, StatHelpText, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, FormErrorMessage, Textarea, useColorModeValue, useDisclosure, useToast,
} from '@chakra-ui/react';
import { FiChevronDown, FiChevronRight, FiPlus, FiTrash2, FiUsers, FiAlertTriangle } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import RouterLink from 'next/link';
import PageShell from '../../components/dashboard/PageShell';
import FeatureDisabledPage from '../../components/dashboard/FeatureDisabledPage';
import { selectIsModuleEnabled } from '../../slices/modules';
import TimeTrackingService from '../../services/TimeTrackingService';
import { addDays, formatDuration, formatHours, fromDateKey, toDateKey } from '../../utils/duration';
import { browsePath } from '../../utils/issueLinks';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_OFF_KINDS = { vacation: 'Vacation', sick: 'Sick leave', holiday: 'Holiday', other: 'Other' };
const KIND_COLORS = { vacation: 'purple', sick: 'red', holiday: 'teal', other: 'gray', away: 'gray' };
// Teammates' absences come back as "away" unless you're an admin: the
// reason (sick leave especially) is private.
const KIND_LABELS = { ...TIME_OFF_KINDS, away: 'Away' };

const shortDate = (key) => fromDateKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const loadTone = (pct) => (pct == null ? 'red' : pct > 100 ? 'red' : pct >= 80 ? 'orange' : 'green');

// ---- Sprint workload ------------------------------------------------------------

function WorkloadRow({ row, mutedColor, rowBg, isUnassigned }) {
  const [open, setOpen] = useState(false);
  const pct = row.load_percent;
  const tone = isUnassigned ? 'gray' : loadTone(pct);
  const capacity = row.remaining_capacity_minutes || 0;
  return (
    <Box borderWidth="1px" borderRadius="md" p={3}>
      <HStack spacing={3} align="center" cursor={row.issues.length ? 'pointer' : 'default'} onClick={() => setOpen((v) => !v)}>
        <IconButton size="xs" variant="ghost" aria-label={open ? 'Hide issues' : 'Show issues'}
          icon={open ? <FiChevronDown /> : <FiChevronRight />} isDisabled={!row.issues.length} />
        {isUnassigned ? <Avatar size="sm" bg="gray.300" /> : <Avatar size="sm" name={row.name} src={row.avatar || undefined} />}
        <Box w={{ base: '120px', md: '180px' }} minW={0}>
          <Text fontWeight="medium" noOfLines={1}>{isUnassigned ? 'Unassigned' : row.name}</Text>
          <Text fontSize="xs" color={mutedColor}>
            {row.open_issue_count} open · {row.story_points} pts
          </Text>
        </Box>
        <Box flex={1}>
          {isUnassigned ? (
            <Text fontSize="sm" color={mutedColor}>{formatDuration(row.allocated_minutes)} of work nobody owns yet</Text>
          ) : (
            <>
              <HStack justify="space-between" fontSize="sm" mb={1}>
                <Text>
                  <b>{formatDuration(row.allocated_minutes)}</b> planned of {formatDuration(capacity)} available
                </Text>
                <Badge colorScheme={tone}>{pct == null ? 'No capacity' : `${pct}%`}</Badge>
              </HStack>
              <Progress value={Math.min(pct ?? 100, 100)} size="sm" borderRadius="full" colorScheme={tone}
                aria-label={`${row.name} sprint load`} />
            </>
          )}
          <HStack spacing={2} mt={1} wrap="wrap">
            {row.unestimated_count > 0 && (
              <Tooltip label="Open issues without an estimate aren't counted in the plan">
                <Badge colorScheme="yellow" variant="subtle"><HStack spacing={1}><FiAlertTriangle /><span>{row.unestimated_count} unestimated</span></HStack></Badge>
              </Tooltip>
            )}
            {(row.days_off || []).length > 0 && (
              <Badge colorScheme="purple" variant="subtle">
                {row.days_off.length} day{row.days_off.length > 1 ? 's' : ''} off: {row.days_off.map((d) => shortDate(d.date)).join(', ')}
              </Badge>
            )}
            {!isUnassigned && row.logged_minutes > 0 && (
              <Text fontSize="xs" color={mutedColor}>{formatDuration(row.logged_minutes)} logged on sprint issues</Text>
            )}
          </HStack>
        </Box>
      </HStack>
      <Collapse in={open} animateOpacity>
        <Table size="sm" mt={3}>
          <Thead>
            <Tr><Th>Issue</Th><Th>Status</Th><Th isNumeric>Logged</Th><Th isNumeric>Remaining</Th></Tr>
          </Thead>
          <Tbody>
            {row.issues.map((issue) => (
              <Tr key={issue.task_id} bg={issue.is_open ? undefined : rowBg} opacity={issue.is_open ? 1 : 0.7}>
                <Td>
                  <HStack>
                    {issue.ticket_key && <Badge as={RouterLink} href={browsePath(issue.ticket_key)} colorScheme="blue">{issue.ticket_key}</Badge>}
                    <Text fontSize="sm" noOfLines={1}>{issue.title}</Text>
                  </HStack>
                </Td>
                <Td><Badge variant="outline">{issue.status.replace('_', ' ')}</Badge></Td>
                <Td isNumeric>{formatDuration(issue.time_spent_minutes)}</Td>
                <Td isNumeric>
                  {issue.remaining_estimate_minutes == null
                    ? <Text as="span" color="yellow.600">No estimate</Text>
                    : formatDuration(issue.is_open ? issue.remaining_estimate_minutes : 0)}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Collapse>
    </Box>
  );
}

function SprintWorkload({ mutedColor, cardBg, borderColor }) {
  const toast = useToast();
  const [sprints, setSprints] = useState(null);
  const [sprintId, setSprintId] = useState('');
  const [load, setLoad] = useState(null);
  const rowBg = useColorModeValue('gray.50', 'whiteAlpha.50');

  useEffect(() => {
    TimeTrackingService.getOpenSprints().then((res) => {
      const list = res.data || [];
      setSprints(list);
      const active = list.find((s) => s.status === 'active') || list[0];
      if (active) setSprintId(active.sprint_id);
    }).catch(() => setSprints([]));
  }, []);

  useEffect(() => {
    if (!sprintId) return;
    setLoad(null);
    TimeTrackingService.getSprintWorkload(sprintId)
      .then((res) => setLoad(res.data))
      .catch((err) => toast({ title: "Couldn't load the sprint workload", description: err.response?.data?.detail, status: 'error', duration: 3500 }));
  }, [sprintId, toast]);

  if (sprints && sprints.length === 0) {
    return (
      <Box bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={10} textAlign="center">
        <Text fontWeight="medium">No active or planned sprints</Text>
        <Text fontSize="sm" color={mutedColor} mt={1}>Create a sprint on a board to plan its capacity here.</Text>
        <Button as={RouterLink} href="/boards" size="sm" mt={4}>Go to boards</Button>
      </Box>
    );
  }

  const totals = load?.totals;
  const teamPct = totals?.remaining_capacity_minutes ? Math.round((100 * totals.allocated_minutes) / totals.remaining_capacity_minutes) : null;
  const overloaded = (load?.members || []).filter((m) => m.load_percent == null ? m.allocated_minutes > 0 : m.load_percent > 100);

  return (
    <VStack align="stretch" spacing={4}>
      <Box bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
        <HStack justify="space-between" wrap="wrap" gap={3}>
          <HStack spacing={3}>
            <Select size="sm" w="280px" value={sprintId} onChange={(e) => setSprintId(e.target.value)} aria-label="Sprint">
              {(sprints || []).map((s) => (
                <option key={s.sprint_id} value={s.sprint_id}>{s.name} · {s.board_name}{s.status === 'active' ? ' (active)' : ''}</option>
              ))}
            </Select>
            {load?.sprint?.start_date && (
              <Text fontSize="sm" color={mutedColor}>
                {shortDate(load.sprint.start_date)} – {shortDate(load.sprint.end_date)} · {load.working_days_left} working days left
              </Text>
            )}
          </HStack>
          {load?.sprint?.board_id && (
            <Button as={RouterLink} href={`/boards/detail?boardId=${load.sprint.board_id}`} size="sm" variant="ghost">Open board</Button>
          )}
        </HStack>
        {load?.sprint?.goal && <Text fontSize="sm" mt={2}><b>Goal:</b> {load.sprint.goal}</Text>}
      </Box>

      {load && (
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <Stat bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
            <StatLabel>Planned work left</StatLabel>
            <StatNumber>{formatDuration(totals.allocated_minutes)}</StatNumber>
            <StatHelpText mb={0}>Remaining estimates of open issues</StatHelpText>
          </Stat>
          <Stat bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
            <StatLabel>Team capacity left</StatLabel>
            <StatNumber>{formatDuration(totals.remaining_capacity_minutes)}</StatNumber>
            <StatHelpText mb={0}>{teamPct != null ? `${teamPct}% allocated` : 'No working time left'}</StatHelpText>
          </Stat>
          <Stat bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
            <StatLabel>Over capacity</StatLabel>
            <StatNumber color={overloaded.length ? 'red.500' : 'green.500'}>{overloaded.length ? overloaded.length : 'None'}</StatNumber>
            <StatHelpText mb={0}>{overloaded.length ? overloaded.map((m) => m.name).join(', ') : 'Everyone fits in the sprint'}</StatHelpText>
          </Stat>
        </SimpleGrid>
      )}

      {load && (
        <Box bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
          <VStack align="stretch" spacing={3}>
            {load.members.map((m) => <WorkloadRow key={m.user_id} row={m} mutedColor={mutedColor} rowBg={rowBg} />)}
            {load.unassigned.issue_count > 0 && <WorkloadRow row={load.unassigned} mutedColor={mutedColor} rowBg={rowBg} isUnassigned />}
          </VStack>
          <Text fontSize="xs" color={mutedColor} mt={3}>
            Available time counts each member&apos;s working days from today to the sprint end, minus time off. Change hours in Workload schemes.
            {!load.can_view_all && ' Hours logged are shown for you only.'}
          </Text>
        </Box>
      )}
    </VStack>
  );
}

// ---- Workload schemes -----------------------------------------------------------

function SchemeRow({ member, canManage, onSaved }) {
  const toast = useToast();
  const [hours, setHours] = useState(String(member.minutes_per_day / 60));
  const [days, setDays] = useState(member.working_days);
  const [saving, setSaving] = useState(false);
  const minutes = Math.round(parseFloat(hours || '0') * 60);
  const valid = !Number.isNaN(minutes) && minutes >= 0 && minutes <= 1440;
  const dirty = minutes !== member.minutes_per_day || [...days].sort().join() !== [...member.working_days].sort().join();

  const toggleDay = (d) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  const save = async () => {
    setSaving(true);
    try {
      await TimeTrackingService.setMemberScheme(member.user_id, { minutes_per_day: minutes, working_days: days });
      toast({ title: `Saved ${member.name}'s schedule`, status: 'success', duration: 2000 });
      onSaved();
    } catch (err) {
      toast({ title: "Couldn't save", description: err.response?.data?.detail, status: 'error', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tr>
      <Td>
        <HStack>
          <Avatar size="xs" name={member.name} src={member.avatar || undefined} />
          <Text fontSize="sm" fontWeight="medium">{member.name}</Text>
          {member.is_default && <Badge variant="subtle" fontSize="2xs">default</Badge>}
        </HStack>
      </Td>
      <Td>
        {canManage ? (
          <NumberInput size="sm" w="90px" min={0} max={24} step={0.5} value={hours} onChange={setHours}>
            <NumberInputField aria-label={`${member.name} hours per day`} />
          </NumberInput>
        ) : <Text fontSize="sm">{formatDuration(member.minutes_per_day)}</Text>}
      </Td>
      <Td>
        <HStack spacing={1}>
          {WEEKDAYS.map((label, d) => (
            <Button key={label} size="xs" minW="38px" variant={days.includes(d) ? 'solid' : 'outline'}
              colorScheme={days.includes(d) ? 'blue' : 'gray'} onClick={() => canManage && toggleDay(d)}
              isDisabled={!canManage && !days.includes(d)} cursor={canManage ? 'pointer' : 'default'} aria-pressed={days.includes(d)}>
              {label}
            </Button>
          ))}
        </HStack>
      </Td>
      <Td isNumeric fontSize="sm">{valid ? `${formatHours(minutes * days.length) || 0}h` : '–'}</Td>
      <Td textAlign="right">
        {canManage && dirty && <Button size="xs" colorScheme="blue" onClick={save} isLoading={saving} isDisabled={!valid}>Save</Button>}
      </Td>
    </Tr>
  );
}

function WorkloadSchemes({ data, reload, mutedColor, cardBg, borderColor }) {
  return (
    <Box bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
      <Text fontSize="sm" color={mutedColor} mb={3}>
        How many hours each member is available for issue work, and on which days. This sets expected hours on timesheets and
        available time in sprint workload. {!data?.can_manage && 'Only workspace admins can change these.'}
      </Text>
      <Box overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr><Th>Member</Th><Th>Hours / day</Th><Th>Working days</Th><Th isNumeric>Per week</Th><Th /></Tr>
          </Thead>
          <Tbody>
            {(data?.members || []).map((m) => (
              <SchemeRow key={`${m.user_id}-${m.minutes_per_day}-${m.working_days.join()}`} member={m} canManage={data.can_manage} onSaved={reload} />
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

// ---- Time off -------------------------------------------------------------------

function TimeOffModal({ isOpen, onClose, members, canManage, currentUserId, onSaved }) {
  const toast = useToast();
  const today = toDateKey(new Date());
  const [form, setForm] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ user_id: currentUserId, start_date: today, end_date: today, kind: 'vacation', note: '' });
      setSubmitted(false);
    }
  }, [isOpen, currentUserId, today]);

  const set = (key, value) => setForm((prev) => {
    const next = { ...prev, [key]: value };
    if (key === 'user_id' && value === '') next.kind = 'holiday';
    if (key === 'start_date' && next.end_date < value) next.end_date = value;
    return next;
  });
  const rangeError = !form.start_date || !form.end_date ? 'Pick the dates' : (form.end_date < form.start_date ? 'End must be on or after start' : null);

  const save = async () => {
    setSubmitted(true);
    if (rangeError) return;
    setSaving(true);
    try {
      await TimeTrackingService.addTimeOff({ ...form, user_id: form.user_id || null });
      toast({ title: 'Time off added', status: 'success', duration: 2000 });
      onSaved();
      onClose();
    } catch (err) {
      toast({ title: "Couldn't add time off", description: err.response?.data?.detail, status: 'error', duration: 3500 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add time off</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>Who</FormLabel>
              <Select value={form.user_id ?? ''} onChange={(e) => set('user_id', e.target.value)} isDisabled={!canManage}>
                {members.filter((m) => canManage || m.user_id === currentUserId).map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.user_id === currentUserId ? `${m.name} (you)` : m.name}</option>
                ))}
                {canManage && <option value="">Everyone (company holiday)</option>}
              </Select>
            </FormControl>
            <FormControl isInvalid={submitted && !!rangeError}>
              <HStack align="flex-end">
                <Box flex={1}>
                  <FormLabel>From</FormLabel>
                  <Input type="date" value={form.start_date || ''} onChange={(e) => set('start_date', e.target.value)} />
                </Box>
                <Box flex={1}>
                  <FormLabel>To</FormLabel>
                  <Input type="date" value={form.end_date || ''} min={form.start_date} onChange={(e) => set('end_date', e.target.value)} />
                </Box>
              </HStack>
              <FormErrorMessage>{rangeError}</FormErrorMessage>
            </FormControl>
            <FormControl>
              <FormLabel>Type</FormLabel>
              <Select value={form.kind || 'vacation'} onChange={(e) => set('kind', e.target.value)}>
                {Object.entries(TIME_OFF_KINDS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Note</FormLabel>
              <Textarea rows={2} value={form.note || ''} onChange={(e) => set('note', e.target.value)} placeholder="Optional" />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={2} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={save} isLoading={saving}>Add</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function TimeOffList({ schemes, currentUserId, mutedColor, cardBg, borderColor }) {
  const toast = useToast();
  const modal = useDisclosure();
  const [entries, setEntries] = useState([]);
  const [showPast, setShowPast] = useState(false);
  const today = toDateKey(new Date());
  const canManage = !!schemes?.can_manage;

  const load = useCallback(() => {
    const now = new Date();
    TimeTrackingService.getTimeOff(toDateKey(addDays(now, -90)), toDateKey(addDays(now, 270)))
      .then((res) => setEntries(res.data || []))
      .catch(() => setEntries([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (entry) => {
    try {
      await TimeTrackingService.deleteTimeOff(entry.time_off_id);
      load();
    } catch (err) {
      toast({ title: "Couldn't remove it", description: err.response?.data?.detail, status: 'error', duration: 3000 });
    }
  };

  const visible = useMemo(() => entries.filter((e) => showPast || e.end_date >= today), [entries, showPast, today]);
  const workingDays = (e) => {
    let n = 0;
    for (let d = fromDateKey(e.start_date); toDateKey(d) <= e.end_date; d = addDays(d, 1)) if (d.getDay() % 6 !== 0) n += 1;
    return n;
  };

  return (
    <Box bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
      <HStack justify="space-between" mb={3}>
        <Button size="xs" variant="link" onClick={() => setShowPast((v) => !v)}>{showPast ? 'Hide past' : 'Show past'}</Button>
        <Button size="sm" colorScheme="blue" leftIcon={<FiPlus />} onClick={modal.onOpen}>Add time off</Button>
      </HStack>
      {visible.length === 0 ? (
        <Text textAlign="center" color={mutedColor} py={8}>No time off planned.</Text>
      ) : (
        <Table size="sm">
          <Thead><Tr><Th>Who</Th><Th>When</Th><Th>Type</Th><Th>Note</Th><Th /></Tr></Thead>
          <Tbody>
            {visible.map((e) => {
              const canDelete = canManage || e.user_id === currentUserId;
              const past = e.end_date < today;
              return (
                <Tr key={e.time_off_id} opacity={past ? 0.6 : 1}>
                  <Td>
                    <HStack>
                      {e.user_id ? <Avatar size="xs" name={e.user_name} /> : <FiUsers />}
                      <Text fontSize="sm" fontWeight="medium">{e.user_name}</Text>
                    </HStack>
                  </Td>
                  <Td fontSize="sm">
                    {e.start_date === e.end_date ? shortDate(e.start_date) : `${shortDate(e.start_date)} – ${shortDate(e.end_date)}`}
                    <Text as="span" color={mutedColor} ml={2}>({workingDays(e)} working day{workingDays(e) === 1 ? '' : 's'})</Text>
                  </Td>
                  <Td><Badge colorScheme={KIND_COLORS[e.kind]}>{KIND_LABELS[e.kind] || e.kind}</Badge></Td>
                  <Td fontSize="sm" color={mutedColor}>{e.note}</Td>
                  <Td textAlign="right">
                    {canDelete && <IconButton size="xs" variant="ghost" icon={<FiTrash2 />} aria-label="Remove time off" onClick={() => remove(e)} />}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}
      <TimeOffModal isOpen={modal.isOpen} onClose={modal.onClose} members={schemes?.members || []} canManage={canManage}
        currentUserId={currentUserId} onSaved={load} />
    </Box>
  );
}

// ---- Page -----------------------------------------------------------------------

export default function CapacityPage() {
  const enabled = useSelector((state) => selectIsModuleEnabled(state, 'time_tracking'));
  const currentUserId = useSelector((state) => state.auth.user?.user_id);
  const [tab, setTab] = useState('workload');
  const [schemes, setSchemes] = useState(null);
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  const loadSchemes = useCallback(() => {
    TimeTrackingService.getMemberSchemes().then((res) => setSchemes(res.data)).catch(() => {});
  }, []);
  useEffect(() => { loadSchemes(); }, [loadSchemes]);

  if (!enabled) return <FeatureDisabledPage featureName="Time tracking" />;

  const actions = (
    <ButtonGroup size="sm" isAttached variant="outline">
      <Button isActive={tab === 'workload'} onClick={() => setTab('workload')}>Sprint workload</Button>
      <Button isActive={tab === 'schemes'} onClick={() => setTab('schemes')}>Workload schemes</Button>
      <Button isActive={tab === 'timeoff'} onClick={() => setTab('timeoff')}>Time off</Button>
    </ButtonGroup>
  );
  const shared = { mutedColor, cardBg, borderColor };

  return (
    <PageShell title="Team capacity" icon={FiUsers} actions={actions}>
      {tab === 'workload' && <SprintWorkload {...shared} />}
      {tab === 'schemes' && <WorkloadSchemes data={schemes} reload={loadSchemes} {...shared} />}
      {tab === 'timeoff' && <TimeOffList schemes={schemes} currentUserId={currentUserId} {...shared} />}
    </PageShell>
  );
}

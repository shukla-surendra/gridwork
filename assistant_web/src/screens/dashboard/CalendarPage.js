import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
  Button,
  HStack,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  Switch,
  FormControl,
  FormLabel,
  Spinner,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";

// FullCalendar v6 injects its own styles at runtime -- no separate CSS import needed (v5 required one, which broke under Next.js's node_modules-global-CSS restriction).

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { FiCalendar, FiPlus, FiMapPin, FiUsers } from "react-icons/fi";
import { useSelector } from 'react-redux';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from "../../components/dashboard/Navbar";
import Header from "../../components/dashboard/Header";
import FeatureDisabledPage from "../../components/dashboard/FeatureDisabledPage";
import EventModal, { EVENT_COLORS } from "../../components/calendar/EventModal";
import { selectIsModuleEnabled } from "../../slices/modules";
import CalendarService from "../../services/CalendarService";
import TaskService from "../../services/taskservice";
import ReminderService from "../../services/ReminderService";
import { browsePath } from "../../utils/issueLinks";

const KINDS = {
  event: { label: 'Events', color: EVENT_COLORS[0] },
  focus: { label: 'My focus time', color: '#319795' },
  due: { label: 'Due dates', color: '#E53E3E' },
  reminder: { label: 'Reminders', color: '#DD6B20' },
  sprint: { label: 'Sprints', color: '#38A169' },
};

const dateOnly = (iso) => iso.slice(0, 10);
const addDay = (yyyyMmDd) => {
  const d = new Date(`${yyyyMmDd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

// FullCalendar event from one /calendar entry.
const toCalendarEvent = (entry) => {
  const base = { id: entry.id, title: entry.title, extendedProps: entry };
  switch (entry.kind) {
    case 'event':
    case 'focus': {
      const color = entry.color || KINDS[entry.kind].color;
      return { ...base, start: entry.start, end: entry.end, backgroundColor: color, borderColor: color, editable: true };
    }
    case 'due': {
      const color = entry.is_closed ? '#A0AEC0' : KINDS.due.color;
      return {
        ...base,
        title: entry.ticket_key ? `${entry.ticket_key} ${entry.title}` : entry.title,
        start: dateOnly(entry.start),
        allDay: true,
        backgroundColor: color,
        borderColor: color,
        startEditable: true,
        durationEditable: false,
        classNames: entry.is_closed ? ['gw-closed'] : [],
      };
    }
    case 'reminder':
      return { ...base, start: entry.start, backgroundColor: KINDS.reminder.color, borderColor: KINDS.reminder.color, startEditable: !entry.repeat, durationEditable: false };
    case 'sprint':
      return {
        ...base,
        start: dateOnly(entry.start),
        // FullCalendar's all-day end is exclusive; a sprint's end date is its last day.
        end: entry.end ? addDay(dateOnly(entry.end)) : undefined,
        allDay: true,
        backgroundColor: KINDS.sprint.color,
        borderColor: KINDS.sprint.color,
        editable: false,
      };
    default:
      return base;
  }
};

export default function CalendarPage() {
  const enabled = useSelector((state) => selectIsModuleEnabled(state, 'calendar'));
  const currentUserId = useSelector((state) => state.auth.user?.user_id);
  const router = useRouter();
  const toast = useToast();
  const modal = useDisclosure();
  const calendarRef = useRef(null);
  const rangeRef = useRef(null);

  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visibleKinds, setVisibleKinds] = useState(() => new Set(Object.keys(KINDS)));
  const [onlyMine, setOnlyMine] = useState(false);
  const [draft, setDraft] = useState(null);

  const bgColor = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const gridLine = useColorModeValue("#E2E8F0", "#2D3748");
  const todayBg = useColorModeValue("rgba(49,130,206,0.06)", "rgba(144,205,244,0.08)");

  const load = useCallback(async (range = rangeRef.current) => {
    if (!range) return;
    setLoading(true);
    try {
      const res = await CalendarService.getRange(range.start, range.end);
      setEntries(res.data || []);
    } catch (err) {
      toast({ title: "Couldn't load the calendar", description: err.response?.data?.detail, status: 'error', duration: 3500 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const events = useMemo(() => entries
    .filter((e) => visibleKinds.has(e.kind))
    .filter((e) => {
      if (!onlyMine) return true;
      if (e.kind === 'due') return e.assignee_id === currentUserId;
      if (e.kind === 'event') return e.owner_id === currentUserId || (e.attendees || []).includes(currentUserId);
      return true; // focus blocks and reminders are already yours; sprints are context
    })
    .map(toCalendarEvent), [entries, visibleKinds, onlyMine, currentUserId]);

  const toggleKind = (kind) => setVisibleKinds((prev) => {
    const next = new Set(prev);
    if (next.has(kind)) next.delete(kind); else next.add(kind);
    return next;
  });

  const openNew = (start, end) => {
    const s = start || (() => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d; })();
    const e = end || new Date(s.getTime() + 60 * 60 * 1000);
    setDraft({ kind: 'event', start: s, end: e, attendees: currentUserId ? [currentUserId] : [] });
    modal.onOpen();
  };

  const handleSelect = (info) => {
    let { start, end } = info;
    if (info.allDay) {
      // Month view selects whole days -- default to a 1h slot at 9:00 on the first one.
      start = new Date(start); start.setHours(9, 0, 0, 0);
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }
    info.view.calendar.unselect();
    openNew(start, end);
  };

  const handleEventClick = (info) => {
    const entry = info.event.extendedProps;
    switch (entry.kind) {
      case 'event':
      case 'focus':
        setDraft({
          kind: entry.kind,
          task_id: entry.task_id,
          title: entry.title,
          start: info.event.start,
          end: info.event.end,
          location: entry.location,
          description: entry.description,
          color: entry.color,
          attendees: entry.attendees,
          meta_data: { location: entry.location, color: entry.color },
        });
        modal.onOpen();
        break;
      case 'due':
        router.push(entry.ticket_key ? browsePath(entry.ticket_key) : `/tasks`);
        break;
      case 'reminder':
        router.push('/reminders');
        break;
      case 'sprint':
        router.push(`/boards/detail?boardId=${entry.board_id}`);
        break;
      default:
    }
  };

  // Drag or resize: persist the new time, or put the event back.
  const handleChange = async (info) => {
    const entry = info.event.extendedProps;
    const { start, end } = info.event;
    try {
      if (entry.kind === 'event' || entry.kind === 'focus') {
        await TaskService.update(entry.task_id, {
          start_time: start.toISOString(),
          end_time: (end || new Date(start.getTime() + 30 * 60 * 1000)).toISOString(),
        });
      } else if (entry.kind === 'due') {
        await TaskService.update(entry.task_id, { due_on: `${info.event.startStr.slice(0, 10)}T00:00:00Z` });
      } else if (entry.kind === 'reminder') {
        await ReminderService.update(entry.reminder_id, { due_date: start.toISOString() });
      } else {
        info.revert();
        return;
      }
      load();
    } catch (err) {
      info.revert();
      toast({ title: "Couldn't reschedule", description: err.response?.data?.detail || 'Please try again', status: 'error', duration: 3500 });
    }
  };

  const renderEventContent = (arg) => {
    const entry = arg.event.extendedProps;
    const isTimed = !arg.event.allDay && arg.view.type.startsWith('timeGrid');
    return (
      <Box px={1} overflow="hidden" lineHeight="short" w="full">
        <Text fontSize="xs" fontWeight="semibold" noOfLines={isTimed ? 2 : 1} color="white">
          {arg.timeText && !isTimed ? `${arg.timeText} ` : ''}{arg.event.title}
        </Text>
        {isTimed && arg.timeText && <Text fontSize="10px" color="whiteAlpha.900">{arg.timeText}</Text>}
        {isTimed && entry.kind === 'event' && (entry.location || entry.attendees?.length > 0) && (
          <HStack spacing={2} fontSize="10px" color="whiteAlpha.900">
            {entry.location && <HStack spacing={0.5}><FiMapPin /><Text noOfLines={1}>{entry.location}</Text></HStack>}
            {entry.attendees?.length > 0 && <HStack spacing={0.5}><FiUsers /><Text>{entry.attendees.length}</Text></HStack>}
          </HStack>
        )}
      </Box>
    );
  };

  if (!enabled) {
    return <FeatureDisabledPage featureName="Calendar" />;
  }

  return (
    <>
      <Head>
        <title>Calendar</title>
      </Head>

      <Box minH="100vh" bg={bgColor}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? "60px" : "250px" }} transition="all 0.3s ease" minH="100vh">
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Box p={{ base: 3, md: 4, lg: 5 }}>
            <Flex
              justify="space-between"
              align={{ base: 'stretch', lg: 'center' }}
              direction={{ base: 'column', lg: 'row' }}
              gap={3}
              bg={cardBg}
              p={4}
              mb={4}
              borderRadius="lg"
              borderWidth="1px"
              borderColor={borderColor}
            >
              <HStack spacing={3}>
                <FiCalendar size={22} />
                <Text fontSize="xl" fontWeight="bold">Calendar</Text>
                {loading && <Spinner size="sm" />}
              </HStack>
              <Flex gap={3} align="center" wrap="wrap">
                <Wrap spacing={2}>
                  {Object.entries(KINDS).map(([kind, meta]) => {
                    const on = visibleKinds.has(kind);
                    return (
                      <WrapItem key={kind}>
                        <Tag
                          size="md"
                          borderRadius="full"
                          cursor="pointer"
                          variant={on ? 'subtle' : 'outline'}
                          opacity={on ? 1 : 0.5}
                          onClick={() => toggleKind(kind)}
                          aria-pressed={on}
                        >
                          <Box w={2} h={2} borderRadius="full" bg={meta.color} mr={2} />
                          <TagLabel>{meta.label}</TagLabel>
                        </Tag>
                      </WrapItem>
                    );
                  })}
                </Wrap>
                <FormControl display="flex" alignItems="center" w="auto">
                  <FormLabel htmlFor="only-mine" mb={0} fontSize="sm">Only mine</FormLabel>
                  <Switch id="only-mine" size="sm" isChecked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
                </FormControl>
                <Button leftIcon={<FiPlus />} colorScheme="blue" size="sm" onClick={() => openNew()}>
                  New event
                </Button>
              </Flex>
            </Flex>

            <Box
              bg={cardBg}
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="lg"
              p={4}
              sx={{
                '--fc-border-color': gridLine,
                '--fc-today-bg-color': todayBg,
                '--fc-page-bg-color': 'transparent',
                '--fc-neutral-bg-color': 'transparent',
                '--fc-list-event-hover-bg-color': todayBg,
                '.fc .fc-button': { textTransform: 'capitalize' },
                '.fc-event': { cursor: 'pointer' },
                '.gw-closed': { opacity: 0.6, textDecoration: 'line-through' },
                '.fc-list-event .fc-list-event-title .chakra-text': { color: 'inherit' },
              }}
            >
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                }}
                buttonText={{ today: 'Today', month: 'Month', week: 'Week', day: 'Day', list: 'Agenda' }}
                events={events}
                datesSet={(arg) => {
                  rangeRef.current = { start: arg.start, end: arg.end };
                  load(rangeRef.current);
                }}
                selectable
                selectMirror
                select={handleSelect}
                eventClick={handleEventClick}
                eventDrop={handleChange}
                eventResize={handleChange}
                eventContent={renderEventContent}
                height={760}
                scrollTime="08:00:00"
                allDaySlot
                allDayText="All day"
                nowIndicator
                dayMaxEvents
                firstDay={1}
                eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
                slotLabelFormat={{ hour: 'numeric', meridiem: 'short' }}
                noEventsContent="Nothing scheduled"
              />
            </Box>
          </Box>
        </Box>
      </Box>

      <EventModal isOpen={modal.isOpen} onClose={modal.onClose} draft={draft} onSaved={() => load()} />
    </>
  );
}

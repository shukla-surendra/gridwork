import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  Input,
  InputGroup,
  InputLeftElement,
  Box,
  HStack,
  Text,
  Icon,
  Kbd,
  Spinner,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  FiSearch, FiCheckSquare, FiFileText, FiColumns, FiBook, FiHome, FiCalendar, FiBell,
  FiSettings, FiUsers, FiClock, FiBarChart2, FiArrowRight,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import TaskService from '../../services/taskservice';
import BoardService from '../../services/BoardService';
import PageService from '../../services/PageService';
import { browsePath } from '../../utils/issueLinks';

const NOTE_TYPES = ['note', 'quick_note'];

const GO_TO = [
  { label: 'Dashboard', href: '/dashboard', icon: FiHome },
  { label: 'Tasks', href: '/tasks', icon: FiCheckSquare },
  { label: 'Boards', href: '/boards', icon: FiColumns },
  { label: 'Notes', href: '/notes', icon: FiFileText },
  { label: 'Wiki', href: '/wiki', icon: FiBook },
  { label: 'Calendar', href: '/calendar', icon: FiCalendar },
  { label: 'Reminders', href: '/reminders', icon: FiClock },
  { label: 'Notifications', href: '/notifications', icon: FiBell },
  { label: 'Reports', href: '/reports', icon: FiBarChart2 },
  { label: 'Members', href: '/members', icon: FiUsers },
  { label: 'Settings', href: '/settings', icon: FiSettings },
];

const taskHref = (t) => {
  if (t.ticket_key) return browsePath(t.ticket_key);
  if (NOTE_TYPES.includes((t.task_type || '').toLowerCase())) return `/note-detail?id=${t.task_id}`;
  return `/page-detail?task_id=${t.task_id}`;
};

const matches = (text, q) => (text || '').toLowerCase().includes(q);

// Global "jump to anything" search (Cmd/Ctrl+K): issues by title or key,
// boards, wiki pages, and the app's own screens.
export default function CommandPalette({ isOpen, onClose }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState([]);
  const [boards, setBoards] = useState([]);
  const [pages, setPages] = useState([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);

  const activeBg = useColorModeValue('blue.50', 'whiteAlpha.200');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const sectionColor = useColorModeValue('gray.500', 'gray.500');

  // Boards and pages are few per workspace -- load once per open and filter locally.
  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setTasks([]);
    setActive(0);
    BoardService.getAll().then((res) => setBoards(res.data || [])).catch(() => setBoards([]));
    PageService.getAll().then((res) => setPages(res.data || [])).catch(() => setPages([]));
  }, [isOpen]);

  // Issues are searched server-side, debounced.
  useEffect(() => {
    const q = query.trim();
    if (!isOpen || q.length < 2) {
      setTasks([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      TaskService.search(q)
        .then((res) => { if (!cancelled) setTasks(res.data || []); })
        .catch(() => { if (!cancelled) setTasks([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, isOpen]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = [];
    if (q) {
      result.push({
        title: 'Issues & notes',
        items: tasks.map((t) => ({
          id: `t-${t.task_id}`,
          label: t.title || 'Untitled',
          hint: t.ticket_key,
          icon: NOTE_TYPES.includes((t.task_type || '').toLowerCase()) ? FiFileText : FiCheckSquare,
          href: taskHref(t),
        })),
      });
      result.push({
        title: 'Boards',
        items: boards.filter((b) => matches(b.name, q) || matches(b.key, q)).slice(0, 5).map((b) => ({
          id: `b-${b.board_id}`, label: b.name, hint: b.key, icon: FiColumns, href: `/boards/detail?boardId=${b.board_id}`,
        })),
      });
      result.push({
        title: 'Wiki',
        items: pages.filter((p) => matches(p.title, q)).slice(0, 5).map((p) => ({
          id: `p-${p.page_id}`, label: p.title || 'Untitled', icon: FiBook, href: `/wiki/detail?pageId=${p.page_id}`,
        })),
      });
    }
    result.push({
      title: 'Go to',
      items: GO_TO.filter((g) => !q || matches(g.label, q)).map((g) => ({ id: `g-${g.href}`, ...g })),
    });
    return result.filter((s) => s.items.length);
  }, [query, tasks, boards, pages]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => { setActive(0); }, [query]);

  const go = (item) => {
    if (!item) return;
    onClose();
    router.push(item.href);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(flat[active]);
    }
  };

  let index = -1;
  return (
    <Modal isOpen={isOpen} onClose={onClose} initialFocusRef={inputRef} size="xl" motionPreset="slideInTop">
      <ModalOverlay />
      <ModalContent mt="12vh" overflow="hidden">
        <InputGroup size="lg">
          <InputLeftElement pointerEvents="none">
            {searching ? <Spinner size="sm" /> : <Icon as={FiSearch} color={mutedColor} />}
          </InputLeftElement>
          <Input
            ref={inputRef}
            variant="unstyled"
            pl={12}
            pr={4}
            h={14}
            placeholder="Search issues, keys (e.g. ENG-42), boards, pages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </InputGroup>
        <Divider />
        <Box maxH="50vh" overflowY="auto" py={2}>
          {query.trim().length >= 2 && !searching && flat.length === 0 && (
            <Text px={4} py={6} textAlign="center" color={mutedColor}>No results for “{query.trim()}”</Text>
          )}
          {sections.map((section) => (
            <Box key={section.title} mb={1}>
              <Text px={4} pt={2} pb={1} fontSize="xs" fontWeight="semibold" textTransform="uppercase" color={sectionColor}>
                {section.title}
              </Text>
              {section.items.map((item) => {
                index += 1;
                const i = index;
                return (
                  <HStack
                    key={item.id}
                    px={4}
                    py={2}
                    spacing={3}
                    cursor="pointer"
                    bg={i === active ? activeBg : 'transparent'}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(item)}
                  >
                    <Icon as={item.icon} color={mutedColor} />
                    <Text flex="1" noOfLines={1}>{item.label}</Text>
                    {item.hint && <Text fontSize="xs" fontFamily="mono" color={mutedColor}>{item.hint}</Text>}
                    {i === active && <Icon as={FiArrowRight} color={mutedColor} />}
                  </HStack>
                );
              })}
            </Box>
          ))}
        </Box>
        <Divider />
        <HStack px={4} py={2} spacing={4} fontSize="xs" color={mutedColor}>
          <HStack spacing={1}><Kbd>↑</Kbd><Kbd>↓</Kbd><Text>navigate</Text></HStack>
          <HStack spacing={1}><Kbd>↵</Kbd><Text>open</Text></HStack>
          <HStack spacing={1}><Kbd>esc</Kbd><Text>close</Text></HStack>
        </HStack>
      </ModalContent>
    </Modal>
  );
}

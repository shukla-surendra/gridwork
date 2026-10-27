import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar, Badge, Box, Button, Checkbox, Divider, Flex, HStack, Icon, IconButton, Input,
  InputGroup, InputRightElement, Link, Menu, MenuButton, MenuDivider, MenuItem, MenuList,
  Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Popover,
  PopoverArrow, PopoverBody, PopoverContent, PopoverTrigger, Portal, Progress, Select,
  Spinner, Tab, TabList, TabPanel, TabPanels, Tabs, Tag, TagCloseButton, TagLabel, Text,
  Tooltip, VStack, Wrap, useColorModeValue, useDisclosure, useToast,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import {
  FiChevronRight, FiExternalLink, FiLink, FiMoreHorizontal, FiPlus, FiTrash2, FiX,
} from 'react-icons/fi';
import { updateTask } from '../../slices/tasks';
import { selectIsModuleEnabled } from '../../slices/modules';
import RichTextEditor from '../dashboard/editor/RichTextEditor';
import TimeTrackingSection from '../timetracking/TimeTrackingSection';
import IssueComments from './IssueComments';
import IssueHistory from './IssueHistory';
import TaskDataService from '../../services/taskservice';
import TaskLinkService from '../../services/TaskLinkService';
import EpicService from '../../services/EpicService';
import SprintService from '../../services/SprintService';
import MemberService from '../../services/MemberService';
import ConfigService from '../../utils/config';
import { fullDateTime, relativeTime } from '../../utils/locale';
import { ISSUE_TYPES, PRIORITY_ICONS, issueTypeOf, withIssueType } from '../../utils/issueTypes';
import { browsePath, browseUrl } from '../../utils/issueLinks';
import { getStatusColor, labelForStatus } from '../../utils/taskStatus';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['urgent', 'high', 'medium', 'low'];
// Fibonacci-ish relative sizes, the usual agile estimation scale.
const STORY_POINT_OPTIONS = [1, 2, 3, 5, 8, 13, 21];
const LINK_TYPE_LABELS = { blocks: 'Blocks', relates_to: 'Relates to', duplicates: 'Duplicates', clones: 'Clones' };

// Fields saved by "Save changes"; everything else (comments, worklogs,
// subtasks, links, estimates) saves the moment it's made.
const EDITABLE_FIELDS = ['title', 'description', 'status', 'priority', 'due_on', 'story_points', 'epic_id',
  'sprint_id', 'assignee_id', 'labels', 'checklist', 'meta_data'];

const snapshotOf = (task) => JSON.stringify(EDITABLE_FIELDS.map((field) => {
  let value = task?.[field];
  if (value === '' || value === undefined || (field === 'description' && value === '<p></p>')) value = null;
  if (field === 'priority' && value) value = value.toLowerCase();
  if (field === 'due_on' && value) value = String(value).slice(0, 16);
  return value;
}));

const capitalize = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : '');

function Section({ title, count, action, children }) {
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  return (
    <Box>
      <HStack justify="space-between" mb={2}>
        <Text fontSize="sm" fontWeight="semibold">
          {title}
          {count != null && <Text as="span" color={mutedColor} fontWeight="normal" ml={2}>{count}</Text>}
        </Text>
        {action}
      </HStack>
      {children}
    </Box>
  );
}

function DetailRow({ label, children }) {
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  return (
    <Flex align="center" minH="32px" gap={3}>
      <Text fontSize="sm" color={mutedColor} w="100px" flexShrink={0}>{label}</Text>
      <Box flex={1} minW={0}>{children}</Box>
    </Flex>
  );
}

// The full issue: content and activity on the left,
// details on the right. Used in a modal on boards and lists, and as the
// whole page at /page-detail.
export default function IssueView({ task, setTask, onSaved, onClose, onDeleted, isPage = false }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const currentUserId = useSelector((state) => state.auth.user?.user_id);
  const linksEnabled = useSelector((state) => selectIsModuleEnabled(state, 'task_links'));
  const epicsEnabled = useSelector((state) => selectIsModuleEnabled(state, 'epics'));
  const sprintsEnabled = useSelector((state) => selectIsModuleEnabled(state, 'sprints'));
  const commentsEnabled = useSelector((state) => selectIsModuleEnabled(state, 'comments'));
  const timeTrackingEnabled = useSelector((state) => selectIsModuleEnabled(state, 'time_tracking'));
  const deleteDialog = useDisclosure();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null); // snapshot of the last loaded/saved state
  const [members, setMembers] = useState([]);
  const [epics, setEpics] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [links, setLinks] = useState([]);
  const [linkable, setLinkable] = useState([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkType, setLinkType] = useState('relates_to');
  const [linkTarget, setLinkTarget] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [commentCount, setCommentCount] = useState(null);

  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const panelBg = useColorModeValue('white', 'gray.800');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const taskId = task?.task_id;
  const boardId = task?.board_id;
  const dirty = saved !== null && snapshotOf(task) !== saved;
  const type = ISSUE_TYPES[issueTypeOf(task)];
  const epic = epics.find((e) => e.epic_id === task?.epic_id);
  const imported = task?.meta_data?.imported;
  const me = members.find((m) => m.user_id === currentUserId);
  const canModerate = ['owner', 'admin'].includes(me?.role);
  const assignee = members.find((m) => m.user_id === task?.assignee_id);
  const reporter = task?.reporter
    ? `${task.reporter.first_name || ''} ${task.reporter.last_name || ''}`.trim()
    : members.find((m) => m.user_id === task?.reporter_id)?.name;

  const set = (changes) => setTask((prev) => ({ ...prev, ...changes }));

  // Load the latest copy of the issue whenever a different one is shown.
  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    setLoading(true);
    setSaved(null);
    TaskDataService.get(taskId)
      .then((res) => {
        if (cancelled || !res?.data) return;
        setTask(res.data);
        setSaved(snapshotOf(res.data));
      })
      .catch(() => toast({ title: "Couldn't load the issue", status: 'error', duration: 3000 }))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  useEffect(() => {
    try {
      MemberService.getMembers(ConfigService.getDefaultWorkspace().workspace_id)
        .then((res) => setMembers(res.data || []))
        .catch(() => setMembers([]));
    } catch {
      setMembers([]);
    }
  }, []);

  useEffect(() => {
    setEpics([]);
    setSprints([]);
    if (!boardId) return;
    if (epicsEnabled) EpicService.getAll(boardId).then((res) => setEpics(res.data || [])).catch(() => {});
    if (sprintsEnabled) SprintService.getAll(boardId).then((res) => setSprints(res.data || [])).catch(() => {});
  }, [boardId, epicsEnabled, sprintsEnabled]);

  const loadLinks = useCallback(() => {
    if (!taskId || !linksEnabled) return setLinks([]);
    TaskLinkService.getAll(taskId).then((res) => setLinks(res.data || [])).catch(() => setLinks([]));
  }, [taskId, linksEnabled]);
  useEffect(() => { loadLinks(); }, [loadLinks]);

  const save = async () => {
    setSaving(true);
    try {
      // null means "leave unchanged" to the API; "" clears the assignee.
      await dispatch(updateTask({ task_id: taskId, data: { ...task, assignee_id: task.assignee_id || '' } })).unwrap();
      setSaved(snapshotOf(task));
      toast({ title: 'Changes saved', status: 'success', duration: 1500 });
      onSaved?.(task);
    } catch {
      toast({ title: "Couldn't save your changes", status: 'error', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setLoading(true);
    TaskDataService.get(taskId)
      .then((res) => { setTask(res.data); setSaved(snapshotOf(res.data)); })
      .finally(() => setLoading(false));
  };

  const requestClose = () => {
    if (dirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    onClose?.();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(browseUrl(task.ticket_key));
      toast({ title: `Link to ${task.ticket_key} copied`, status: 'success', duration: 1500 });
    } catch {
      toast({ title: "Couldn't copy the link", status: 'error', duration: 2500 });
    }
  };

  const deleteIssue = async () => {
    try {
      await TaskDataService.remove(taskId);
      deleteDialog.onClose();
      toast({ title: `${task.ticket_key || 'Issue'} deleted`, status: 'success', duration: 2000 });
      onDeleted?.(task);
      onClose?.();
    } catch (err) {
      deleteDialog.onClose();
      toast({ title: "Couldn't delete the issue", description: err.response?.data?.detail, status: 'error', duration: 3000 });
    }
  };

  // ---- Saved-immediately parts: subtasks and links ----

  const addSubtask = async () => {
    if (!newSubtask.trim()) return;
    try {
      const res = await TaskDataService.create({ title: newSubtask.trim(), parent_task_id: taskId, board_id: boardId });
      setTask((prev) => ({ ...prev, subtasks: [...(prev.subtasks || []), res.data] }));
      setNewSubtask('');
    } catch {
      toast({ title: "Couldn't add the subtask", status: 'error', duration: 3000 });
    }
  };

  const toggleSubtask = async (subtask) => {
    const completed = !subtask.completed;
    const statusValue = completed ? 'done' : 'todo';
    try {
      await TaskDataService.update(subtask.task_id, { completed, status: statusValue });
      setTask((prev) => ({
        ...prev,
        subtasks: prev.subtasks.map((s) => (s.task_id === subtask.task_id ? { ...s, completed, status: statusValue } : s)),
      }));
    } catch {
      toast({ title: "Couldn't update the subtask", status: 'error', duration: 3000 });
    }
  };

  const openLinkPicker = () => {
    setLinkOpen(true);
    if (!linkable.length) TaskDataService.getAllForLinking().then((res) => setLinkable(res.data || [])).catch(() => {});
  };

  const addLink = async () => {
    if (!linkTarget) return;
    try {
      const res = await TaskLinkService.create(taskId, { target_task_id: linkTarget, link_type: linkType });
      setLinks((prev) => [...prev, res.data]);
      setLinkTarget('');
      setLinkOpen(false);
    } catch (err) {
      toast({ title: "Couldn't link the issue", description: err.response?.data?.detail, status: 'error', duration: 3000 });
    }
  };

  const removeLink = async (linkId) => {
    try {
      await TaskLinkService.remove(taskId, linkId);
      setLinks((prev) => prev.filter((l) => l.link_id !== linkId));
    } catch {
      toast({ title: "Couldn't remove the link", status: 'error', duration: 3000 });
    }
  };

  // ---- Edited-then-saved parts ----

  const addLabel = () => {
    const label = newLabel.trim();
    if (label && !(task.labels || []).includes(label)) set({ labels: [...(task.labels || []), label] });
    setNewLabel('');
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    set({ checklist: [...(task.checklist || []), { id: `${Date.now()}`, text: newChecklistItem.trim(), done: false }] });
    setNewChecklistItem('');
  };

  const linkGroups = useMemo(() => {
    const groups = {};
    links.forEach((link) => { (groups[link.display_label] = groups[link.display_label] || []).push(link); });
    return groups;
  }, [links]);

  if (!task) return null;

  const subtasks = task.subtasks || [];
  const checklist = task.checklist || [];
  const doneSubtasks = subtasks.filter((s) => s.completed).length;
  const doneChecklist = checklist.filter((i) => i.done).length;

  const header = (
    <Flex align="center" justify="space-between" gap={3} px={6} py={3} borderBottomWidth="1px" borderColor={borderColor}>
      <HStack spacing={1.5} fontSize="sm" color={mutedColor} minW={0}>
        {epic && (
          <>
            <Box w="10px" h="10px" borderRadius="sm" bg={epic.color} flexShrink={0} />
            <Text noOfLines={1} maxW="220px">{epic.title}</Text>
            <Icon as={FiChevronRight} />
          </>
        )}
        <Icon as={type.icon} color={type.color} />
        {task.ticket_key ? (
          <Link as={NextLink} href={browsePath(task.ticket_key)} fontWeight="semibold">{task.ticket_key}</Link>
        ) : (
          <Text>{type.label}</Text>
        )}
        {loading && <Spinner size="xs" ml={2} />}
      </HStack>
      <HStack spacing={1}>
        {task.ticket_key && (
          <Tooltip label="Copy link">
            <IconButton size="sm" variant="ghost" icon={<FiLink />} aria-label="Copy link to issue" onClick={copyLink} />
          </Tooltip>
        )}
        {!isPage && (
          <Tooltip label="Open as a page">
            <IconButton as={NextLink} href={`/page-detail?task_id=${taskId}`} size="sm" variant="ghost"
              icon={<FiExternalLink />} aria-label="Open issue as a page" />
          </Tooltip>
        )}
        <Menu placement="bottom-end">
          <MenuButton as={IconButton} size="sm" variant="ghost" icon={<FiMoreHorizontal />} aria-label="More actions" />
          <MenuList fontSize="sm">
            <MenuItem onClick={copyLink} isDisabled={!task.ticket_key}>Copy link</MenuItem>
            <MenuItem onClick={() => set({ status: 'done', completed: true })} isDisabled={task.status === 'done'}>Mark as done</MenuItem>
            <MenuDivider />
            <MenuItem color="red.500" icon={<FiTrash2 />} onClick={deleteDialog.onOpen}>Delete issue</MenuItem>
          </MenuList>
        </Menu>
        {!isPage && <IconButton size="sm" variant="ghost" icon={<FiX />} aria-label="Close" onClick={requestClose} />}
      </HStack>
    </Flex>
  );

  const main = (
    <VStack align="stretch" spacing={7} flex={1} minW={0}>
      <Input
        value={task.title || ''}
        onChange={(e) => set({ title: e.target.value })}
        aria-label="Summary"
        fontSize="2xl"
        fontWeight="semibold"
        variant="unstyled"
        px={2}
        mx={-2}
        py={1}
        borderRadius="md"
        _hover={{ bg: hoverBg }}
        _focus={{ bg: 'transparent', boxShadow: 'outline' }}
      />

      <Section title="Description">
        <RichTextEditor value={task.description || ''} onChange={(html) => set({ description: html })} />
      </Section>

      {!task.parent_task_id && (
        <Section title="Subtasks" count={subtasks.length ? `${doneSubtasks} of ${subtasks.length} done` : null}>
          {subtasks.length > 0 && <Progress value={(100 * doneSubtasks) / subtasks.length} size="xs" colorScheme="green" borderRadius="full" mb={2} />}
          <Box borderWidth={subtasks.length ? '1px' : 0} borderColor={borderColor} borderRadius="md">
            {subtasks.map((s, i) => (
              <HStack key={s.task_id} px={3} py={2} spacing={3} borderTopWidth={i ? '1px' : 0} borderColor={borderColor}>
                <Checkbox isChecked={s.completed} onChange={() => toggleSubtask(s)} aria-label={`Mark ${s.title} done`} />
                <Text fontSize="sm" flex={1} noOfLines={1} textDecoration={s.completed ? 'line-through' : 'none'} color={s.completed ? mutedColor : undefined}>
                  {s.title}
                </Text>
                <Badge colorScheme={getStatusColor(s.status)} fontSize="2xs">{labelForStatus(s.status)}</Badge>
              </HStack>
            ))}
          </Box>
          <InputGroup size="sm" mt={2}>
            <Input placeholder="Add a subtask" value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addSubtask(); }} />
            <InputRightElement width="4rem">
              <Button h="1.6rem" size="xs" onClick={addSubtask} isDisabled={!newSubtask.trim()}>Add</Button>
            </InputRightElement>
          </InputGroup>
        </Section>
      )}

      <Section title="Checklist" count={checklist.length ? `${doneChecklist} of ${checklist.length}` : null}>
        <VStack align="stretch" spacing={1}>
          {checklist.map((item) => (
            <HStack key={item.id} justify="space-between" role="group">
              <Checkbox
                isChecked={item.done}
                onChange={() => set({ checklist: checklist.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)) })}
              >
                <Text fontSize="sm" textDecoration={item.done ? 'line-through' : 'none'} color={item.done ? mutedColor : undefined}>{item.text}</Text>
              </Checkbox>
              <IconButton size="xs" variant="ghost" icon={<FiX />} aria-label="Remove checklist item" opacity={0.6}
                onClick={() => set({ checklist: checklist.filter((i) => i.id !== item.id) })} />
            </HStack>
          ))}
        </VStack>
        <InputGroup size="sm" mt={2}>
          <Input placeholder="Add an item" value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addChecklistItem(); }} />
          <InputRightElement width="4rem">
            <Button h="1.6rem" size="xs" onClick={addChecklistItem} isDisabled={!newChecklistItem.trim()}>Add</Button>
          </InputRightElement>
        </InputGroup>
      </Section>

      {linksEnabled && (
        <Section
          title="Linked issues"
          count={links.length || null}
          action={(
            <Popover isOpen={linkOpen} onClose={() => setLinkOpen(false)} placement="bottom-end">
              <PopoverTrigger>
                <Button size="xs" variant="ghost" leftIcon={<FiPlus />} onClick={openLinkPicker}>Link issue</Button>
              </PopoverTrigger>
              <Portal>
                <PopoverContent w="320px">
                  <PopoverArrow />
                  <PopoverBody>
                    <VStack align="stretch" spacing={2}>
                      <Select size="sm" value={linkType} onChange={(e) => setLinkType(e.target.value)} aria-label="Link type">
                        {Object.entries(LINK_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </Select>
                      <Select size="sm" placeholder="Choose an issue" value={linkTarget} onChange={(e) => setLinkTarget(e.target.value)} aria-label="Issue to link">
                        {linkable.filter((t) => t.task_id !== taskId).map((t) => (
                          <option key={t.task_id} value={t.task_id}>{t.ticket_key ? `${t.ticket_key} ${t.title}` : t.title}</option>
                        ))}
                      </Select>
                      <HStack justify="flex-end">
                        <Button size="sm" variant="ghost" onClick={() => setLinkOpen(false)}>Cancel</Button>
                        <Button size="sm" colorScheme="blue" onClick={addLink} isDisabled={!linkTarget}>Link</Button>
                      </HStack>
                    </VStack>
                  </PopoverBody>
                </PopoverContent>
              </Portal>
            </Popover>
          )}
        >
          {links.length === 0 ? (
            <Text fontSize="sm" color={mutedColor}>No linked issues.</Text>
          ) : (
            <VStack align="stretch" spacing={3}>
              {Object.entries(linkGroups).map(([label, group]) => (
                <Box key={label}>
                  <Text fontSize="xs" color={mutedColor} mb={1}>{capitalize(label.replace(/_/g, ' '))}</Text>
                  <Box borderWidth="1px" borderColor={borderColor} borderRadius="md">
                    {group.map((link, i) => (
                      <HStack key={link.link_id} px={3} py={2} spacing={3} borderTopWidth={i ? '1px' : 0} borderColor={borderColor}>
                        {link.related_task.ticket_key && (
                          <Link as={NextLink} href={browsePath(link.related_task.ticket_key)} fontSize="sm" color={mutedColor} whiteSpace="nowrap">
                            {link.related_task.ticket_key}
                          </Link>
                        )}
                        <Text fontSize="sm" flex={1} noOfLines={1}>{link.related_task.title}</Text>
                        <Badge colorScheme={getStatusColor(link.related_task.status)} fontSize="2xs">{labelForStatus(link.related_task.status)}</Badge>
                        <IconButton size="xs" variant="ghost" icon={<FiX />} aria-label="Remove link" onClick={() => removeLink(link.link_id)} />
                      </HStack>
                    ))}
                  </Box>
                </Box>
              ))}
            </VStack>
          )}
        </Section>
      )}

      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={1}>Activity</Text>
        <Tabs size="sm" variant="line" colorScheme="blue" isLazy>
          <TabList>
            {commentsEnabled && <Tab>Comments{commentCount ? ` (${commentCount})` : ''}</Tab>}
            <Tab>History</Tab>
          </TabList>
          <TabPanels>
            {commentsEnabled && (
              <TabPanel px={0} pt={4}>
                <IssueComments taskId={taskId} canModerate={canModerate} onCountChange={setCommentCount} />
              </TabPanel>
            )}
            <TabPanel px={0} pt={4}>
              <IssueHistory taskId={taskId} members={members} epics={epics} sprints={sprints} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </VStack>
  );

  const details = (
    <VStack align="stretch" spacing={4} w={{ base: '100%', lg: '340px' }} flexShrink={0}>
      <Select
        value={task.status || 'todo'}
        onChange={(e) => set({ status: e.target.value, completed: e.target.value === 'done' })}
        aria-label="Status"
        size="sm"
        w="fit-content"
        minW="160px"
        fontWeight="semibold"
        borderColor={`${getStatusColor(task.status)}.300`}
      >
        {STATUSES.map((s) => <option key={s} value={s}>{labelForStatus(s)}</option>)}
      </Select>

      <Box borderWidth="1px" borderColor={borderColor} borderRadius="md" bg={panelBg}>
        <Text fontSize="sm" fontWeight="semibold" px={4} py={2.5} borderBottomWidth="1px" borderColor={borderColor}>Details</Text>
        <VStack align="stretch" spacing={1} px={4} py={3}>
          <DetailRow label="Assignee">
            <Menu>
              <MenuButton as={Button} size="sm" variant="ghost" px={2} ml={-2} fontWeight="normal"
                leftIcon={<Avatar size="xs" name={assignee?.name} src={assignee?.avatar} />}>
                {assignee ? assignee.name : 'Unassigned'}
              </MenuButton>
              <MenuList fontSize="sm" maxH="300px" overflowY="auto">
                <MenuItem onClick={() => set({ assignee_id: null })}>Unassigned</MenuItem>
                <MenuDivider />
                {members.map((m) => (
                  <MenuItem key={m.user_id} onClick={() => set({ assignee_id: m.user_id })}>
                    <HStack><Avatar size="xs" name={m.name} src={m.avatar} /><Text>{m.name}</Text></HStack>
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
            {currentUserId && task.assignee_id !== currentUserId && (
              <Button size="xs" variant="link" colorScheme="blue" fontWeight="normal" display="block"
                onClick={() => set({ assignee_id: currentUserId })}>
                Assign to me
              </Button>
            )}
            {!assignee && imported?.assignee && <Text fontSize="xs" color={mutedColor}>Before import: {imported.assignee}</Text>}
          </DetailRow>

          <DetailRow label="Reporter">
            <HStack spacing={2}>
              <Avatar size="xs" name={imported?.reporter || reporter} />
              <Text fontSize="sm">{imported?.reporter ? `${imported.reporter} (imported)` : reporter || 'Unknown'}</Text>
            </HStack>
          </DetailRow>

          <DetailRow label="Priority">
            <HStack spacing={2}>
              {PRIORITY_ICONS[(task.priority || '').toLowerCase()] && (
                <Icon as={PRIORITY_ICONS[task.priority.toLowerCase()].icon} color={PRIORITY_ICONS[task.priority.toLowerCase()].color} />
              )}
              <Select size="sm" variant="unstyled" value={(task.priority || 'medium').toLowerCase()} aria-label="Priority"
                onChange={(e) => set({ priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{capitalize(p)}</option>)}
              </Select>
            </HStack>
          </DetailRow>

          {boardId && (
            <DetailRow label="Type">
              <HStack spacing={2}>
                <Icon as={type.icon} color={type.color} />
                <Select size="sm" variant="unstyled" value={issueTypeOf(task)} aria-label="Issue type"
                  onChange={(e) => setTask((prev) => withIssueType(prev, e.target.value))}>
                  {Object.entries(ISSUE_TYPES).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
                </Select>
              </HStack>
            </DetailRow>
          )}

          {boardId && epicsEnabled && (
            <DetailRow label="Epic">
              <HStack spacing={2}>
                {epic && <Box w="10px" h="10px" borderRadius="sm" bg={epic.color} flexShrink={0} />}
                <Select size="sm" variant="unstyled" value={task.epic_id || ''} aria-label="Epic"
                  onChange={(e) => set({ epic_id: e.target.value })}>
                  <option value="">None</option>
                  {epics.map((e) => <option key={e.epic_id} value={e.epic_id}>{e.title}</option>)}
                </Select>
              </HStack>
            </DetailRow>
          )}

          {boardId && sprintsEnabled && (
            <DetailRow label="Sprint">
              <Select size="sm" variant="unstyled" value={task.sprint_id || ''} aria-label="Sprint"
                onChange={(e) => set({ sprint_id: e.target.value })}>
                <option value="">Backlog</option>
                {sprints.filter((s) => s.status !== 'completed' || s.sprint_id === task.sprint_id).map((s) => (
                  <option key={s.sprint_id} value={s.sprint_id}>{s.name}{s.status === 'active' ? ' (active)' : s.status === 'completed' ? ' (completed)' : ''}</option>
                ))}
              </Select>
            </DetailRow>
          )}

          <DetailRow label="Story points">
            <Select size="sm" variant="unstyled" value={task.story_points ?? ''} aria-label="Story points"
              onChange={(e) => set({ story_points: e.target.value === '' ? null : parseInt(e.target.value, 10) })}>
              <option value="">None</option>
              {[...new Set([...STORY_POINT_OPTIONS, ...(task.story_points ? [task.story_points] : [])])].sort((a, b) => a - b)
                .map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </DetailRow>

          <DetailRow label="Due date">
            <Input size="sm" variant="unstyled" type="datetime-local" aria-label="Due date"
              value={task.due_on ? String(task.due_on).slice(0, 16) : ''}
              onChange={(e) => set({ due_on: e.target.value || null })} />
          </DetailRow>

          <DetailRow label="Labels">
            <Wrap spacing={1} py={1}>
              {(task.labels || []).map((label) => (
                <Tag key={label} size="sm" variant="subtle" colorScheme="gray">
                  <TagLabel>{label}</TagLabel>
                  <TagCloseButton onClick={() => set({ labels: task.labels.filter((l) => l !== label) })} />
                </Tag>
              ))}
              <Input size="xs" variant="unstyled" w="90px" placeholder="+ Add label" value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)} onBlur={addLabel}
                onKeyDown={(e) => { if (e.key === 'Enter') addLabel(); }} aria-label="Add label" />
            </Wrap>
          </DetailRow>
        </VStack>
      </Box>

      {timeTrackingEnabled && task.ticket_key && (
        <Box borderWidth="1px" borderColor={borderColor} borderRadius="md" bg={panelBg} px={4} py={3}>
          <TimeTrackingSection task={task} onTimeChange={(fields) => setTask((prev) => ({ ...prev, ...fields }))} />
        </Box>
      )}

      <VStack align="stretch" spacing={0.5} fontSize="xs" color={mutedColor} px={1}>
        <Tooltip label={fullDateTime(task.created_at)} openDelay={400} placement="left">
          <Text w="fit-content">Created {relativeTime(task.created_at)}</Text>
        </Tooltip>
        <Tooltip label={fullDateTime(task.updated_at)} openDelay={400} placement="left">
          <Text w="fit-content">Updated {relativeTime(task.updated_at)}</Text>
        </Tooltip>
        {imported?.key && <Text>Imported as {imported.key}</Text>}
      </VStack>
    </VStack>
  );

  const footer = (
    <Flex justify="space-between" align="center" px={6} py={3} borderTopWidth="1px" borderColor={borderColor} bg={panelBg}
      position={isPage ? 'sticky' : 'static'} bottom={0} zIndex={1}>
      <Text fontSize="sm" color={dirty ? 'orange.500' : mutedColor}>{dirty ? 'You have unsaved changes' : 'All changes saved'}</Text>
      <HStack spacing={2}>
        {dirty && <Button size="sm" variant="ghost" onClick={discard}>Discard</Button>}
        {!isPage && !dirty && <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>}
        <Button size="sm" colorScheme="blue" onClick={save} isLoading={saving} isDisabled={!dirty || !(task.title || '').trim()}>Save changes</Button>
      </HStack>
    </Flex>
  );

  return (
    <Flex direction="column" h={isPage ? 'auto' : '100%'} minH={0}>
      {header}
      <Box flex={1} overflowY={isPage ? 'visible' : 'auto'} px={6} py={5}>
        <Flex gap={8} direction={{ base: 'column', lg: 'row' }} align="flex-start">
          {main}
          <Divider orientation="vertical" display={{ base: 'none', lg: 'block' }} h="auto" alignSelf="stretch" />
          {details}
        </Flex>
      </Box>
      {footer}

      <Modal isOpen={deleteDialog.isOpen} onClose={deleteDialog.onClose} size="sm" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontSize="md">Delete {task.ticket_key || 'this issue'}?</ModalHeader>
          <ModalBody fontSize="sm">It will be removed from boards, backlogs and search. This can't be undone.</ModalBody>
          <ModalFooter>
            <Button size="sm" variant="ghost" mr={2} onClick={deleteDialog.onClose}>Cancel</Button>
            <Button size="sm" colorScheme="red" onClick={deleteIssue}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
}

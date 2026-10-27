import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar, Badge, Box, Button, Collapse, Flex, FormControl, FormLabel, HStack, Icon, IconButton,
  Input, Menu, MenuButton, MenuDivider, MenuItem, MenuList, Modal, ModalBody, ModalCloseButton,
  ModalContent, ModalFooter, ModalHeader, ModalOverlay, Progress, Select, SimpleGrid, Spinner, Text,
  Textarea, VStack, useColorModeValue, useDisclosure, useToast,
} from '@chakra-ui/react';
import { FiChevronDown, FiChevronRight, FiMoreHorizontal, FiPlus } from 'react-icons/fi';
import EpicService from '../../services/EpicService';
import TaskService from '../../services/taskservice';
import { ISSUE_TYPES, issueTypeOf } from '../../utils/issueTypes';
import { getStatusColor, labelForStatus } from '../../utils/taskStatus';

export const EPIC_COLORS = ['#6554C0', '#36B37E', '#00B8D9', '#FF5630', '#FFAB00', '#0052CC', '#DE350B'];
const EMPTY_FORM = { title: '', description: '', color: EPIC_COLORS[0], start_date: '', due_date: '' };

const dateOnly = (value) => (value ? String(value).slice(0, 10) : '');
const shortDate = (value) => (value
  ? new Date(`${dateOnly(value)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  : null);

function EpicForm({ isOpen, onClose, epic, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const swatchBorder = useColorModeValue('gray.800', 'white');

  useEffect(() => {
    if (!isOpen) return;
    setForm(epic ? {
      title: epic.title, description: epic.description || '', color: epic.color,
      start_date: dateOnly(epic.start_date), due_date: dateOnly(epic.due_date),
    } : EMPTY_FORM);
  }, [isOpen, epic]);

  const invalidDates = form.start_date && form.due_date && form.due_date < form.start_date;

  const submit = async () => {
    if (!form.title.trim() || invalidDates) return;
    setSaving(true);
    try {
      await onSave({
        title: form.title.trim(),
        description: form.description.trim() || null,
        color: form.color,
        start_date: form.start_date ? `${form.start_date}T00:00:00` : null,
        due_date: form.due_date ? `${form.due_date}T00:00:00` : null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="lg">{epic ? 'Edit epic' : 'Create epic'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel fontSize="sm">Name</FormLabel>
              <Input size="sm" autoFocus value={form.title} placeholder="e.g. Checkout revamp"
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Description</FormLabel>
              <Textarea size="sm" rows={3} value={form.description} placeholder="What this epic delivers"
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormControl>
            <SimpleGrid columns={2} spacing={3}>
              <FormControl>
                <FormLabel fontSize="sm">Start date</FormLabel>
                <Input size="sm" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </FormControl>
              <FormControl isInvalid={!!invalidDates}>
                <FormLabel fontSize="sm">Due date</FormLabel>
                <Input size="sm" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </FormControl>
            </SimpleGrid>
            {invalidDates && <Text fontSize="xs" color="red.500">The due date is before the start date.</Text>}
            <FormControl>
              <FormLabel fontSize="sm">Color</FormLabel>
              <HStack spacing={2}>
                {EPIC_COLORS.map((color) => (
                  <Box key={color} as="button" type="button" aria-label={`Color ${color}`} aria-pressed={form.color === color}
                    w="22px" h="22px" borderRadius="sm" bg={color} borderWidth="2px"
                    borderColor={form.color === color ? swatchBorder : 'transparent'}
                    onClick={() => setForm({ ...form, color })} />
                ))}
              </HStack>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button size="sm" variant="ghost" mr={2} onClick={onClose}>Cancel</Button>
          <Button size="sm" colorScheme="teal" onClick={submit} isLoading={saving} isDisabled={!form.title.trim() || !!invalidDates}>
            {epic ? 'Save' : 'Create'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// Epic list: every epic on the board with its progress, and the
// issues in it one click away.
export default function EpicsPanel({ boardId, epics, onChanged, onOpenIssue, onShowOnBoard, reloadKey }) {
  const toast = useToast();
  const form = useDisclosure();
  const confirm = useDisclosure();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [filter, setFilter] = useState('open');
  const [expanded, setExpanded] = useState({});
  const [boardTasks, setBoardTasks] = useState(null);
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const rowBg = useColorModeValue('white', 'gray.800');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const anyExpanded = Object.values(expanded).some(Boolean);
  useEffect(() => { setBoardTasks(null); }, [reloadKey]);
  useEffect(() => {
    if (!anyExpanded || boardTasks) return;
    TaskService.getByBoard(boardId).then((res) => setBoardTasks(res.data || [])).catch(() => setBoardTasks([]));
  }, [anyExpanded, boardTasks, boardId]);

  const shown = useMemo(() => epics.filter((e) => filter === 'all' || e.status === filter), [epics, filter]);

  const save = async (data) => {
    try {
      if (editing) await EpicService.update(boardId, editing.epic_id, data);
      else await EpicService.create(boardId, data);
      onChanged();
    } catch (err) {
      toast({ title: "Couldn't save the epic", description: err.response?.data?.detail, status: 'error', duration: 3000 });
      throw err;
    }
  };

  const setStatus = async (epic, status) => {
    try {
      await EpicService.update(boardId, epic.epic_id, { status });
      onChanged();
    } catch {
      toast({ title: "Couldn't update the epic", status: 'error', duration: 3000 });
    }
  };

  const remove = async () => {
    try {
      await EpicService.remove(boardId, deleting.epic_id);
      confirm.onClose();
      onChanged(deleting.epic_id);
    } catch {
      toast({ title: "Couldn't delete the epic", status: 'error', duration: 3000 });
    }
  };

  const openForm = (epic = null) => { setEditing(epic); form.onOpen(); };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={3} gap={2} wrap="wrap">
        <HStack>
          <Select size="sm" w="auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Show epics">
            <option value="open">Open epics</option>
            <option value="closed">Closed epics</option>
            <option value="all">All epics</option>
          </Select>
          <Text fontSize="sm" color={mutedColor}>{shown.length} {shown.length === 1 ? 'epic' : 'epics'}</Text>
        </HStack>
        <Button size="sm" leftIcon={<FiPlus />} colorScheme="teal" onClick={() => openForm()}>Create epic</Button>
      </Flex>

      {shown.length === 0 ? (
        <Box borderWidth="1px" borderStyle="dashed" borderColor={borderColor} borderRadius="md" p={8} textAlign="center">
          <Text fontWeight="medium">{epics.length ? 'No epics match this filter.' : 'No epics yet'}</Text>
          {!epics.length && (
            <Text fontSize="sm" color={mutedColor} mt={1}>Epics group related issues into a larger piece of work and track its progress.</Text>
          )}
        </Box>
      ) : (
        <Box borderWidth="1px" borderColor={borderColor} borderRadius="md" overflow="hidden">
          {shown.map((epic, index) => {
            const isOpen = !!expanded[epic.epic_id];
            const percent = epic.issue_count ? Math.round((100 * epic.done_count) / epic.issue_count) : 0;
            const dates = [shortDate(epic.start_date), shortDate(epic.due_date)].filter(Boolean).join(' – ');
            const issues = (boardTasks || []).filter((t) => t.epic_id === epic.epic_id && !t.parent_task_id);
            return (
              <Box key={epic.epic_id} borderTopWidth={index ? '1px' : 0} borderColor={borderColor} bg={rowBg}>
                <Flex align="center" gap={3} px={3} py={3} _hover={{ bg: hoverBg }}>
                  <IconButton size="xs" variant="ghost" icon={isOpen ? <FiChevronDown /> : <FiChevronRight />}
                    aria-label={isOpen ? 'Hide issues' : 'Show issues'} aria-expanded={isOpen}
                    onClick={() => setExpanded((prev) => ({ ...prev, [epic.epic_id]: !isOpen }))} />
                  <Box w="4px" alignSelf="stretch" borderRadius="full" bg={epic.color} />
                  <Box flex={1} minW={0}>
                    <HStack spacing={2}>
                      <Text fontWeight="semibold" noOfLines={1}>{epic.title}</Text>
                      {epic.status === 'closed' && <Badge colorScheme="green" fontSize="2xs">Closed</Badge>}
                    </HStack>
                    <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                      {[dates, epic.description].filter(Boolean).join(' · ') || 'No dates or description'}
                    </Text>
                  </Box>
                  <Box w={{ base: '120px', md: '220px' }} display={{ base: 'none', sm: 'block' }}>
                    <Progress value={percent} size="sm" colorScheme="green" borderRadius="full" aria-label={`${percent}% done`} />
                    <Text fontSize="xs" color={mutedColor} mt={1}>
                      {epic.issue_count ? `${epic.done_count} of ${epic.issue_count} issues done` : 'No issues'}
                      {epic.points_total ? ` · ${epic.points_done}/${epic.points_total} pts` : ''}
                    </Text>
                  </Box>
                  <Menu placement="bottom-end">
                    <MenuButton as={IconButton} size="sm" variant="ghost" icon={<FiMoreHorizontal />} aria-label={`Actions for ${epic.title}`} />
                    <MenuList fontSize="sm">
                      <MenuItem onClick={() => openForm(epic)}>Edit</MenuItem>
                      <MenuItem onClick={() => onShowOnBoard(epic.epic_id)}>Show issues on board</MenuItem>
                      {epic.status === 'closed'
                        ? <MenuItem onClick={() => setStatus(epic, 'open')}>Reopen</MenuItem>
                        : <MenuItem onClick={() => setStatus(epic, 'closed')}>Mark as closed</MenuItem>}
                      <MenuDivider />
                      <MenuItem color="red.500" onClick={() => { setDeleting(epic); confirm.onOpen(); }}>Delete</MenuItem>
                    </MenuList>
                  </Menu>
                </Flex>
                <Collapse in={isOpen} animateOpacity>
                  <Box pl={14} pr={3} pb={3}>
                    {!boardTasks ? <Spinner size="sm" /> : issues.length === 0 ? (
                      <Text fontSize="sm" color={mutedColor}>No issues in this epic yet. Set the Epic field on an issue to add it.</Text>
                    ) : (
                      <Box borderWidth="1px" borderColor={borderColor} borderRadius="md">
                        {issues.map((task, i) => {
                          const type = ISSUE_TYPES[issueTypeOf(task)];
                          const assignee = task.assignee ? `${task.assignee.first_name || ''} ${task.assignee.last_name || ''}`.trim() : null;
                          return (
                            <Flex key={task.task_id} as="button" type="button" w="100%" textAlign="left" align="center" gap={3} px={3} py={2}
                              borderTopWidth={i ? '1px' : 0} borderColor={borderColor} _hover={{ bg: hoverBg }}
                              onClick={() => onOpenIssue(task)}>
                              <Icon as={type.icon} color={type.color} flexShrink={0} />
                              <Text fontSize="sm" color={mutedColor} whiteSpace="nowrap">{task.ticket_key}</Text>
                              <Text fontSize="sm" flex={1} noOfLines={1}>{task.title}</Text>
                              {task.story_points != null && <Badge variant="subtle" fontSize="2xs">{task.story_points}</Badge>}
                              <Avatar size="xs" name={assignee || undefined} title={assignee || 'Unassigned'} />
                              <Badge colorScheme={getStatusColor(task.status)} fontSize="2xs" minW="80px" textAlign="center">{labelForStatus(task.status)}</Badge>
                            </Flex>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Box>
      )}

      <EpicForm isOpen={form.isOpen} onClose={form.onClose} epic={editing} onSave={save} />

      <Modal isOpen={confirm.isOpen} onClose={confirm.onClose} size="sm" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontSize="md">Delete “{deleting?.title}”?</ModalHeader>
          <ModalBody fontSize="sm">
            Its {deleting?.issue_count || 0} issues stay on the board without an epic. This can't be undone.
          </ModalBody>
          <ModalFooter>
            <Button size="sm" variant="ghost" mr={2} onClick={confirm.onClose}>Cancel</Button>
            <Button size="sm" colorScheme="red" onClick={remove}>Delete epic</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

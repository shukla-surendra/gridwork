import React, { useState } from 'react';
import {
  Box, HStack, VStack, Text, Badge, Avatar, Tooltip, IconButton, Button, Input, Select, Tag, TagLabel,
  Menu, MenuButton, MenuList, MenuItem, MenuGroup, MenuDivider, useColorModeValue, useToast,
} from '@chakra-ui/react';
import { FiMoreHorizontal, FiPlus } from 'react-icons/fi';
import { labelForStatus, getStatusColor } from '../../utils/taskStatus';
import { ISSUE_TYPES, DEFAULT_ISSUE_TYPE } from '../../utils/issueTypes';
import { IssueTypeIcon, PriorityIcon } from './IssueIcons';
import { PointsBadge, sumPoints } from './KanbanBoard';

const TODO_STATUSES = new Set(['todo', 'backlog']);

export const formatSprintDates = (sprint) => {
  if (!sprint.start_date && !sprint.end_date) return null;
  const fmt = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (sprint.start_date && sprint.end_date) return `${fmt(sprint.start_date)} – ${fmt(sprint.end_date)}`;
  return sprint.start_date ? `From ${fmt(sprint.start_date)}` : `Until ${fmt(sprint.end_date)}`;
};

// Three status-category pills (To Do / In Progress / Done) shown
// as story-point totals in each sprint header.
function StatusCategoryPoints({ tasks }) {
  const todo = sumPoints(tasks.filter(t => TODO_STATUSES.has(t.status)));
  const done = sumPoints(tasks.filter(t => t.status === 'done'));
  const inProgress = sumPoints(tasks) - todo - done;
  return (
    <HStack spacing={1}>
      <Tooltip label="To Do: story points"><Badge colorScheme="gray" borderRadius="full" px={2}>{todo}</Badge></Tooltip>
      <Tooltip label="In Progress: story points"><Badge colorScheme="blue" borderRadius="full" px={2}>{inProgress}</Badge></Tooltip>
      <Tooltip label="Done: story points"><Badge colorScheme="green" borderRadius="full" px={2}>{done}</Badge></Tooltip>
    </HStack>
  );
}

function BacklogRow({ task, epic, epics, moveTargets, onOpen, onChangeEpic, onChangeSprint }) {
  const rowBg = useColorModeValue('white', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.600');
  const isDone = task.status === 'done';

  return (
    <HStack bg={rowBg} px={3} py={2} borderRadius="md" boxShadow="xs" spacing={3} _hover={{ bg: hoverBg }}>
      <HStack flex={1} minW={0} spacing={2} cursor="pointer" onClick={() => onOpen(task)}>
        <IssueTypeIcon task={task} />
        {task.ticket_key && (
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" whiteSpace="nowrap" textDecoration={isDone ? 'line-through' : 'none'}>
            {task.ticket_key}
          </Text>
        )}
        <Text fontSize="sm" noOfLines={1}>{task.title}</Text>
      </HStack>
      <HStack spacing={2} flexShrink={0}>
        {epic && (
          <Tag size="sm" borderRadius="sm" bg={epic.color} color="white" fontSize="2xs" fontWeight="semibold" display={{ base: 'none', md: 'inline-flex' }}>
            <TagLabel textTransform="uppercase">{epic.title}</TagLabel>
          </Tag>
        )}
        <Badge colorScheme={getStatusColor(task.status)} fontSize="2xs">{labelForStatus(task.status)}</Badge>
        <PointsBadge points={task.story_points ?? '–'} />
        <PriorityIcon priority={task.priority} />
        {task.assignee ? (
          <Tooltip label={`${task.assignee.first_name} ${task.assignee.last_name}`}>
            <Avatar size="xs" name={`${task.assignee.first_name} ${task.assignee.last_name}`} src={task.assignee.avatar_url} />
          </Tooltip>
        ) : (
          <Tooltip label="Unassigned"><Avatar size="xs" bg="gray.300" /></Tooltip>
        )}
        <Menu isLazy placement="bottom-end">
          <MenuButton as={IconButton} icon={<FiMoreHorizontal />} size="xs" variant="ghost" aria-label={`Actions for ${task.ticket_key || task.title}`} />
          <MenuList fontSize="sm" maxH="320px" overflowY="auto">
            {moveTargets.length > 0 && (
              <MenuGroup title="Move to">
                {moveTargets.map(target => (
                  <MenuItem key={target.id || 'backlog'} onClick={() => onChangeSprint(task, target.id)}>{target.name}</MenuItem>
                ))}
              </MenuGroup>
            )}
            {epics.length > 0 && (
              <>
                <MenuDivider />
                <MenuGroup title="Epic">
                  {task.epic_id && <MenuItem onClick={() => onChangeEpic(task, '')}>Remove from epic</MenuItem>}
                  {epics.filter(e => e.epic_id !== task.epic_id).map(e => (
                    <MenuItem key={e.epic_id} onClick={() => onChangeEpic(task, e.epic_id)}>
                      <Box w="8px" h="8px" borderRadius="sm" bg={e.color} mr={2} />{e.title}
                    </MenuItem>
                  ))}
                </MenuGroup>
              </>
            )}
          </MenuList>
        </Menu>
      </HStack>
    </HStack>
  );
}

// Inline "+ Create issue": stays open after each Enter so several
// issues can be typed in a row; Escape closes it.
function InlineCreate({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [issueType, setIssueType] = useState(DEFAULT_ISSUE_TYPE);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await onCreate(title.trim(), issueType);
      setTitle('');
    } catch {
      toast({ title: "Couldn't create issue", status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" variant="ghost" leftIcon={<FiPlus />} justifyContent="flex-start" color="gray.500" onClick={() => setOpen(true)}>
        Create issue
      </Button>
    );
  }
  return (
    <HStack spacing={2}>
      <Select size="sm" width="110px" value={issueType} onChange={(e) => setIssueType(e.target.value)} aria-label="Issue type">
        {Object.entries(ISSUE_TYPES).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
      </Select>
      <Input
        size="sm"
        autoFocus
        placeholder="What needs to be done?"
        value={title}
        isDisabled={saving}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') { setOpen(false); setTitle(''); }
        }}
        onBlur={() => { if (!title.trim()) setOpen(false); }}
      />
    </HStack>
  );
}

export function BacklogContainer({
  title, badge, subtitle, tasks, totalCount, actions, emptyText,
  epics, epicsById, moveTargetsFor, onOpen, onChangeEpic, onChangeSprint, onCreate,
}) {
  const panelBg = useColorModeValue('gray.100', 'gray.900');
  const filteredOut = totalCount - tasks.length;
  return (
    <Box bg={panelBg} borderRadius="lg" p={3}>
      <HStack justify="space-between" mb={subtitle ? 1 : 2} flexWrap="wrap" gap={2}>
        <HStack spacing={2} flexWrap="wrap">
          <Text fontWeight="bold" fontSize="sm">{title}</Text>
          {badge}
          <Text fontSize="xs" color="gray.500">
            {totalCount} {totalCount === 1 ? 'issue' : 'issues'}
            {filteredOut > 0 && ` (${filteredOut} hidden by filters)`}
          </Text>
        </HStack>
        <HStack spacing={2}>
          <StatusCategoryPoints tasks={tasks} />
          {actions}
        </HStack>
      </HStack>
      {subtitle && <Text fontSize="xs" color="gray.500" mb={2}>{subtitle}</Text>}
      <VStack align="stretch" spacing={1}>
        {tasks.map(task => (
          <BacklogRow
            key={task.task_id}
            task={task}
            epic={epicsById[task.epic_id]}
            epics={epics}
            moveTargets={moveTargetsFor(task)}
            onOpen={onOpen}
            onChangeEpic={onChangeEpic}
            onChangeSprint={onChangeSprint}
          />
        ))}
        {totalCount === 0 && <Text fontSize="xs" color="gray.400" py={1}>{emptyText}</Text>}
        {onCreate && <InlineCreate onCreate={onCreate} />}
      </VStack>
    </Box>
  );
}

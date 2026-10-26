import React, { useMemo, useState } from 'react';
import {
  Box, Flex, Text, HStack, Badge, IconButton, Avatar, Tooltip, Icon, Tag, TagLabel,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiPlus, FiMessageSquare, FiCheckSquare, FiChevronDown, FiChevronRight, FiCalendar } from 'react-icons/fi';
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { labelForStatus } from '../../utils/taskStatus';
import { IssueTypeIcon, PriorityIcon } from './IssueIcons';

const COLUMN_WIDTH = '272px';
const NO_LANE = '__none__';

// Droppable column ids carry their lane so the same status can be a drop
// target once per swimlane; only the status part matters when persisting
// -- a cross-lane drop changes the card's status, never its assignee/epic.
const columnId = (lane, status) => `col::${lane}::${status}`;
const statusFromColumnId = (id) => (typeof id === 'string' && id.startsWith('col::') ? id.split('::')[2] : null);

export const sumPoints = (tasks) => tasks.reduce((sum, t) => sum + (t.story_points || 0), 0);

export function PointsBadge({ points }) {
  const bg = useColorModeValue('gray.200', 'gray.600');
  if (points === null || points === undefined) return null;
  return (
    <Tooltip label="Story points" openDelay={400}>
      <Badge bg={bg} borderRadius="full" px={2} fontSize="2xs" textTransform="none">{points}</Badge>
    </Tooltip>
  );
}

function CardContent({ task, epic }) {
  const isDone = task.status === 'done';
  const isOverdue = task.due_on && !isDone && !task.completed && new Date(task.due_on) < new Date();
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const labelBorder = useColorModeValue('gray.300', 'gray.500');

  return (
    <>
      <Text fontSize="sm" mb={2} noOfLines={3}>{task.title}</Text>

      {(epic || task.labels?.length > 0) && (
        <HStack spacing={1} flexWrap="wrap" mb={2}>
          {epic && (
            <Tag size="sm" borderRadius="sm" bg={epic.color} color="white" fontSize="2xs" fontWeight="semibold">
              <TagLabel textTransform="uppercase">{epic.title}</TagLabel>
            </Tag>
          )}
          {task.labels?.map(label => (
            <Tag key={label} size="sm" variant="outline" borderRadius="sm" fontSize="2xs" boxShadow="none" borderWidth="1px" borderColor={labelBorder} color={mutedColor}>
              <TagLabel>{label}</TagLabel>
            </Tag>
          ))}
        </HStack>
      )}

      <Flex justify="space-between" align="center">
        <HStack spacing={2} color={mutedColor} minW={0}>
          <IssueTypeIcon task={task} />
          {task.ticket_key && (
            <Text fontSize="xs" fontWeight="semibold" textDecoration={isDone ? 'line-through' : 'none'} whiteSpace="nowrap">
              {task.ticket_key}
            </Text>
          )}
          {task.due_on && (
            <Tooltip label={isOverdue ? 'Overdue' : 'Due date'} openDelay={400}>
              <HStack spacing={0.5} color={isOverdue ? 'red.500' : mutedColor}>
                <Icon as={FiCalendar} boxSize={3} />
                <Text fontSize="2xs" fontWeight={isOverdue ? 'bold' : 'normal'}>
                  {new Date(task.due_on).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </Text>
              </HStack>
            </Tooltip>
          )}
          {task.checklist?.length > 0 && (
            <HStack spacing={0.5}>
              <Icon as={FiCheckSquare} boxSize={3} />
              <Text fontSize="2xs">{task.checklist.filter(i => i.done).length}/{task.checklist.length}</Text>
            </HStack>
          )}
          {task.comments?.length > 0 && (
            <HStack spacing={0.5}>
              <Icon as={FiMessageSquare} boxSize={3} />
              <Text fontSize="2xs">{task.comments.length}</Text>
            </HStack>
          )}
        </HStack>
        <HStack spacing={1.5} flexShrink={0}>
          <PointsBadge points={task.story_points} />
          <PriorityIcon priority={task.priority} />
          {task.assignee ? (
            <Tooltip label={`${task.assignee.first_name} ${task.assignee.last_name}`}>
              <Avatar size="xs" name={`${task.assignee.first_name} ${task.assignee.last_name}`} src={task.assignee.avatar_url} />
            </Tooltip>
          ) : (
            <Tooltip label="Unassigned">
              <Avatar size="xs" bg="gray.300" />
            </Tooltip>
          )}
        </HStack>
      </Flex>
    </>
  );
}

function KanbanCard({ task, epic, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.task_id });
  const cardBg = useColorModeValue('white', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.600');

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
      bg={cardBg}
      p={3}
      mb={2}
      borderRadius="md"
      boxShadow="sm"
      cursor="grab"
      onClick={() => onClick(task)}
      _hover={{ bg: hoverBg, boxShadow: 'md' }}
    >
      <CardContent task={task} epic={epic} />
    </Box>
  );
}

function ColumnBody({ lane, status, tasks, epicsById, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId(lane, status) });
  const columnBg = useColorModeValue('gray.100', 'gray.900');
  const overBg = useColorModeValue('teal.50', 'teal.900');

  return (
    <Box
      ref={setNodeRef}
      bg={isOver ? overBg : columnBg}
      borderRadius="md"
      p={2}
      w={COLUMN_WIDTH}
      minH="64px"
      flexShrink={0}
      transition="background 0.15s ease"
    >
      <SortableContext items={tasks.map(t => t.task_id)} strategy={verticalListSortingStrategy}>
        {tasks.map(task => (
          <KanbanCard key={task.task_id} task={task} epic={epicsById[task.epic_id]} onClick={onCardClick} />
        ))}
      </SortableContext>
    </Box>
  );
}

function buildLanes(groupBy, tasks, epics, currentUserId) {
  if (groupBy === 'assignee') {
    const byId = new Map();
    for (const task of tasks) {
      if (task.assignee_id && task.assignee && !byId.has(task.assignee_id)) {
        const name = `${task.assignee.first_name} ${task.assignee.last_name}`.trim();
        byId.set(task.assignee_id, { key: task.assignee_id, label: name, avatar: task.assignee.avatar_url });
      }
    }
    // Jira puts you first, everyone else alphabetically, Unassigned last.
    const people = [...byId.values()].sort((a, b) => {
      if (a.key === currentUserId) return -1;
      if (b.key === currentUserId) return 1;
      return a.label.localeCompare(b.label);
    });
    return [...people, { key: NO_LANE, label: 'Unassigned', avatar: null, isUnassigned: true }];
  }
  if (groupBy === 'epic') {
    const used = new Set(tasks.map(t => t.epic_id));
    return [
      ...epics.filter(e => used.has(e.epic_id)).map(e => ({ key: e.epic_id, label: e.title, color: e.color })),
      { key: NO_LANE, label: 'Issues without epic' },
    ];
  }
  return [{ key: NO_LANE, label: null }];
}

const laneKeyOf = (groupBy, task) => {
  if (groupBy === 'assignee') return task.assignee_id || NO_LANE;
  if (groupBy === 'epic') return task.epic_id || NO_LANE;
  return NO_LANE;
};

export default function KanbanBoard({
  columns, tasksByStatus, setTasksByStatus, isVisible, groupBy, epics, epicsById, currentUserId,
  onCardClick, onAddCard, onPersist,
}) {
  const [activeTask, setActiveTask] = useState(null);
  const [collapsedLanes, setCollapsedLanes] = useState(() => new Set());
  const headerBg = useColorModeValue('gray.100', 'gray.900');
  const laneHeaderHover = useColorModeValue('gray.100', 'gray.700');
  const overlayBg = useColorModeValue('white', 'gray.700');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const visibleByStatus = useMemo(
    () => Object.fromEntries(columns.map(s => [s, (tasksByStatus[s] || []).filter(isVisible)])),
    [columns, tasksByStatus, isVisible]
  );
  const visibleTasks = useMemo(() => Object.values(visibleByStatus).flat(), [visibleByStatus]);
  const lanes = useMemo(
    () => buildLanes(groupBy, visibleTasks, epics, currentUserId),
    [groupBy, visibleTasks, epics, currentUserId]
  );
  const showLaneHeaders = groupBy !== 'none';

  const statusOf = (id) => statusFromColumnId(id)
    ?? Object.keys(tasksByStatus).find(s => tasksByStatus[s].some(t => t.task_id === id));

  const handleDragStart = (event) => {
    setActiveTask(Object.values(tasksByStatus).flat().find(t => t.task_id === event.active.id) || null);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    const from = statusOf(active.id);
    const to = statusOf(over.id);
    if (!from || !to || from === to) return;

    setTasksByStatus(prev => {
      const fromItems = prev[from];
      const toItems = prev[to] || [];
      const moved = { ...fromItems.find(t => t.task_id === active.id), status: to };
      const overIndex = toItems.findIndex(t => t.task_id === over.id);
      const insertAt = overIndex >= 0 ? overIndex : toItems.length;
      return {
        ...prev,
        [from]: fromItems.filter(t => t.task_id !== active.id),
        [to]: [...toItems.slice(0, insertAt), moved, ...toItems.slice(insertAt)],
      };
    });
  };

  const handleDragEnd = ({ active, over }) => {
    // The drag started in whatever column activeTask was in -- by now
    // handleDragOver may already have moved it, so read the original
    // status off the snapshot taken at drag start.
    const originalStatus = activeTask?.status;
    setActiveTask(null);
    if (!over) return;
    const status = statusOf(active.id);
    if (!status) return;

    let finalState = tasksByStatus;
    if (statusOf(over.id) === status && active.id !== over.id && !statusFromColumnId(over.id)) {
      const items = tasksByStatus[status];
      finalState = {
        ...tasksByStatus,
        [status]: arrayMove(items, items.findIndex(t => t.task_id === active.id), items.findIndex(t => t.task_id === over.id)),
      };
      setTasksByStatus(finalState);
    }
    onPersist(new Set([originalStatus, status].filter(Boolean)), finalState);
  };

  const toggleLane = (key) => setCollapsedLanes(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <Box overflowX="auto" pb={4}>
        <Box minW="max-content">
          {/* Column headers -- rendered once above all swimlanes, like Jira. */}
          <Flex gap={3} mb={2} position="sticky" top={0} zIndex={1}>
            {columns.map(status => {
              const tasks = visibleByStatus[status] || [];
              const points = sumPoints(tasks);
              return (
                <HStack key={status} w={COLUMN_WIDTH} flexShrink={0} justify="space-between" bg={headerBg} borderRadius="md" px={3} py={2}>
                  <HStack spacing={2}>
                    <Text fontWeight="semibold" fontSize="xs" textTransform="uppercase" letterSpacing="wide" color="gray.500">
                      {labelForStatus(status)}
                    </Text>
                    <Text fontSize="xs" color="gray.500">{tasks.length}</Text>
                    {points > 0 && <PointsBadge points={points} />}
                  </HStack>
                  <IconButton
                    icon={<FiPlus />}
                    size="xs"
                    variant="ghost"
                    aria-label={`Create issue in ${labelForStatus(status)}`}
                    onClick={() => onAddCard(status)}
                  />
                </HStack>
              );
            })}
          </Flex>

          {lanes.map(lane => {
            const laneTasks = visibleTasks.filter(t => laneKeyOf(groupBy, t) === lane.key);
            if (showLaneHeaders && lane.key === NO_LANE && laneTasks.length === 0) return null;
            const collapsed = collapsedLanes.has(lane.key);
            return (
              <Box key={lane.key} mb={showLaneHeaders ? 3 : 0}>
                {showLaneHeaders && (
                  <HStack
                    as="button"
                    type="button"
                    onClick={() => toggleLane(lane.key)}
                    spacing={2}
                    py={1.5}
                    px={1}
                    mb={1}
                    borderRadius="md"
                    _hover={{ bg: laneHeaderHover }}
                    aria-expanded={!collapsed}
                  >
                    <Icon as={collapsed ? FiChevronRight : FiChevronDown} />
                    {groupBy === 'assignee' && (
                      <Avatar size="xs" name={lane.isUnassigned ? undefined : lane.label} src={lane.avatar} bg={lane.isUnassigned ? 'gray.300' : undefined} />
                    )}
                    {groupBy === 'epic' && lane.color && <Box w="10px" h="10px" borderRadius="sm" bg={lane.color} />}
                    <Text fontSize="sm" fontWeight="semibold">{lane.label}</Text>
                    <Text fontSize="xs" color="gray.500">({laneTasks.length} {laneTasks.length === 1 ? 'issue' : 'issues'})</Text>
                  </HStack>
                )}
                {!collapsed && (
                  <Flex gap={3} align="stretch">
                    {columns.map(status => (
                      <ColumnBody
                        key={status}
                        lane={lane.key}
                        status={status}
                        tasks={(visibleByStatus[status] || []).filter(t => laneKeyOf(groupBy, t) === lane.key)}
                        epicsById={epicsById}
                        onCardClick={onCardClick}
                      />
                    ))}
                  </Flex>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
      <DragOverlay>
        {activeTask ? (
          <Box bg={overlayBg} p={3} borderRadius="md" boxShadow="xl" w={COLUMN_WIDTH} transform="rotate(2deg)">
            <CardContent task={activeTask} epic={epicsById[activeTask.epic_id]} />
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

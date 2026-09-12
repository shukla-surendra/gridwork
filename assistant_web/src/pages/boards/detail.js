import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { selectIsModuleEnabled } from '../../slices/modules';
import FeatureDisabledPage from '../../components/dashboard/FeatureDisabledPage';
import {
  Box, Flex, Heading, Text, HStack, VStack, Badge, IconButton, Avatar,
  useColorModeValue, useDisclosure, Spinner, Center, useToast, Icon,
  Tabs, TabList, TabPanels, Tab, TabPanel, Button, Select,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, Input, Textarea, SimpleGrid, Tag, TagLabel, Divider,
  Menu, MenuButton, MenuList, MenuItem, Tooltip,
} from '@chakra-ui/react';
import { FiArrowLeft, FiPlus, FiMoreVertical, FiTrash2, FiPlay, FiCheckCircle, FiMessageSquare, FiCheckSquare } from 'react-icons/fi';
import { BsKanban } from 'react-icons/bs';
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import NewTaskDrawer from '../../components/dashboard/drawers/NewTaskDrawer';
import EditTaskDrawer from '../../components/dashboard/drawers/EditTaskDrawer';
import BoardService from '../../services/BoardService';
import TaskService from '../../services/taskservice';
import EpicService from '../../services/EpicService';
import SprintService from '../../services/SprintService';
import { labelForStatus as labelFor, PRIORITY_COLOR } from '../../utils/taskStatus';

const DEFAULT_COLUMNS = ["todo", "in_progress", "review", "done"];
const EPIC_COLORS = ["#6554C0", "#36B37E", "#00B8D9", "#FF5630", "#FFAB00", "#0052CC", "#DE350B"];

function KanbanCard({ task, epic, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.task_id });
  const cardBg = useColorModeValue('white', 'gray.700');
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      bg={cardBg}
      p={3}
      mb={2}
      borderRadius="md"
      borderLeftWidth={epic ? "3px" : 0}
      borderLeftColor={epic ? epic.color : undefined}
      boxShadow="sm"
      cursor="grab"
      onClick={() => onClick(task)}
      _hover={{ boxShadow: 'md' }}
    >
      {task.ticket_key && (
        <Text fontSize="2xs" fontWeight="bold" color="gray.500" mb={1}>{task.ticket_key}</Text>
      )}
      <Text fontSize="sm" fontWeight="medium" mb={2} noOfLines={3}>{task.title}</Text>

      {task.labels && task.labels.length > 0 && (
        <HStack spacing={1} flexWrap="wrap" mb={2}>
          {task.labels.map((label) => (
            <Box key={label} h="6px" w="24px" borderRadius="full" bg="teal.400" title={label} />
          ))}
        </HStack>
      )}

      <HStack spacing={2} flexWrap="wrap" mb={epic || task.checklist?.length || task.comments?.length ? 2 : 0}>
        <Badge colorScheme={PRIORITY_COLOR[task.priority] || 'gray'} fontSize="2xs">{task.priority}</Badge>
        {epic && (
          <Tag size="sm" borderRadius="full" bg={epic.color} color="white" fontSize="2xs">
            <TagLabel>{epic.title}</TagLabel>
          </Tag>
        )}
      </HStack>

      <Flex justify="space-between" align="center">
        <HStack spacing={3}>
          {task.due_on && (
            <HStack spacing={1}>
              <Text
                fontSize="2xs"
                color={new Date(task.due_on) < new Date() && !task.completed ? 'red.500' : 'gray.500'}
                fontWeight={new Date(task.due_on) < new Date() && !task.completed ? 'bold' : 'normal'}
              >
                {new Date(task.due_on).toLocaleDateString()}
              </Text>
            </HStack>
          )}
          {task.checklist && task.checklist.length > 0 && (
            <HStack spacing={1}>
              <Icon as={FiCheckSquare} boxSize={3} color="gray.500" />
              <Text fontSize="2xs" color="gray.500">
                {task.checklist.filter(i => i.done).length}/{task.checklist.length}
              </Text>
            </HStack>
          )}
          {task.comments && task.comments.length > 0 && (
            <HStack spacing={1}>
              <Icon as={FiMessageSquare} boxSize={3} color="gray.500" />
              <Text fontSize="2xs" color="gray.500">{task.comments.length}</Text>
            </HStack>
          )}
        </HStack>
        {task.assignee && (
          <Tooltip label={`${task.assignee.first_name} ${task.assignee.last_name}`}>
            <Avatar
              size="2xs"
              name={`${task.assignee.first_name} ${task.assignee.last_name}`}
              src={task.assignee.avatar_url}
            />
          </Tooltip>
        )}
      </Flex>
    </Box>
  );
}

function KanbanColumn({ status, tasks, epicsById, onCardClick, onAddCard }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const columnBg = useColorModeValue('gray.100', 'gray.900');

  return (
    <Box
      ref={setNodeRef}
      bg={isOver ? 'teal.50' : columnBg}
      borderRadius="lg"
      p={3}
      minW="280px"
      maxW="280px"
      flexShrink={0}
      transition="background 0.15s ease"
    >
      <HStack justify="space-between" mb={3}>
        <HStack>
          <Text fontWeight="bold" fontSize="sm">{labelFor(status)}</Text>
          <Badge borderRadius="full">{tasks.length}</Badge>
        </HStack>
        <IconButton
          icon={<FiPlus />}
          size="xs"
          variant="ghost"
          aria-label={`Add card to ${labelFor(status)}`}
          onClick={() => onAddCard(status)}
        />
      </HStack>
      <SortableContext items={tasks.map(t => t.task_id)} strategy={verticalListSortingStrategy}>
        <Box minH="40px">
          {tasks.map(task => (
            <KanbanCard key={task.task_id} task={task} epic={epicsById[task.epic_id]} onClick={onCardClick} />
          ))}
        </Box>
      </SortableContext>
    </Box>
  );
}

function BacklogTaskRow({ task, epics, sprintOptions, onOpen, onChangeEpic, onChangeSprint }) {
  const rowBg = useColorModeValue('white', 'gray.700');
  return (
    <HStack bg={rowBg} p={2} borderRadius="md" boxShadow="xs" justify="space-between">
      <Box flex={1} cursor="pointer" onClick={() => onOpen(task)}>
        <Text fontSize="sm" fontWeight="medium" noOfLines={1}>{task.title}</Text>
      </Box>
      <HStack spacing={2}>
        <Badge colorScheme={PRIORITY_COLOR[task.priority] || 'gray'} fontSize="2xs">{task.priority}</Badge>
        <Select
          size="xs"
          width="140px"
          value={task.epic_id || ''}
          onChange={(e) => onChangeEpic(task, e.target.value)}
        >
          <option value="">No epic</option>
          {epics.map(e => <option key={e.epic_id} value={e.epic_id}>{e.title}</option>)}
        </Select>
        <Select
          size="xs"
          width="140px"
          value={task.sprint_id || ''}
          onChange={(e) => onChangeSprint(task, e.target.value)}
        >
          <option value="">Backlog</option>
          {sprintOptions.map(s => <option key={s.sprint_id} value={s.sprint_id}>{s.name}</option>)}
        </Select>
      </HStack>
    </HStack>
  );
}

export default function BoardDetailPage() {
  const router = useRouter();
  const { boardId } = router.query;
  const navigate = (path) => router.push(path);
  const toast = useToast();
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const newCardDisclosure = useDisclosure();
  const editTaskDisclosure = useDisclosure();
  const epicsModal = useDisclosure();
  const sprintModal = useDisclosure();
  const epicsEnabled = useSelector((state) => selectIsModuleEnabled(state, 'epics'));
  const sprintsEnabled = useSelector((state) => selectIsModuleEnabled(state, 'sprints'));
  const boardsEnabled = useSelector((state) => selectIsModuleEnabled(state, 'boards'));

  const [board, setBoard] = useState(null);
  const [tasksByStatus, setTasksByStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [newCardStatus, setNewCardStatus] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);

  const [epics, setEpics] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [backlogTasks, setBacklogTasks] = useState([]);
  const [sprintTasksById, setSprintTasksById] = useState({});
  const [newEpicTitle, setNewEpicTitle] = useState('');
  const [newEpicColor, setNewEpicColor] = useState(EPIC_COLORS[0]);
  const [newEpicDescription, setNewEpicDescription] = useState('');
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintGoal, setNewSprintGoal] = useState('');

  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');
  const panelBg = useColorModeValue('gray.100', 'gray.900');

  const columns = useMemo(
    () => (board?.properties?.columns?.length ? board.properties.columns : DEFAULT_COLUMNS),
    [board]
  );

  const epicsById = useMemo(() => Object.fromEntries(epics.map(e => [e.epic_id, e])), [epics]);
  const activeSprint = useMemo(() => sprints.find(s => s.status === 'active'), [sprints]);
  const plannedSprints = useMemo(() => sprints.filter(s => s.status === 'planned'), [sprints]);
  const sprintOptionsForMove = useMemo(() => sprints.filter(s => s.status !== 'completed'), [sprints]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const groupTasks = (tasks, cols) => {
    const grouped = Object.fromEntries(cols.map(c => [c, []]));
    for (const task of tasks) {
      (grouped[task.status] || (grouped[task.status] = [])).push(task);
    }
    return grouped;
  };

  // Board view = the active sprint's cards, matching Jira's "board shows
  // the sprint you're running" model. With no active sprint yet (fresh
  // board, or between sprints) it falls back to every card on the board,
  // so boards created before this feature keep behaving exactly as before.
  const loadBoard = useCallback(async () => {
    // Next's router.query is empty on the very first render (before the
    // router has hydrated from the URL) -- skip fetching with a bogus
    // undefined id rather than flashing an error state that immediately
    // self-corrects once boardId shows up and this effect re-runs.
    if (!boardId) return;
    setLoading(true);
    setError(null);
    try {
      const boardRes = await BoardService.get(boardId);
      setBoard(boardRes.data);

      // Epics and Sprints are toggleable modules (Settings > Modules) --
      // a workspace that's switched either off gets a 403 here, which
      // shouldn't take the whole board down with it. Treat "couldn't
      // load" the same as "board has none yet": empty list, board still
      // renders (falling back to "every card on the board" below, same
      // as a board with no active sprint).
      const [epicsData, sprintsData] = await Promise.all([
        EpicService.getAll(boardId).then(res => res.data).catch(() => []),
        SprintService.getAll(boardId).then(res => res.data).catch(() => []),
      ]);
      setEpics(epicsData);
      setSprints(sprintsData);

      const cols = boardRes.data?.properties?.columns?.length ? boardRes.data.properties.columns : DEFAULT_COLUMNS;
      const active = sprintsData.find(s => s.status === 'active');
      const tasksRes = active
        ? await TaskService.getBySprint(boardId, active.sprint_id)
        : await TaskService.getByBoard(boardId);
      setTasksByStatus(groupTasks(tasksRes.data, cols));
    } catch (e) {
      setError("Failed to load board");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  const loadBacklogView = useCallback(async () => {
    try {
      const [backlogRes, sprintsData] = await Promise.all([
        TaskService.getBacklog(boardId),
        // Sprints being disabled shouldn't break the backlog tab -- same
        // reasoning as loadBoard above.
        SprintService.getAll(boardId).then(res => res.data).catch(() => []),
      ]);
      setBacklogTasks(backlogRes.data);
      setSprints(sprintsData);

      const openSprints = sprintsData.filter(s => s.status !== 'completed');
      const entries = await Promise.all(openSprints.map(s =>
        TaskService.getBySprint(boardId, s.sprint_id).then(res => [s.sprint_id, res.data])
      ));
      setSprintTasksById(Object.fromEntries(entries));
    } catch (e) {
      toast({ title: "Couldn't load backlog", status: "error", duration: 3000, isClosable: true });
    }
  }, [boardId, toast]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const findContainer = (id) => {
    if (id in tasksByStatus) return id; // dropped directly on a column
    return Object.keys(tasksByStatus).find(col => tasksByStatus[col].some(t => t.task_id === id));
  };

  const handleDragStart = (event) => {
    const task = Object.values(tasksByStatus).flat().find(t => t.task_id === event.active.id);
    setActiveTask(task);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setTasksByStatus(prev => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex(t => t.task_id === active.id);
      const overIndex = overItems.findIndex(t => t.task_id === over.id);
      const movedTask = { ...activeItems[activeIndex], status: overContainer };
      const newOverIndex = overIndex >= 0 ? overIndex : overItems.length;

      return {
        ...prev,
        [activeContainer]: activeItems.filter(t => t.task_id !== active.id),
        [overContainer]: [
          ...overItems.slice(0, newOverIndex),
          movedTask,
          ...overItems.slice(newOverIndex),
        ],
      };
    });
  };

  const persistColumn = (status, tasks) => {
    return Promise.all(tasks.map((task, index) =>
      TaskService.update(task.task_id, {
        task_id: task.task_id,
        workspace_id: task.workspace_id,
        user_id: task.user_id,
        status,
        order: index,
        board_id: boardId,
      })
    ));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (!activeContainer || !overContainer) return;

    let finalTasksByStatus = tasksByStatus;
    if (activeContainer === overContainer && active.id !== over.id) {
      const items = tasksByStatus[activeContainer];
      const oldIndex = items.findIndex(t => t.task_id === active.id);
      const newIndex = items.findIndex(t => t.task_id === over.id);
      finalTasksByStatus = { ...tasksByStatus, [activeContainer]: arrayMove(items, oldIndex, newIndex) };
      setTasksByStatus(finalTasksByStatus);
    }

    // Persist the column(s) that actually changed -- covers both a
    // same-column reorder and a cross-column move (handleDragOver already
    // moved the card locally in the cross-column case).
    const columnsToSave = new Set([activeContainer, overContainer]);
    columnsToSave.forEach(status => {
      persistColumn(status, finalTasksByStatus[status]).catch(() => {
        toast({ title: "Couldn't save card position", status: "error", duration: 3000, isClosable: true });
        loadBoard();
      });
    });
  };

  const handleAddCard = (status) => {
    setNewCardStatus(status);
    newCardDisclosure.onOpen();
  };

  const handleCardClick = (task) => {
    setCurrentTask(task);
    editTaskDisclosure.onOpen();
  };

  // EditTaskDrawer already persisted the edit itself (it dispatches its own
  // updateTask before calling this) -- just refresh the board's view.
  const handleTaskUpdate = () => {
    loadBoard();
  };

  const handleCreateEpic = async () => {
    if (!newEpicTitle.trim()) return;
    try {
      await EpicService.create(boardId, { title: newEpicTitle.trim(), color: newEpicColor, description: newEpicDescription || null });
      setNewEpicTitle('');
      setNewEpicDescription('');
      setNewEpicColor(EPIC_COLORS[0]);
      const res = await EpicService.getAll(boardId);
      setEpics(res.data);
    } catch {
      toast({ title: "Couldn't create epic", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleDeleteEpic = async (epicId) => {
    try {
      await EpicService.remove(boardId, epicId);
      setEpics(prev => prev.filter(e => e.epic_id !== epicId));
      loadBoard();
    } catch {
      toast({ title: "Couldn't delete epic", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleCreateSprint = async () => {
    if (!newSprintName.trim()) return;
    try {
      await SprintService.create(boardId, { name: newSprintName.trim(), goal: newSprintGoal || null });
      setNewSprintName('');
      setNewSprintGoal('');
      sprintModal.onClose();
      loadBacklogView();
    } catch {
      toast({ title: "Couldn't create sprint", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleStartSprint = async (sprintId) => {
    try {
      await SprintService.start(boardId, sprintId);
      loadBacklogView();
    } catch (e) {
      toast({ title: e.response?.data?.detail || "Couldn't start sprint", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleCompleteSprint = async (sprintId) => {
    try {
      await SprintService.complete(boardId, sprintId);
      loadBacklogView();
      loadBoard();
    } catch (e) {
      toast({ title: e.response?.data?.detail || "Couldn't complete sprint", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleDeleteSprint = async (sprintId) => {
    try {
      await SprintService.remove(boardId, sprintId);
      loadBacklogView();
    } catch {
      toast({ title: "Couldn't delete sprint", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleChangeTaskEpic = async (task, epicId) => {
    try {
      await TaskService.update(task.task_id, {
        task_id: task.task_id, workspace_id: task.workspace_id, user_id: task.user_id,
        epic_id: epicId,
      });
      loadBacklogView();
    } catch {
      toast({ title: "Couldn't update epic", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleChangeTaskSprint = async (task, sprintId) => {
    try {
      await TaskService.update(task.task_id, {
        task_id: task.task_id, workspace_id: task.workspace_id, user_id: task.user_id,
        sprint_id: sprintId,
      });
      loadBacklogView();
    } catch {
      toast({ title: "Couldn't move card", status: "error", duration: 3000, isClosable: true });
    }
  };

  if (!boardsEnabled) {
    return <FeatureDisabledPage featureName="Boards" />;
  }

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

  if (error || !board) {
    return (
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }}>
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Center py={20}><Text color="red.500">{error || "Board not found"}</Text></Center>
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
          <HStack mb={4} justify="space-between">
            <HStack>
              <IconButton icon={<FiArrowLeft />} variant="ghost" size="sm" aria-label="Back to boards" onClick={() => navigate('/boards')} />
              <Icon as={BsKanban} color="teal.500" />
              <Heading size="lg">{board.name}</Heading>
              {activeSprint && (
                <Badge colorScheme="teal" borderRadius="full" px={2}>{activeSprint.name} active</Badge>
              )}
            </HStack>
            {epicsEnabled && (
              <Button size="sm" variant="outline" onClick={epicsModal.onOpen}>Manage Epics</Button>
            )}
          </HStack>

          <Tabs colorScheme="teal" onChange={(index) => { if (index === 1) loadBacklogView(); }}>
            <TabList>
              <Tab>Board</Tab>
              <Tab>Backlog</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  <Flex gap={4} overflowX="auto" pb={4} align="flex-start">
                    {columns.map(status => (
                      <KanbanColumn
                        key={status}
                        status={status}
                        tasks={tasksByStatus[status] || []}
                        epicsById={epicsById}
                        onCardClick={handleCardClick}
                        onAddCard={handleAddCard}
                      />
                    ))}
                  </Flex>
                  <DragOverlay>
                    {activeTask ? (
                      <Box bg="white" p={3} borderRadius="md" boxShadow="lg" maxW="260px">
                        <Text fontSize="sm" fontWeight="medium">{activeTask.title}</Text>
                      </Box>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </TabPanel>

              <TabPanel px={0}>
                <VStack align="stretch" spacing={4}>
                  {sprintsEnabled && activeSprint && (
                    <Box bg={panelBg} borderRadius="lg" p={3}>
                      <HStack justify="space-between" mb={2}>
                        <HStack>
                          <Text fontWeight="bold" fontSize="sm">{activeSprint.name}</Text>
                          <Badge colorScheme="teal">Active</Badge>
                          <Badge borderRadius="full">{(sprintTasksById[activeSprint.sprint_id] || []).length}</Badge>
                        </HStack>
                        <Button size="xs" leftIcon={<FiCheckCircle />} colorScheme="teal" onClick={() => handleCompleteSprint(activeSprint.sprint_id)}>
                          Complete Sprint
                        </Button>
                      </HStack>
                      {activeSprint.goal && <Text fontSize="xs" color="gray.500" mb={2}>Goal: {activeSprint.goal}</Text>}
                      <VStack align="stretch" spacing={1}>
                        {(sprintTasksById[activeSprint.sprint_id] || []).map(task => (
                          <BacklogTaskRow
                            key={task.task_id}
                            task={task}
                            epics={epics}
                            sprintOptions={sprintOptionsForMove}
                            onOpen={handleCardClick}
                            onChangeEpic={handleChangeTaskEpic}
                            onChangeSprint={handleChangeTaskSprint}
                          />
                        ))}
                      </VStack>
                    </Box>
                  )}

                  {sprintsEnabled && plannedSprints.map(sprint => (
                    <Box key={sprint.sprint_id} bg={panelBg} borderRadius="lg" p={3}>
                      <HStack justify="space-between" mb={2}>
                        <HStack>
                          <Text fontWeight="bold" fontSize="sm">{sprint.name}</Text>
                          <Badge borderRadius="full">{(sprintTasksById[sprint.sprint_id] || []).length}</Badge>
                        </HStack>
                        <HStack>
                          <Tooltip label={activeSprint ? "Complete the active sprint first" : ""}>
                            <Button size="xs" leftIcon={<FiPlay />} isDisabled={!!activeSprint} onClick={() => handleStartSprint(sprint.sprint_id)}>
                              Start Sprint
                            </Button>
                          </Tooltip>
                          <Menu>
                            <MenuButton as={IconButton} icon={<FiMoreVertical />} size="xs" variant="ghost" aria-label="Sprint options" />
                            <MenuList>
                              <MenuItem icon={<FiTrash2 />} onClick={() => handleDeleteSprint(sprint.sprint_id)}>Delete Sprint</MenuItem>
                            </MenuList>
                          </Menu>
                        </HStack>
                      </HStack>
                      {sprint.goal && <Text fontSize="xs" color="gray.500" mb={2}>Goal: {sprint.goal}</Text>}
                      <VStack align="stretch" spacing={1}>
                        {(sprintTasksById[sprint.sprint_id] || []).map(task => (
                          <BacklogTaskRow
                            key={task.task_id}
                            task={task}
                            epics={epics}
                            sprintOptions={sprintOptionsForMove}
                            onOpen={handleCardClick}
                            onChangeEpic={handleChangeTaskEpic}
                            onChangeSprint={handleChangeTaskSprint}
                          />
                        ))}
                        {(sprintTasksById[sprint.sprint_id] || []).length === 0 && (
                          <Text fontSize="xs" color="gray.400">No cards yet -- move some in from the backlog below.</Text>
                        )}
                      </VStack>
                    </Box>
                  ))}

                  {sprintsEnabled && (
                    <Button size="sm" leftIcon={<FiPlus />} alignSelf="flex-start" onClick={sprintModal.onOpen}>
                      Create Sprint
                    </Button>
                  )}

                  <Divider />

                  <Box>
                    <HStack mb={2}>
                      <Text fontWeight="bold" fontSize="sm">Backlog</Text>
                      <Badge borderRadius="full">{backlogTasks.length}</Badge>
                    </HStack>
                    <VStack align="stretch" spacing={1}>
                      {backlogTasks.map(task => (
                        <BacklogTaskRow
                          key={task.task_id}
                          task={task}
                          epics={epics}
                          sprintOptions={sprintOptionsForMove}
                          onOpen={handleCardClick}
                          onChangeEpic={handleChangeTaskEpic}
                          onChangeSprint={handleChangeTaskSprint}
                        />
                      ))}
                      {backlogTasks.length === 0 && <Text fontSize="xs" color="gray.400">Backlog is empty.</Text>}
                    </VStack>
                  </Box>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Box>

      {newCardStatus && (
        <NewTaskDrawer
          key={newCardStatus}
          disclosures={{
            isOpen: newCardDisclosure.isOpen,
            onClose: () => { newCardDisclosure.onClose(); loadBoard(); },
          }}
          defaultValues={{ status: newCardStatus, board_id: boardId }}
        />
      )}
      <EditTaskDrawer
        currentTask={currentTask}
        setCurrentTask={setCurrentTask}
        disclosures={editTaskDisclosure}
        onTaskUpdate={handleTaskUpdate}
      />

      <Modal isOpen={epicsModal.isOpen} onClose={epicsModal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Epics</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3} mb={4}>
              {epics.map(epic => (
                <HStack key={epic.epic_id} justify="space-between" p={2} borderRadius="md" bg={panelBg}>
                  <HStack>
                    <Box w="12px" h="12px" borderRadius="full" bg={epic.color} />
                    <Text fontSize="sm" fontWeight="medium">{epic.title}</Text>
                  </HStack>
                  <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Delete epic" onClick={() => handleDeleteEpic(epic.epic_id)} />
                </HStack>
              ))}
              {epics.length === 0 && <Text fontSize="sm" color="gray.400">No epics yet.</Text>}
            </VStack>
            <Divider mb={4} />
            <VStack align="stretch" spacing={3}>
              <FormControl>
                <FormLabel fontSize="sm">New epic title</FormLabel>
                <Input size="sm" value={newEpicTitle} onChange={(e) => setNewEpicTitle(e.target.value)} placeholder="e.g. Checkout Revamp" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Description (optional)</FormLabel>
                <Textarea size="sm" value={newEpicDescription} onChange={(e) => setNewEpicDescription(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Color</FormLabel>
                <SimpleGrid columns={7} spacing={2}>
                  {EPIC_COLORS.map(color => (
                    <Box
                      key={color}
                      w="24px" h="24px" borderRadius="full" bg={color} cursor="pointer"
                      border={newEpicColor === color ? "2px solid black" : "2px solid transparent"}
                      onClick={() => setNewEpicColor(color)}
                    />
                  ))}
                </SimpleGrid>
              </FormControl>
              <Button size="sm" colorScheme="teal" onClick={handleCreateEpic}>Add Epic</Button>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={epicsModal.onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={sprintModal.isOpen} onClose={sprintModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Sprint</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <FormControl>
                <FormLabel fontSize="sm">Name</FormLabel>
                <Input size="sm" value={newSprintName} onChange={(e) => setNewSprintName(e.target.value)} placeholder="e.g. Sprint 3" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Goal (optional)</FormLabel>
                <Textarea size="sm" value={newSprintGoal} onChange={(e) => setNewSprintGoal(e.target.value)} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={sprintModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleCreateSprint}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

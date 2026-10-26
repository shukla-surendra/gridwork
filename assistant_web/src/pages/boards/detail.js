import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { selectIsModuleEnabled } from '../../slices/modules';
import FeatureDisabledPage from '../../components/dashboard/FeatureDisabledPage';
import {
  Box, Heading, Text, HStack, VStack, Badge, IconButton,
  useColorModeValue, useDisclosure, Spinner, Center, useToast, Icon,
  Tabs, TabList, TabPanels, Tab, TabPanel, Button,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, Input, Textarea, SimpleGrid, Divider,
  Menu, MenuButton, MenuList, MenuItem, Tooltip, Kbd,
} from '@chakra-ui/react';
import { FiArrowLeft, FiPlus, FiMoreVertical, FiTrash2, FiPlay, FiCheckCircle, FiClock } from 'react-icons/fi';
import { BsKanban } from 'react-icons/bs';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import NewTaskDrawer from '../../components/dashboard/drawers/NewTaskDrawer';
import EditTaskDrawer from '../../components/dashboard/drawers/EditTaskDrawer';
import BoardFilters, { EMPTY_FILTERS, matchesFilters } from '../../components/boards/BoardFilters';
import KanbanBoard from '../../components/boards/KanbanBoard';
import { BacklogContainer, formatSprintDates } from '../../components/boards/Backlog';
import { StartSprintModal, CompleteSprintModal } from '../../components/boards/SprintModals';
import BoardService from '../../services/BoardService';
import TaskService from '../../services/taskservice';
import EpicService from '../../services/EpicService';
import SprintService from '../../services/SprintService';
import MemberService from '../../services/MemberService';
import ConfigService from '../../utils/config';
import useSelectedIssue from '../../hooks/useSelectedIssue';

const DEFAULT_COLUMNS = ["todo", "in_progress", "review", "done"];
const EPIC_COLORS = ["#6554C0", "#36B37E", "#00B8D9", "#FF5630", "#FFAB00", "#0052CC", "#DE350B"];
const BOARD_TAB = 0;
const BACKLOG_TAB = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

const daysRemainingLabel = (sprint) => {
  if (!sprint?.end_date) return null;
  const days = Math.ceil((new Date(sprint.end_date) - new Date()) / DAY_MS);
  if (days < 0) return { text: `Ended ${-days} ${days === -1 ? 'day' : 'days'} ago`, overdue: true };
  return { text: `${days} ${days === 1 ? 'day' : 'days'} remaining`, overdue: false };
};

// Jira's "c" shortcut -- ignored while typing or with a modifier held.
const isTypingTarget = (el) =>
  el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

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
  const startSprintModal = useDisclosure();
  const completeSprintModal = useDisclosure();
  const epicsEnabled = useSelector((state) => selectIsModuleEnabled(state, 'epics'));
  const sprintsEnabled = useSelector((state) => selectIsModuleEnabled(state, 'sprints'));
  const boardsEnabled = useSelector((state) => selectIsModuleEnabled(state, 'boards'));

  const [board, setBoard] = useState(null);
  const [tasksByStatus, setTasksByStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCardStatus, setNewCardStatus] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [tabIndex, setTabIndex] = useState(BOARD_TAB);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [groupBy, setGroupBy] = useState('none');
  const [members, setMembers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [epics, setEpics] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [backlogTasks, setBacklogTasks] = useState([]);
  const [sprintTasksById, setSprintTasksById] = useState({});
  const [sprintToStart, setSprintToStart] = useState(null);
  const [newEpicTitle, setNewEpicTitle] = useState('');
  const [newEpicColor, setNewEpicColor] = useState(EPIC_COLORS[0]);
  const [newEpicDescription, setNewEpicDescription] = useState('');
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintGoal, setNewSprintGoal] = useState('');

  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');
  const panelBg = useColorModeValue('gray.100', 'gray.900');
  const swatchBorder = useColorModeValue('black', 'white');

  const columns = useMemo(
    () => (board?.properties?.columns?.length ? board.properties.columns : DEFAULT_COLUMNS),
    [board]
  );

  const epicsById = useMemo(() => Object.fromEntries(epics.map(e => [e.epic_id, e])), [epics]);
  const activeSprint = useMemo(() => sprints.find(s => s.status === 'active'), [sprints]);
  const plannedSprints = useMemo(() => sprints.filter(s => s.status === 'planned'), [sprints]);
  const openSprints = useMemo(() => sprints.filter(s => s.status !== 'completed'), [sprints]);
  const isVisible = useCallback((task) => matchesFilters(task, filters, currentUserId), [filters, currentUserId]);
  const boardTasks = useMemo(() => Object.values(tasksByStatus).flat(), [tasksByStatus]);
  const sprintRemaining = daysRemainingLabel(activeSprint);

  useEffect(() => {
    try {
      setCurrentUserId(ConfigService.getUserId());
      MemberService.getMembers(ConfigService.getDefaultWorkspace().workspace_id)
        .then(res => setMembers(res.data))
        .catch(() => setMembers([]));
    } catch {
      // Not logged in / no workspace yet -- filters just won't offer people.
    }
  }, []);

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
    if (!boardId) return;
    try {
      const [backlogRes, sprintsData] = await Promise.all([
        TaskService.getBacklog(boardId),
        // Sprints being disabled shouldn't break the backlog tab -- same
        // reasoning as loadBoard above.
        SprintService.getAll(boardId).then(res => res.data).catch(() => []),
      ]);
      setBacklogTasks(backlogRes.data);
      setSprints(sprintsData);

      const open = sprintsData.filter(s => s.status !== 'completed');
      const entries = await Promise.all(open.map(s =>
        TaskService.getBySprint(boardId, s.sprint_id).then(res => [s.sprint_id, res.data])
      ));
      setSprintTasksById(Object.fromEntries(entries));
    } catch (e) {
      toast({ title: "Couldn't load backlog", status: "error", duration: 3000, isClosable: true });
    }
  }, [boardId, toast]);

  // Refresh whatever the user is looking at. Only the very first load shows
  // the full-page spinner -- later refreshes update in place so an edit
  // made from the Backlog tab doesn't bounce the user back to the Board.
  const refresh = useCallback(() => {
    loadBoard();
    if (tabIndex === BACKLOG_TAB) loadBacklogView();
  }, [loadBoard, loadBacklogView, tabIndex]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const persistColumns = (statuses, state) => {
    statuses.forEach(status => {
      Promise.all((state[status] || []).map((task, index) =>
        TaskService.update(task.task_id, { status, order: index, board_id: boardId })
      )).catch(() => {
        toast({ title: "Couldn't save card position", status: "error", duration: 3000, isClosable: true });
        loadBoard();
      });
    });
  };

  const openNewCard = newCardDisclosure.onOpen;
  const handleAddCard = useCallback((status) => {
    setNewCardStatus(status);
    openNewCard();
  }, [openNewCard]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'c' || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(document.activeElement)) return;
      if (newCardDisclosure.isOpen || editTaskDisclosure.isOpen || document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      handleAddCard(columns[0]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [columns, handleAddCard, newCardDisclosure.isOpen, editTaskDisclosure.isOpen]);

  // ?selectedIssue=ENG-42 opens that issue (shared links, /browse
  // redirects), and opening a card puts its key in the URL.
  const { selectIssue, clearSelectedIssue } = useSelectedIssue((task) => {
    setCurrentTask(task);
    editTaskDisclosure.onOpen();
  });

  const handleCardClick = (task) => {
    setCurrentTask(task);
    editTaskDisclosure.onOpen();
    selectIssue(task);
  };

  const handleTabChange = (index) => {
    setTabIndex(index);
    if (index === BACKLOG_TAB) loadBacklogView();
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
      if (filters.epicId === epicId) setFilters(prev => ({ ...prev, epicId: '' }));
      refresh();
    } catch {
      toast({ title: "Couldn't delete epic", status: "error", duration: 3000, isClosable: true });
    }
  };

  // Jira pre-fills new sprints as "<KEY> Sprint <n>".
  const openCreateSprint = () => {
    setNewSprintName(`${board?.key || board?.name || ''} Sprint ${sprints.length + 1}`.trim());
    setNewSprintGoal('');
    sprintModal.onOpen();
  };

  const handleCreateSprint = async () => {
    if (!newSprintName.trim()) return;
    try {
      await SprintService.create(boardId, { name: newSprintName.trim(), goal: newSprintGoal || null });
      sprintModal.onClose();
      loadBacklogView();
    } catch {
      toast({ title: "Couldn't create sprint", status: "error", duration: 3000, isClosable: true });
    }
  };

  const openStartSprint = (sprint) => {
    setSprintToStart(sprint);
    startSprintModal.onOpen();
  };

  const handleStartSprint = async ({ name, goal, start_date, end_date }) => {
    try {
      await SprintService.update(boardId, sprintToStart.sprint_id, { name, goal, start_date, end_date });
      await SprintService.start(boardId, sprintToStart.sprint_id);
      toast({ title: `${name} started`, status: "success", duration: 2500, isClosable: true });
      loadBoard();
      loadBacklogView();
      return true;
    } catch (e) {
      toast({ title: e.response?.data?.detail || "Couldn't start sprint", status: "error", duration: 3000, isClosable: true });
      return false;
    }
  };

  const handleCompleteSprint = async () => {
    try {
      await SprintService.complete(boardId, activeSprint.sprint_id);
      toast({ title: `${activeSprint.name} completed`, status: "success", duration: 2500, isClosable: true });
      loadBoard();
      loadBacklogView();
      return true;
    } catch (e) {
      toast({ title: e.response?.data?.detail || "Couldn't complete sprint", status: "error", duration: 3000, isClosable: true });
      return false;
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
      await TaskService.update(task.task_id, { epic_id: epicId });
      refresh();
    } catch {
      toast({ title: "Couldn't update epic", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleChangeTaskSprint = async (task, sprintId) => {
    try {
      await TaskService.update(task.task_id, { sprint_id: sprintId });
      refresh();
    } catch {
      toast({ title: "Couldn't move issue", status: "error", duration: 3000, isClosable: true });
    }
  };

  // Inline "+ Create issue" from a backlog/sprint container. Errors are
  // surfaced by the inline input itself, so let them propagate.
  const handleInlineCreate = (sprintId) => async (title, issueType) => {
    await TaskService.create({
      title,
      task_type: 'task',
      status: columns[0],
      priority: 'medium',
      board_id: boardId,
      sprint_id: sprintId || null,
      meta_data: { issue_type: issueType },
    });
    loadBacklogView();
    if (sprintId && sprintId === activeSprint?.sprint_id) loadBoard();
  };

  const moveTargetsFor = (sprintId) => () => [
    ...(sprintId ? [{ id: '', name: 'Backlog' }] : []),
    ...openSprints.filter(s => s.sprint_id !== sprintId).map(s => ({ id: s.sprint_id, name: s.name })),
  ];

  const containerProps = (sprintId) => ({
    epics,
    epicsById,
    moveTargetsFor: moveTargetsFor(sprintId),
    onOpen: handleCardClick,
    onChangeEpic: handleChangeTaskEpic,
    onChangeSprint: handleChangeTaskSprint,
    onCreate: handleInlineCreate(sprintId),
  });

  if (!boardsEnabled) {
    return <FeatureDisabledPage featureName="Boards" />;
  }

  if (loading || error || !board) {
    return (
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }}>
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Center py={20}>
            {loading ? <Spinner /> : <Text color="red.500">{error || "Board not found"}</Text>}
          </Center>
        </Box>
      </Box>
    );
  }

  const activeSprintTasks = activeSprint ? (sprintTasksById[activeSprint.sprint_id] || []) : [];
  const doneInSprint = boardTasks.filter(t => t.status === 'done').length;

  return (
    <Box minH="100vh" bg={pageBg}>
      <Navbar isCollapsed={isMenuCollapsed} />
      <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
        <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
        <Box as="main" p={{ base: 3, md: 4 }} minH="calc(100vh - 4rem)" bg={mainBg} borderRadius="lg" boxShadow="sm">
          <HStack mb={1} justify="space-between" flexWrap="wrap" gap={2}>
            <HStack>
              <IconButton icon={<FiArrowLeft />} variant="ghost" size="sm" aria-label="Back to boards" onClick={() => navigate('/boards')} />
              <Icon as={BsKanban} color="teal.500" />
              <Heading size="lg">{tabIndex === BOARD_TAB && activeSprint ? activeSprint.name : board.name}</Heading>
              {board.key && <Badge variant="outline" colorScheme="gray">{board.key}</Badge>}
            </HStack>
            <HStack>
              {tabIndex === BOARD_TAB && sprintsEnabled && activeSprint && (
                <>
                  {sprintRemaining && (
                    <HStack spacing={1} color={sprintRemaining.overdue ? 'red.500' : 'gray.500'}>
                      <Icon as={FiClock} />
                      <Text fontSize="sm">{sprintRemaining.text}</Text>
                    </HStack>
                  )}
                  <Button size="sm" leftIcon={<FiCheckCircle />} colorScheme="teal" onClick={completeSprintModal.onOpen}>
                    Complete sprint
                  </Button>
                </>
              )}
              {epicsEnabled && (
                <Button size="sm" variant="outline" onClick={epicsModal.onOpen}>Manage Epics</Button>
              )}
              <Tooltip label={<>Create issue <Kbd>c</Kbd></>}>
                <Button size="sm" leftIcon={<FiPlus />} colorScheme="teal" variant="solid" onClick={() => handleAddCard(columns[0])}>
                  Create
                </Button>
              </Tooltip>
            </HStack>
          </HStack>
          {tabIndex === BOARD_TAB && activeSprint && (
            <Text fontSize="sm" color="gray.500" mb={3} ml={10}>
              {[board.name, formatSprintDates(activeSprint), activeSprint.goal && `Goal: ${activeSprint.goal}`].filter(Boolean).join(' · ')}
            </Text>
          )}

          <Tabs colorScheme="teal" index={tabIndex} onChange={handleTabChange} mt={2}>
            <TabList>
              <Tab>{activeSprint ? 'Active sprint' : 'Board'}</Tab>
              <Tab>Backlog</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <BoardFilters
                  filters={filters}
                  onChange={setFilters}
                  members={members}
                  epics={epicsEnabled ? epics : []}
                  groupBy={groupBy}
                  onGroupByChange={setGroupBy}
                />
                <KanbanBoard
                  columns={columns}
                  tasksByStatus={tasksByStatus}
                  setTasksByStatus={setTasksByStatus}
                  isVisible={isVisible}
                  groupBy={groupBy}
                  epics={epics}
                  epicsById={epicsById}
                  currentUserId={currentUserId}
                  onCardClick={handleCardClick}
                  onAddCard={handleAddCard}
                  onPersist={persistColumns}
                />
              </TabPanel>

              <TabPanel px={0}>
                <BoardFilters
                  filters={filters}
                  onChange={setFilters}
                  members={members}
                  epics={epicsEnabled ? epics : []}
                />
                <VStack align="stretch" spacing={4}>
                  {sprintsEnabled && activeSprint && (
                    <BacklogContainer
                      title={activeSprint.name}
                      badge={<Badge colorScheme="teal">Active</Badge>}
                      subtitle={[formatSprintDates(activeSprint), activeSprint.goal && `Goal: ${activeSprint.goal}`].filter(Boolean).join(' · ')}
                      tasks={activeSprintTasks.filter(isVisible)}
                      totalCount={activeSprintTasks.length}
                      emptyText="No issues in this sprint."
                      actions={
                        <Button size="xs" leftIcon={<FiCheckCircle />} colorScheme="teal" onClick={completeSprintModal.onOpen}>
                          Complete sprint
                        </Button>
                      }
                      {...containerProps(activeSprint.sprint_id)}
                    />
                  )}

                  {sprintsEnabled && plannedSprints.map(sprint => {
                    const sprintTasks = sprintTasksById[sprint.sprint_id] || [];
                    return (
                      <BacklogContainer
                        key={sprint.sprint_id}
                        title={sprint.name}
                        subtitle={[formatSprintDates(sprint), sprint.goal && `Goal: ${sprint.goal}`].filter(Boolean).join(' · ')}
                        tasks={sprintTasks.filter(isVisible)}
                        totalCount={sprintTasks.length}
                        emptyText="Plan a sprint by moving issues here from the backlog."
                        actions={
                          <>
                            <Tooltip label={activeSprint ? "Complete the active sprint first" : ""}>
                              <Button size="xs" leftIcon={<FiPlay />} isDisabled={!!activeSprint} onClick={() => openStartSprint(sprint)}>
                                Start sprint
                              </Button>
                            </Tooltip>
                            <Menu>
                              <MenuButton as={IconButton} icon={<FiMoreVertical />} size="xs" variant="ghost" aria-label="Sprint options" />
                              <MenuList>
                                <MenuItem icon={<FiTrash2 />} onClick={() => handleDeleteSprint(sprint.sprint_id)}>Delete sprint</MenuItem>
                              </MenuList>
                            </Menu>
                          </>
                        }
                        {...containerProps(sprint.sprint_id)}
                      />
                    );
                  })}

                  <BacklogContainer
                    title="Backlog"
                    tasks={backlogTasks.filter(isVisible)}
                    totalCount={backlogTasks.length}
                    emptyText="Your backlog is empty."
                    actions={sprintsEnabled && (
                      <Button size="xs" leftIcon={<FiPlus />} onClick={openCreateSprint}>Create sprint</Button>
                    )}
                    {...containerProps(null)}
                  />
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
            onClose: () => { newCardDisclosure.onClose(); refresh(); },
          }}
          // While a sprint is running the board only shows that sprint's
          // cards -- create into it, or the new card would land in the
          // backlog and vanish from the column it was added to.
          defaultValues={{
            status: newCardStatus,
            board_id: boardId,
            ...(sprintsEnabled && activeSprint ? { sprint_id: activeSprint.sprint_id } : {}),
          }}
        />
      )}
      <EditTaskDrawer
        currentTask={currentTask}
        setCurrentTask={setCurrentTask}
        disclosures={{
          isOpen: editTaskDisclosure.isOpen,
          onClose: () => { editTaskDisclosure.onClose(); clearSelectedIssue(); },
        }}
        onTaskUpdate={refresh}
      />

      <StartSprintModal
        isOpen={startSprintModal.isOpen}
        onClose={startSprintModal.onClose}
        sprint={sprintToStart}
        issueCount={sprintToStart ? (sprintTasksById[sprintToStart.sprint_id] || []).length : 0}
        onStart={handleStartSprint}
      />
      <CompleteSprintModal
        isOpen={completeSprintModal.isOpen}
        onClose={completeSprintModal.onClose}
        sprint={activeSprint}
        doneCount={doneInSprint}
        openCount={boardTasks.length - doneInSprint}
        onComplete={handleCompleteSprint}
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
                      as="button"
                      type="button"
                      aria-label={`Epic color ${color}`}
                      aria-pressed={newEpicColor === color}
                      w="24px" h="24px" borderRadius="full" bg={color}
                      border={newEpicColor === color ? "2px solid" : "2px solid transparent"}
                      borderColor={newEpicColor === color ? swatchBorder : 'transparent'}
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

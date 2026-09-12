import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { retrieveTasks, retrieveNotes, updateTask } from "@/slices/tasks";
import { fetchWorkspaceActivity } from "@/slices/workspaceActivity";
import { selectIsModuleEnabled } from "@/slices/modules";
import {
  Box,
  Flex,
  Grid,
  Text,
  useDisclosure,
  Tbody,
  Table,
  Thead,
  Th,
  Tr,
  Td,
  VStack,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Badge,
  useColorModeValue,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Heading,
  Stack,
  StackDivider,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
} from "@chakra-ui/react";
import {
  FiSearch,
  FiFilter,
  FiCalendar,
  FiTag,
  FiBook,
  FiFileText,
  FiDatabase,
  FiUsers,
  FiBarChart2,
  FiPlus,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiStar,
  FiChevronRight,
  FiEye,
  FiMessageSquare,
  FiBell,
  FiSettings,
  FiInbox,
  FiAlertCircle,
  FiCheckCircle,
  FiActivity,
} from 'react-icons/fi';
import { BsKanban } from 'react-icons/bs';
import Navbar from "@/components/dashboard/Navbar";
import EditTaskDrawer from "@/components/dashboard/drawers/EditTaskDrawer";
import EditNoteDrawer from "@/components/dashboard/drawers/EditNoteDrawer";
import Header from "@/components/dashboard/Header";
import Head from 'next/head';
import { formatLocalDateTime, timeAgo } from "@/utils/locale";
import { useRouter } from "next/router";
import NewTaskDrawer from "@/components/dashboard/drawers/NewTaskDrawer";
import NewNoteDrawer from "@/components/dashboard/drawers/NewNoteDrawer";
import TaskViewModal from "@/components/dashboard/modals/TaskViewModal";
import NoteViewModal from "@/components/dashboard/modals/NoteViewModal";
import DeleteTaskNoteModal from "@/components/dashboard/modals/DeleteTaskNoteModal";
import ConfigService from "@/utils/config";
import auth from "@/utils/auth";
import { labelForStatus, getStatusColor, PRIORITY_COLOR, labelForPriority } from "@/utils/taskStatus";

const QUICK_LINKS = [
  { label: 'Boards', icon: BsKanban, path: '/boards', description: 'Kanban boards, epics & sprints' },
  { label: 'CRM', icon: FiUsers, path: '/crm', description: 'Contacts, companies & deals' },
  { label: 'Wiki', icon: FiBook, path: '/wiki', description: 'Docs & knowledge base' },
  { label: 'Database', icon: FiDatabase, path: '/database', description: 'Custom tables' },
  { label: 'Reports', icon: FiBarChart2, path: '/reports', description: 'Analytics & insights' },
  { label: 'Chat', icon: FiMessageSquare, path: '/chat', description: 'Team messaging' },
  { label: 'Reminders', icon: FiBell, path: '/reminders', description: 'Time-based nudges' },
  { label: 'Notifications', icon: FiInbox, path: '/notifications', description: 'Recent alerts' },
  { label: 'Settings', icon: FiSettings, path: '/settings', description: 'Workspace settings' },
];

function activityLine(activity) {
  const who = activity.user ? `${activity.user.first_name} ${activity.user.last_name}` : 'Someone';
  const props = activity.properties || activity.details || {};
  const label = props.ticket_key || props.name || props.title || '';
  const verb = {
    created: 'created',
    updated: 'updated',
    deleted: 'deleted',
    commented: 'commented on',
  }[activity.action] || activity.action;
  return { who, verb, label, entityType: activity.entity_type };
}

export default function DashboardResponsive() {
  const dispatch = useDispatch();
  const { tasks, notes, loading, error } = useSelector((state) => state.tasks);
  const { items: activityItems } = useSelector((state) => state.workspaceActivity);
  const activityEnabled = useSelector((state) => selectIsModuleEnabled(state, 'activity'));
  const notesEnabled = useSelector((state) => selectIsModuleEnabled(state, 'notes'));
  const { isOpen: isTaskEditOpen, onOpen: onTaskEditOpen, onClose: onTaskEditClose } = useDisclosure();
  const { isOpen: isNoteEditOpen, onOpen: onNoteEditOpen, onClose: onNoteEditClose } = useDisclosure();
  const { isOpen: isNewTaskOpen, onOpen: onNewTaskOpen, onClose: onNewTaskClose } = useDisclosure();
  const { isOpen: isNewNoteOpen, onOpen: onNewNoteOpen, onClose: onNewNoteClose } = useDisclosure();
  const [selectedTask, setSelectedTask] = useState({ task_id: "", title: "", description: "", status: "" });
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const delete_modal = useDisclosure();

  const currentUserId = auth.getProfile()?.user_id;
  let workspaceId = null;
  try {
    workspaceId = ConfigService.getDefaultWorkspace()?.workspace_id;
  } catch (e) {
    workspaceId = null;
  }

  useEffect(() => {
    dispatch(retrieveTasks());
    // Notes rides on the same always-on /tasks endpoint as Tasks itself
    // (task_type=NOTE), so this fetch never 403s -- but Notes is still a
    // nav-only toggle (Settings > Modules), so skip it anyway to respect
    // "hide this feature" rather than quietly loading data for a
    // dashboard section that's about to be hidden below.
    if (notesEnabled) {
      dispatch(retrieveNotes());
    }
    // Activity is a toggleable module (Settings > Modules) -- skip the
    // request when it's off instead of eating a 403 on every dashboard
    // load.
    if (workspaceId && activityEnabled) {
      dispatch(fetchWorkspaceActivity(workspaceId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, activityEnabled, notesEnabled]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const openTasks = (tasks || []).filter(t => !t.completed);
    const overdueTasks = openTasks.filter(t => t.due_on && new Date(t.due_on) < now);
    const completedThisWeek = (tasks || []).filter(t => t.completed && t.updated_at && new Date(t.updated_at) >= weekAgo);
    return {
      open: openTasks.length,
      overdue: overdueTasks.length,
      completedThisWeek: completedThisWeek.length,
    };
  }, [tasks]);

  const myTaskIds = useMemo(() => new Set((tasks || []).map(t => t.task_id)), [tasks]);

  const othersOnMyTasks = useMemo(() => {
    return (activityItems || []).filter(a =>
      a.entity_type === 'task' && myTaskIds.has(a.entity_id) && a.user_id !== currentUserId
    );
  }, [activityItems, myTaskIds, currentUserId]);

  const handleUpdateItem = (task) => {
    setSelectedTask(task);
    onTaskEditOpen();
  };

  const handleDeleteItem = (item) => {
    setSelectedTask(item);
    delete_modal.onOpen();
  };

  const handleTaskUpdate = async (updatedTask) => {
    try {
      onTaskEditClose();
      await dispatch(updateTask({
        task_id: updatedTask.task_id,
        data: updatedTask
      })).unwrap();
      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleUpdateNote = (note) => {
    setSelectedTask({
      task_id: note.task_id,
      title: note.title,
      description: note.description || '',
      status: note.status || '',
      task_type: 'note'
    });
    onNoteEditOpen();
  };

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'gray.200');

  const TaskCard = React.memo(({ task }) => {
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    return (
      <>
        <Card key={task.task_id} bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <VStack align="start" spacing={0}>
                {task.ticket_key && (
                  <Text fontSize="2xs" fontWeight="bold" color="gray.500">{task.ticket_key}</Text>
                )}
                <Heading size="sm">{task.title}</Heading>
              </VStack>
              <HStack spacing={1}>
                <IconButton
                  aria-label="View Task"
                  icon={<FiEye />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsViewModalOpen(true)}
                />
                <Menu>
                  <MenuButton
                    as={IconButton}
                    icon={<FiMoreVertical />}
                    variant="ghost"
                    size="sm"
                  />
                  <MenuList>
                    <MenuItem icon={<FiEdit2 />} onClick={() => handleUpdateItem(task)}>
                      Edit
                    </MenuItem>
                    <MenuItem icon={<FiTrash2 />} onClick={() => handleDeleteItem(task)}>
                      Delete
                    </MenuItem>
                  </MenuList>
                </Menu>
              </HStack>
            </Flex>
          </CardHeader>
          <CardBody>
            <Stack divider={<StackDivider />} spacing="4">
              <Flex wrap="wrap" gap={2}>
                <Badge colorScheme={PRIORITY_COLOR[task.priority] || 'gray'}>
                  {labelForPriority(task.priority)}
                </Badge>
                <Badge colorScheme={getStatusColor(task.status)}>
                  {labelForStatus(task.status)}
                </Badge>
              </Flex>
            </Stack>
          </CardBody>
          <CardFooter>
            <Text fontSize="xs" color="gray.500">
              Updated: {formatLocalDateTime(task.updated_at)}
            </Text>
          </CardFooter>
        </Card>
        <TaskViewModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          task={task}
          onEdit={handleUpdateItem}
        />
      </>
    );
  });
  TaskCard.displayName = 'TaskCard';

  const NoteCard = React.memo(({ note }) => {
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    return (
      <>
        <Card key={note.task_id} bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="sm">{note.title}</Heading>
              <HStack spacing={1}>
                <IconButton
                  aria-label="View Note"
                  icon={<FiEye />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsViewModalOpen(true)}
                />
                <Menu>
                  <MenuButton
                    as={IconButton}
                    icon={<FiMoreVertical />}
                    variant="ghost"
                    size="sm"
                  />
                  <MenuList>
                    <MenuItem icon={<FiEdit2 />} onClick={() => handleUpdateNote(note)}>
                      Edit
                    </MenuItem>
                    <MenuItem icon={<FiTrash2 />} onClick={() => handleDeleteItem(note)}>
                      Delete
                    </MenuItem>
                  </MenuList>
                </Menu>
              </HStack>
            </Flex>
          </CardHeader>
          <CardBody>
            <Stack divider={<StackDivider />} spacing="4" />
          </CardBody>
          <CardFooter>
            <Text fontSize="xs" color="gray.500">
              Updated: {formatLocalDateTime(note.updated_at)}
            </Text>
          </CardFooter>
        </Card>
        <NoteViewModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          note={note}
          onEdit={handleUpdateNote}
        />
      </>
    );
  });
  NoteCard.displayName = 'NoteCard';

  if (loading) {
    return (
      <Box minH="100vh" bg={bgColor} p={4}>
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box minH="100vh" bg={bgColor} p={4}>
        <Text color="red.500">Error: {error}</Text>
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>GridWork Dashboard</title>
        <meta name="description" content="App Description" />
        <meta name="theme-color" content="#008f68" />
      </Head>
      <EditTaskDrawer
        currentTask={selectedTask}
        setCurrentTask={setSelectedTask}
        disclosures={{ isOpen: isTaskEditOpen, onClose: onTaskEditClose }}
        onTaskUpdate={handleTaskUpdate}
      />
      <EditNoteDrawer
        currentTask={selectedTask}
        setCurrentTask={setSelectedTask}
        disclosures={{ isOpen: isNoteEditOpen, onClose: onNoteEditClose }}
        onTaskUpdate={handleTaskUpdate}
      />
      <NewTaskDrawer
        currentTask={{}}
        disclosures={{ isOpen: isNewTaskOpen, onClose: onNewTaskClose }}
      />
      <NewNoteDrawer
        currentTask={{}}
        disclosures={{ isOpen: isNewNoteOpen, onClose: onNewNoteClose }}
      />
      {selectedTask && selectedTask.task_id && (
        <DeleteTaskNoteModal
          currentTask={selectedTask}
          disclosures={delete_modal}
          type="task"
        />
      )}

      <Box minH="100vh" bg={bgColor}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box
          ml={{ base: 0, md: isMenuCollapsed ? "60px" : "250px" }}
          transition="all 0.3s ease"
          minH="100vh"
        >
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Box p="3">
            <VStack spacing={8} align="stretch">
              {/* Quick Actions */}
              <Flex justify="space-between" align="center">
                <Text fontSize="xl" fontWeight="bold">Quick Actions</Text>
                <HStack spacing={4}>
                  <Button
                    leftIcon={<Icon as={FiPlus} />}
                    colorScheme="blue"
                    variant="solid"
                    onClick={onNewTaskOpen}
                  >
                    New Task
                  </Button>
                  {notesEnabled && (
                    <Button
                      leftIcon={<Icon as={FiPlus} />}
                      colorScheme="blue"
                      variant="solid"
                      onClick={onNewNoteOpen}
                    >
                      New Note
                    </Button>
                  )}
                </HStack>
              </Flex>

              {/* Stats */}
              <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
                <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                  <CardBody>
                    <HStack justify="space-between">
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" color="gray.500">Open Tasks</Text>
                        <Heading size="lg">{stats.open}</Heading>
                      </VStack>
                      <Icon as={FiInbox} boxSize={6} color="blue.400" />
                    </HStack>
                  </CardBody>
                </Card>
                <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                  <CardBody>
                    <HStack justify="space-between">
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" color="gray.500">Overdue</Text>
                        <Heading size="lg" color={stats.overdue > 0 ? "red.500" : undefined}>{stats.overdue}</Heading>
                      </VStack>
                      <Icon as={FiAlertCircle} boxSize={6} color="red.400" />
                    </HStack>
                  </CardBody>
                </Card>
                <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                  <CardBody>
                    <HStack justify="space-between">
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" color="gray.500">Completed This Week</Text>
                        <Heading size="lg" color="green.500">{stats.completedThisWeek}</Heading>
                      </VStack>
                      <Icon as={FiCheckCircle} boxSize={6} color="green.400" />
                    </HStack>
                  </CardBody>
                </Card>
              </SimpleGrid>

              {/* Quick Links */}
              <Box>
                <Text fontSize="xl" fontWeight="bold" mb={4}>Quick Links</Text>
                <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={4}>
                  {QUICK_LINKS.map((link) => (
                    <Card
                      key={link.path}
                      bg={cardBg}
                      borderWidth="1px"
                      borderColor={borderColor}
                      cursor="pointer"
                      _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
                      transition="all 0.15s ease"
                      onClick={() => navigate(link.path)}
                    >
                      <CardBody>
                        <VStack align="start" spacing={2}>
                          <Icon as={link.icon} boxSize={5} color="blue.500" />
                          <Text fontWeight="semibold" fontSize="sm">{link.label}</Text>
                          <Text fontSize="xs" color="gray.500" noOfLines={2}>{link.description}</Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </Box>

              {/* Tasks Section */}
              <Box>
                <Flex justify="space-between" align="center" mb={4}>
                  <Text fontSize="xl" fontWeight="bold">Recent Tasks</Text>
                  <Button
                    variant="ghost"
                    rightIcon={<Icon as={FiChevronRight} />}
                    onClick={() => navigate('/tasks')}
                  >
                    View All
                  </Button>
                </Flex>
                <Grid
                  templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
                  gap={6}
                >
                  {tasks && tasks.slice(0, 6).map((task) => (
                    <TaskCard key={task.task_id} task={task} />
                  ))}
                </Grid>
              </Box>

              {/* Notes Section -- notes is a nav-only toggle (Settings >
                  Modules); hide it rather than show a "Recent Notes"
                  widget for a feature the workspace turned off. */}
              {notesEnabled && (
              <Box>
                <Flex justify="space-between" align="center" mb={4}>
                  <Text fontSize="xl" fontWeight="bold">Recent Notes</Text>
                  <Button
                    variant="ghost"
                    rightIcon={<Icon as={FiChevronRight} />}
                    onClick={() => navigate('/notes')}
                  >
                    View All
                  </Button>
                </Flex>
                <Grid
                  templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
                  gap={6}
                >
                  {notes && notes.slice(0, 6).map((note) => (
                    <NoteCard key={note.task_id} note={note} />
                  ))}
                </Grid>
              </Box>
              )}

              {/* Activity */}
              <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
                <Box>
                  <Text fontSize="xl" fontWeight="bold" mb={4}>Recent Activity</Text>
                  <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                    <CardBody>
                      {activityItems && activityItems.length > 0 ? (
                        <Stack divider={<StackDivider />} spacing={3}>
                          {activityItems.slice(0, 10).map((activity) => {
                            const { who, verb, label, entityType } = activityLine(activity);
                            return (
                              <HStack key={activity.activity_id} justify="space-between" align="start">
                                <HStack align="start" spacing={3}>
                                  <Avatar size="xs" name={who} mt={0.5} />
                                  <Text fontSize="sm">
                                    <Text as="span" fontWeight="semibold">{who}</Text>
                                    {` ${verb} ${entityType}`}
                                    {label && <Text as="span" fontWeight="semibold"> {label}</Text>}
                                  </Text>
                                </HStack>
                                <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">{timeAgo(activity.created_at)}</Text>
                              </HStack>
                            );
                          })}
                        </Stack>
                      ) : (
                        <Text color="gray.500" fontSize="sm">No activity yet in this workspace.</Text>
                      )}
                    </CardBody>
                  </Card>
                </Box>

                <Box>
                  <Text fontSize="xl" fontWeight="bold" mb={4}>Activity On Your Tasks</Text>
                  <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                    <CardBody>
                      {othersOnMyTasks.length > 0 ? (
                        <Stack divider={<StackDivider />} spacing={3}>
                          {othersOnMyTasks.slice(0, 10).map((activity) => {
                            const { who, verb, label } = activityLine(activity);
                            return (
                              <HStack key={activity.activity_id} justify="space-between" align="start">
                                <HStack align="start" spacing={3}>
                                  <Icon as={FiActivity} color="purple.400" mt={1} />
                                  <Text fontSize="sm">
                                    <Text as="span" fontWeight="semibold">{who}</Text>
                                    {` ${verb} `}
                                    {label && <Text as="span" fontWeight="semibold">{label}</Text>}
                                  </Text>
                                </HStack>
                                <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">{timeAgo(activity.created_at)}</Text>
                              </HStack>
                            );
                          })}
                        </Stack>
                      ) : (
                        <Text color="gray.500" fontSize="sm">No one else has touched your tasks recently.</Text>
                      )}
                    </CardBody>
                  </Card>
                </Box>
              </Grid>
            </VStack>
          </Box>
        </Box>
      </Box>
    </>
  );
}

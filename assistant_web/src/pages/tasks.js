import {
  Avatar,
  Icon,
  useColorModeValue,
  Box,
  Flex,
  Stack,
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
  Badge,
  IconButton,
  Heading,
  Button
} from '@chakra-ui/react';
// Here we have used react-icons package for the icons
import { StatusIndicator } from '@/components/dashboard/StatusIndicator'
import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { retrieveTasks, updateTask } from "@/slices/tasks";
import { AddIcon } from '@chakra-ui/icons';
import Navbar from "@/components/dashboard/Navbar";
import EditTaskDrawer from "@/components/dashboard/drawers/EditTaskDrawer";
import NewTaskDrawer from "@/components/dashboard/drawers/NewTaskDrawer";
import DeleteTaskNoteModal from "@/components/dashboard/modals/DeleteTaskNoteModal";
import Head from 'next/head';
import { formatLocalDateTime } from "@/utils/locale"
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
import Header from "@/components/dashboard/Header";
import { useRouter } from 'next/router';
import { FaTrash, FaEdit, FaEye } from 'react-icons/fa';
import TaskViewModal from "@/components/dashboard/modals/TaskViewModal";
import UnifiedEditButton from "@/components/dashboard/UnifiedEditButton";
import UnifiedCreateButton from "@/components/dashboard/UnifiedCreateButton";
import { ChevronRightIcon } from '@chakra-ui/icons';
import { FiEye, FiTrash2, FiExternalLink, FiPlus } from 'react-icons/fi';
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TASK_STATUSES, labelForStatus, getStatusColor, PRIORITY_COLOR } from '@/utils/taskStatus';
import { selectIsModuleEnabled } from '@/slices/modules';
import FeatureDisabledPage from '@/components/dashboard/FeatureDisabledPage';

function KanbanTaskCard({ task, onClick }) {
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
      boxShadow="sm"
      cursor="grab"
      onClick={() => onClick(task)}
      _hover={{ boxShadow: 'md' }}
    >
      {task.ticket_key && (
        <Text fontSize="2xs" fontWeight="bold" color="gray.500" mb={1}>{task.ticket_key}</Text>
      )}
      <Text fontSize="sm" fontWeight="medium" mb={2} noOfLines={3}>{task.title}</Text>
      <HStack spacing={2} flexWrap="wrap">
        <Badge colorScheme={PRIORITY_COLOR[task.priority] || 'gray'} fontSize="2xs">{task.priority || 'none'}</Badge>
        {task.due_on && (
          <Text fontSize="2xs" color="gray.500">{new Date(task.due_on).toLocaleDateString()}</Text>
        )}
      </HStack>
    </Box>
  );
}

function KanbanStatusColumn({ status, tasks, onCardClick }) {
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
          <Text fontWeight="bold" fontSize="sm">{labelForStatus(status)}</Text>
          <Badge borderRadius="full" colorScheme={getStatusColor(status)}>{tasks.length}</Badge>
        </HStack>
      </HStack>
      <SortableContext items={tasks.map(t => t.task_id)} strategy={verticalListSortingStrategy}>
        <Box minH="40px">
          {tasks.map(task => (
            <KanbanTaskCard key={task.task_id} task={task} onClick={onCardClick} />
          ))}
        </Box>
      </SortableContext>
    </Box>
  );
}

export default function TasksPage() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const menu_open = useDisclosure();
  const [currentTask, setCurrentTask] = useState({ task_id: "", title: "", descrtiption: "", status: "" });
  const delete_modal = useDisclosure()
  const edit_task_drawer = useDisclosure()
  const new_task_drawer = useDisclosure()
  const view_task_modal = useDisclosure()
  const tasks = useSelector(state => state.tasks.tasks);
  const tasksEnabled = useSelector((state) => selectIsModuleEnabled(state, 'tasks'));
  const dispatch = useDispatch();
  const router = useRouter();
  const navigate = (path) => router.push(path);

  const handleDeleteItem = (task) => {
    setCurrentTask(task);
    delete_modal.onOpen(true);
  };

  const handleAddItem = () => {
    new_task_drawer.onOpen();
  };

  const handleUpdateItem = (task) => {
    setCurrentTask(task);
    edit_task_drawer.onOpen();
  };

  const handleTaskUpdate = (updatedTask) => {
    dispatch(updateTask({ task_id: updatedTask.task_id, data: updatedTask }))
      .unwrap()
      .then(() => {
        dispatch(retrieveTasks());
      });
  };

  const handleViewItem = (task) => {
    setCurrentTask(task);
    view_task_modal.onOpen();
  };

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'gray.200');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');

  const initFetch = useCallback(() => {
    dispatch(retrieveTasks());
  }, [dispatch])

  useEffect(() => {
    initFetch()
  }, [initFetch])

  useEffect(() => {
    if (!edit_task_drawer.isOpen) {
      initFetch();
    }
  }, [edit_task_drawer.isOpen]);

  useEffect(() => {
    if (!new_task_drawer.isOpen) {
      initFetch();
    }
  }, [new_task_drawer.isOpen]);

  const [tasksByStatus, setTasksByStatus] = useState({});
  const [activeTask, setActiveTask] = useState(null);

  const groupTasksByStatus = useCallback((list) => {
    const grouped = Object.fromEntries(TASK_STATUSES.map(s => [s, []]));
    for (const task of list) {
      const status = TASK_STATUSES.includes(task.status) ? task.status : 'todo';
      (grouped[status] || (grouped[status] = [])).push(task);
    }
    return grouped;
  }, []);

  useEffect(() => {
    setTasksByStatus(groupTasksByStatus(tasks || []));
  }, [tasks, groupTasksByStatus]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const findStatusContainer = (id) => {
    if (id in tasksByStatus) return id;
    return Object.keys(tasksByStatus).find(s => tasksByStatus[s].some(t => t.task_id === id));
  };

  const handleDragStart = (event) => {
    const task = Object.values(tasksByStatus).flat().find(t => t.task_id === event.active.id);
    setActiveTask(task);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findStatusContainer(active.id);
    const overContainer = findStatusContainer(over.id);
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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeContainer = findStatusContainer(active.id);
    const overContainer = findStatusContainer(over.id);
    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer && active.id !== over.id) {
      setTasksByStatus(prev => {
        const items = prev[activeContainer];
        const oldIndex = items.findIndex(t => t.task_id === active.id);
        const newIndex = items.findIndex(t => t.task_id === over.id);
        return { ...prev, [activeContainer]: arrayMove(items, oldIndex, newIndex) };
      });
      return;
    }

    // Dropped in a different status column -- persist the status change;
    // on failure, re-sync from the server so the board doesn't drift.
    dispatch(updateTask({ task_id: active.id, data: { status: overContainer } }))
      .unwrap()
      .catch(() => initFetch());
  };

  if (!tasksEnabled) {
    return <FeatureDisabledPage featureName="Tasks" />;
  }

  return (
    <>
      <Head>
        <title>Tasks - GridWork</title>
        <meta name="description" content="Task Management" />
      </Head>

      <Box minH="100vh" bg={bgColor}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box
          ml={{ base: 0, md: isMenuCollapsed ? "60px" : "250px" }}
          transition="all 0.3s ease"
          minH="100vh"
        >
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Box p="3">
            <Stack spacing={6}>
              {/* Header Section */}
              <Flex
                justifyContent="space-between"
                alignItems="center"
                p={6}
                bg={cardBg}
                borderRadius="lg"
                boxShadow="sm"
                borderWidth="1px"
                borderColor={borderColor}
              >
                <VStack align="start" spacing={1}>
                  <Heading size="lg" color={textColor}>Tasks</Heading>
                  <Text color={subTextColor}>Manage your tasks and to-dos</Text>
                </VStack>

                <Button
                  leftIcon={<FiPlus />}
                  colorScheme="blue"
                  onClick={() => new_task_drawer.onOpen()}
                >
                  Add Task
                </Button>
              </Flex>

              <Tabs variant="enclosed" colorScheme="blue" defaultIndex={0}>
                <TabList>
                  <Tab>Board View</Tab>
                  <Tab>Table View</Tab>
                </TabList>

                <TabPanels>
                  <TabPanel p={0} mt={4}>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCorners}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                    >
                      <Flex gap={4} overflowX="auto" pb={4} align="flex-start">
                        {TASK_STATUSES.map(status => (
                          <KanbanStatusColumn
                            key={status}
                            status={status}
                            tasks={tasksByStatus[status] || []}
                            onCardClick={handleViewItem}
                          />
                        ))}
                      </Flex>
                      <DragOverlay>
                        {activeTask ? (
                          <Box bg="white" p={3} borderRadius="md" boxShadow="lg" maxW="250px">
                            <Text fontSize="sm" fontWeight="medium">{activeTask.title}</Text>
                          </Box>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  </TabPanel>

                  <TabPanel p={0} mt={4}>
                    <Box overflowX="auto">
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Title</Th>
                            <Th>Due On</Th>
                            <Th>Created At</Th>
                            <Th>Status</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {tasks.map((task, index) => (
                            <Tr key={index}>
                              <Td>
                                <HStack spacing={2} cursor="pointer" onClick={() => handleUpdateItem(task)}>
                                  {task.ticket_key && (
                                    <Text fontSize="xs" fontWeight="bold" color="gray.500">{task.ticket_key}</Text>
                                  )}
                                  <Text fontWeight="medium">
                                    {task.title}
                                  </Text>
                                </HStack>
                              </Td>
                              <Td>{formatLocalDateTime(task.due_on)}</Td>
                              <Td>{formatLocalDateTime(task.created_at)}</Td>
                              <Td>
                                <StatusIndicator status={task.status} />
                              </Td>
                              <Td>
                                <HStack spacing={2}>
                                  <IconButton
                                    icon={<FiEye />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleViewItem(task)}
                                    aria-label="View Task"
                                  />
                                  <IconButton
                                    icon={<FiExternalLink />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => navigate(`/page-detail?task_id=${task.task_id}`)}
                                    aria-label="Open in new page"
                                  />
                                  <UnifiedEditButton
                                    item={task}
                                    type="task"
                                    onEdit={handleUpdateItem}
                                  />
                                  <IconButton
                                    icon={<FiTrash2 />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteItem(task)}
                                    aria-label="Delete Task"
                                  />
                                </HStack>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Modals and Drawers */}
      <EditTaskDrawer
        currentTask={currentTask}
        setCurrentTask={setCurrentTask}
        disclosures={edit_task_drawer}
        onTaskUpdate={handleTaskUpdate}
      />
      <NewTaskDrawer
        currentTask={{}}
        disclosures={new_task_drawer}
      />
      <DeleteTaskNoteModal
        currentTask={currentTask}
        disclosures={delete_modal}
        type="task"
      />
      <TaskViewModal
        isOpen={view_task_modal.isOpen}
        onClose={view_task_modal.onClose}
        task={currentTask}
        onEdit={handleUpdateItem}
      />
    </>
  );
}

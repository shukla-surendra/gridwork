import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { retrieveTasks } from "../../slices/tasks";
import {
  Box,
  Flex,
  Grid,
  Text,
  useColorModeValue,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Button,
  Icon,
  Stack,
  Badge,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  Checkbox,
  CheckboxGroup,
  Heading,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  VStack,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  HStack,
  IconButton,
} from "@chakra-ui/react";
import { 
  FiSearch, 
  FiFilter, 
  FiCalendar, 
  FiTag, 
  FiUser, 
  FiChevronDown, 
  FiArrowUp, 
  FiArrowDown,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiExternalLink
} from 'react-icons/fi';
import Navbar from "../../components/dashboard/Navbar";
import Header from "../../components/dashboard/Header";
import { formatLocalDateTime } from "../../utils/locale";
import { useRouter } from 'next/router';
import TaskViewModal from "../../components/dashboard/modals/TaskViewModal";
import EditTaskDrawer from "../../components/dashboard/drawers/EditTaskDrawer";
import DeleteTaskNoteModal from "../../components/dashboard/modals/DeleteTaskNoteModal";

export default function SearchTasksPage() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const menu_open = useDisclosure();
  const filterDrawer = useDisclosure();
  const dispatch = useDispatch();
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const tasks = useSelector(state => state.tasks.tasks);
  
  // State for modals and drawers
  const [selectedTask, setSelectedTask] = useState(null);
  const view_modal = useDisclosure();
  const edit_drawer = useDisclosure();
  const delete_modal = useDisclosure();
  
  // Color mode values
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'gray.200');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Get unique tags and users for filters
  const allTags = [...new Set(tasks.flatMap(task => task.tags || []))];
  const allUsers = [...new Set(tasks.map(task => task.assigned_to))];

  const initFetch = useCallback(() => {
    dispatch(retrieveTasks());
  }, [dispatch]);

  useEffect(() => {
    initFetch();
  }, [initFetch]);

  // Filter tasks based on search and filter criteria
  const filteredTasks = tasks
    .filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      
      const matchesTags = selectedTags.length === 0 || 
                         (task.tags && selectedTags.some(tag => task.tags.includes(tag)));
      
      const matchesUsers = selectedUsers.length === 0 || 
                          selectedUsers.includes(task.assigned_to);

      return matchesSearch && matchesStatus && matchesPriority && matchesTags && matchesUsers;
    })
    .sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'created_at') {
        return order * (new Date(a.created_at) - new Date(b.created_at));
      } else if (sortBy === 'due_date') {
        return order * (new Date(a.due_date) - new Date(b.due_date));
      } else if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return order * (priorityOrder[a.priority] - priorityOrder[b.priority]);
      }
      return 0;
    });

  const handleSort = (field) => {
    if (field === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleViewTask = (task) => {
    setSelectedTask(task);
    view_modal.onOpen();
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    edit_drawer.onOpen();
  };

  const handleDeleteTask = (task) => {
    setSelectedTask(task);
    delete_modal.onOpen();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'done':
        return 'green';
      case 'in_progress':
        return 'orange';
      case 'todo':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };

  return (
    <>
      <Box minH="100vh" bg={pageBg}>
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
                  <Heading size="lg" color={textColor}>Search Tasks</Heading>
                  <Text color={subTextColor}>Find and filter your tasks</Text>
                </VStack>

                <Flex gap={2}>
                  <Menu>
                    <MenuButton as={Button} rightIcon={<FiChevronDown />} variant="outline">
                      Sort by: {sortBy.replace('_', ' ')}
                    </MenuButton>
                    <MenuList>
                      <MenuItem onClick={() => handleSort('created_at')}>
                        <Flex align="center" gap={2}>
                          <Icon as={sortBy === 'created_at' ? (sortOrder === 'asc' ? FiArrowUp : FiArrowDown) : null} />
                          Created Date
                        </Flex>
                      </MenuItem>
                      <MenuItem onClick={() => handleSort('due_date')}>
                        <Flex align="center" gap={2}>
                          <Icon as={sortBy === 'due_date' ? (sortOrder === 'asc' ? FiArrowUp : FiArrowDown) : null} />
                          Due Date
                        </Flex>
                      </MenuItem>
                      <MenuItem onClick={() => handleSort('priority')}>
                        <Flex align="center" gap={2}>
                          <Icon as={sortBy === 'priority' ? (sortOrder === 'asc' ? FiArrowUp : FiArrowDown) : null} />
                          Priority
                        </Flex>
                      </MenuItem>
                    </MenuList>
                  </Menu>
                  <Button
                    leftIcon={<FiFilter />}
                    onClick={filterDrawer.onOpen}
                    variant="outline"
                  >
                    Filters
                  </Button>
                </Flex>
              </Flex>

              {/* Search Section */}
              <Box
                p={6}
                bg={cardBg}
                borderRadius="lg"
                boxShadow="sm"
                borderWidth="1px"
                borderColor={borderColor}
              >
                <Stack spacing={6}>
                  <InputGroup maxW="600px">
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiSearch} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      placeholder="Search tasks by title or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      bg={cardBg}
                      borderColor={borderColor}
                      _hover={{ borderColor: 'blue.400' }}
                      _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
                    />
                  </InputGroup>

                  {/* Active Filters Display */}
                  {(selectedTags.length > 0 || statusFilter !== 'all' || priorityFilter !== 'all') && (
                    <Flex wrap="wrap" gap={2}>
                      {statusFilter !== 'all' && (
                        <Badge colorScheme="blue" p={2} borderRadius="md">
                          Status: {statusFilter}
                        </Badge>
                      )}
                      {priorityFilter !== 'all' && (
                        <Badge colorScheme="purple" p={2} borderRadius="md">
                          Priority: {priorityFilter}
                        </Badge>
                      )}
                      {selectedTags.map((tag) => (
                        <Badge key={tag} colorScheme="green" p={2} borderRadius="md">
                          Tag: {tag}
                        </Badge>
                      ))}
                    </Flex>
                  )}
                </Stack>
              </Box>

              {/* Results Section */}
              <Box
                p={6}
                bg={cardBg}
                borderRadius="lg"
                boxShadow="sm"
                borderWidth="1px"
                borderColor={borderColor}
              >
                <Grid
                  templateColumns={{
                    base: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(3, 1fr)",
                    lg: "repeat(3, 1fr)"
                  }}
                  gap={6}
                >
                  {filteredTasks.map((task) => (
                    <Card
                      key={task.task_id}
                      bg={cardBg}
                      borderWidth="1px"
                      borderColor={borderColor}
                      _hover={{ 
                        transform: 'translateY(-2px)', 
                        transition: 'all 0.2s',
                        boxShadow: 'md'
                      }}
                    >
                      <CardHeader>
                        <Stack spacing={2}>
                          <Heading size="md" color={textColor}>
                            {task.title}
                          </Heading>
                          <Flex wrap="wrap" gap={2}>
                            <Badge 
                              colorScheme={getStatusColor(task.status)}
                              px={2}
                              py={1}
                              borderRadius="full"
                            >
                              {task.status === 'todo' ? 'To Do' : 
                               task.status === 'in_progress' ? 'In Progress' : 
                               'Done'}
                            </Badge>
                            <Badge 
                              colorScheme={getPriorityColor(task.priority)}
                              px={2}
                              py={1}
                              borderRadius="full"
                            >
                              {task.priority}
                            </Badge>
                          </Flex>
                        </Stack>
                      </CardHeader>
                      <CardBody>

                        {task.tags && task.tags.length > 0 && (
                          <Flex wrap="wrap" gap={1} mt={2}>
                            {task.tags.map((tag, index) => (
                              <Badge 
                                key={index} 
                                colorScheme="purple"
                                px={2}
                                py={1}
                                borderRadius="full"
                                fontSize="xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </Flex>
                        )}
                      </CardBody>
                      <CardFooter>
                        <HStack spacing={2} width="100%" justify="space-between">
                          <Text fontSize="sm" color={subTextColor}>
                            Due: {formatLocalDateTime(task.due_date)}
                          </Text>
                          <HStack spacing={1}>
                            <IconButton
                              icon={<FiEye />}
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewTask(task)}
                              aria-label="View Task"
                            />
                            <IconButton
                              icon={<FiExternalLink />}
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/page-detail?task_id=${task.task_id}`)}
                              aria-label="Open in new page"
                            />
                            <IconButton
                              icon={<FiEdit2 />}
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditTask(task)}
                              aria-label="Edit Task"
                            />
                            <IconButton
                              icon={<FiTrash2 />}
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTask(task)}
                              aria-label="Delete Task"
                            />
                          </HStack>
                        </HStack>
                      </CardFooter>
                    </Card>
                  ))}
                </Grid>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Filter Drawer */}
      <Drawer
        isOpen={filterDrawer.isOpen}
        placement="right"
        onClose={filterDrawer.onClose}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent bg={cardBg}>
          <DrawerCloseButton color={textColor} />
          <DrawerHeader 
            borderBottomWidth="1px" 
            borderColor={borderColor}
            color={textColor}
          >
            Filter Tasks
          </DrawerHeader>
          <DrawerBody>
            <Stack spacing={6}>
              <Box>
                <Text mb={2} color={textColor} fontWeight="medium">Status</Text>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  bg={cardBg}
                  color={textColor}
                  borderColor={borderColor}
                >
                  <option value="all">All Statuses</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </Select>
              </Box>

              <Box>
                <Text mb={2} color={textColor} fontWeight="medium">Priority</Text>
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  bg={cardBg}
                  color={textColor}
                  borderColor={borderColor}
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
              </Box>

              <Box>
                <Text mb={2} color={textColor} fontWeight="medium">Tags</Text>
                <CheckboxGroup
                  value={selectedTags}
                  onChange={setSelectedTags}
                  colorScheme="blue"
                >
                  <Stack spacing={2}>
                    {allTags.map((tag) => (
                      <Checkbox 
                        key={tag} 
                        value={tag}
                        color={textColor}
                      >
                        {tag}
                      </Checkbox>
                    ))}
                  </Stack>
                </CheckboxGroup>
              </Box>
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Modals and Drawers */}
      {selectedTask && (
        <>
          <TaskViewModal
            isOpen={view_modal.isOpen}
            onClose={view_modal.onClose}
            task={selectedTask}
            onEdit={() => handleEditTask(selectedTask)}
          />
          <EditTaskDrawer
            currentTask={selectedTask}
            setCurrentTask={setSelectedTask}
            disclosures={edit_drawer}
          />
          <DeleteTaskNoteModal
            currentTask={selectedTask}
            disclosures={delete_modal}
            type="task"
          />
        </>
      )}
    </>
  );
} 
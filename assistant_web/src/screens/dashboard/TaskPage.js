import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  useColorModeValue,
  Divider,
  Avatar,
  AvatarBadge,
  AvatarGroup,
  Tag,
  TagLabel,
  Icon,
  Grid,
  GridItem,
  useToast,
  Spinner,
  Center,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Textarea,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Flex,
  Tooltip,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Select,
  Input,
  FormControl,
  FormLabel,
  useColorMode,
  Heading,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Stack,
  StackDivider
} from "@chakra-ui/react";
import { 
  FaCalendarAlt, 
  FaTag, 
  FaClipboardList, 
  FaUser, 
  FaPaperclip,
  FaClock,
  FaUsers,
  FaHashtag,
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaHistory,
  FaLink,
  FaRegComment,
  FaCheck,
  FaTimes
} from "react-icons/fa";
import { FiArrowLeft } from 'react-icons/fi';
import Head from 'next/head';
import { formatLocalDateTime } from '../../utils/locale';
import TaskService from '../../services/taskservice';
import CommentService from '../../services/CommentService';
import ConfigService from '../../utils/config';
import { retrieveTasks } from '../../slices/tasks';
import EditTaskDrawer from '../../components/dashboard/drawers/EditTaskDrawer';
import DeleteTaskNoteModal from '../../components/dashboard/modals/DeleteTaskNoteModal';
import TaskViewModal from '../../components/dashboard/modals/TaskViewModal';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';

const TaskPage = () => {
  const router = useRouter();
  const { task_id } = router.query;  const navigate = (path) => router.push(path);
  const dispatch = useDispatch();
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const [relatedTasks, setRelatedTasks] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editMode, setEditMode] = useState(false);
  const [editedTask, setEditedTask] = useState(null);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const toast = useToast();
  const { colorMode } = useColorMode();
  
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const infoBg = useColorModeValue("gray.50", "gray.700");
  const tagBg = useColorModeValue("blue.50", "blue.900");
  const tagColor = useColorModeValue("blue.700", "blue.200");

  const edit_drawer = useDisclosure();
  const delete_modal = useDisclosure();
  const view_modal = useDisclosure();

  useEffect(() => {
    const fetchTaskData = async () => {
      try {
        setIsLoading(true);
        const result = await dispatch(retrieveTasks()).unwrap();
        const foundTask = result.find(t => t.task_id === task_id);
        
        if (foundTask) {
          setTask(foundTask);
          // Fetch related tasks if needed
          const related = result.filter(t => 
            t.task_id !== task_id && 
            (t.labels?.some(label => foundTask.labels?.includes(label)) || 
             t.assignee_id === foundTask.assignee_id)
          );
          setRelatedTasks(related.slice(0, 3));
        } else {
          toast({
            title: "Task not found",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          navigate('/tasks');
        }
      } catch (error) {
        toast({
          title: "Error fetching task",
          description: error.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        navigate('/tasks');
      } finally {
        setIsLoading(false);
      }
    };

    if (task_id) {
      fetchTaskData();
    }
  }, [dispatch, task_id, navigate, toast]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setIsCommentLoading(true);
      const workspace = ConfigService.getDefaultWorkspace();
      const userId = ConfigService.getUserId();
      
      const commentData = {
        workspace_id: workspace.workspace_id,
        content: newComment,
        user_id: userId,
        task_id: task.task_id
      };

      await CommentService.createComment(workspace.workspace_id, commentData);
      setNewComment('');
      
      // Refresh task data using Redux
      const result = await dispatch(retrieveTasks()).unwrap();
      const updatedTask = result.find(t => t.task_id === task_id);
      if (updatedTask) {
        setTask(updatedTask);
      }
      
      toast({
        title: "Comment added",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error adding comment",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsCommentLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    try {
      const workspace = ConfigService.getDefaultWorkspace();
      await TaskService.update(task_id, editedTask);
      setTask(editedTask);
      setEditMode(false);
      toast({
        title: "Task updated",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error updating task",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteTask = async () => {
    try {
      const workspace = ConfigService.getDefaultWorkspace();
      await TaskService.remove(task_id);
      toast({
        title: "Task deleted",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      navigate('/tasks');
    } catch (error) {
      toast({
        title: "Error deleting task",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
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
      case 'High':
        return 'red';
      case 'Medium':
        return 'yellow';
      case 'Low':
        return 'green';
      default:
        return 'gray';
    }
  };

  const handleEdit = () => {
    edit_drawer.onOpen();
  };

  const handleDelete = () => {
    delete_modal.onOpen();
  };

  const handleView = () => {
    view_modal.onOpen();
  };

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (!task) {
    return (
      <Center h="100vh">
        <Text>Task not found</Text>
      </Center>
    );
  }

  return (
    <>
      <Head>
        <title>{task.title} - Task</title>
        <meta name="description" content={task.description?.substring(0, 160)} />
      </Head>

      <Box minH="100vh">
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Box as="main" p={{ base: 3, md: 4 }} minH="calc(100vh - 4rem)">
        <Box bg={bg} p={6} borderRadius="lg" boxShadow="md">
          <Flex justify="space-between" align="center" mb={6}>
            <VStack align="start" spacing={2}>
              <HStack spacing={4}>
                <IconButton
                  icon={<FiArrowLeft />}
                  variant="ghost"
                  onClick={() => navigate(-1)}
                  aria-label="Go back"
                />
                <Heading size="lg">{task.title}</Heading>
              </HStack>
              <HStack spacing={2}>
                <Button
                  leftIcon={<FaEdit />}
                  colorScheme="blue"
                  variant="outline"
                  onClick={handleEdit}
                >
                  Edit
                </Button>
                <Button
                  leftIcon={<FaTrash />}
                  colorScheme="red"
                  variant="outline"
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </HStack>
            </VStack>
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Options"
                icon={<FaEllipsisV />}
                variant="ghost"
              />
              <MenuList>
                <MenuItem icon={<FaLink />} onClick={handleView}>
                  View Task
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>

          <Tabs variant="enclosed">
            <TabList>
              <Tab>Details</Tab>
              <Tab>Comments</Tab>
              <Tab>Activity</Tab>
              <Tab>Related Tasks</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  {/* Description Section */}
                  <Box>
                    <Text fontWeight="bold" mb={2}>Description</Text>
                    {editMode ? (
                      <Textarea
                        value={editedTask.description}
                        onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                        minH="200px"
                      />
                    ) : (
                      <Box 
                        p={3} 
                        bg={infoBg} 
                        borderRadius="md"
                        className="ProseMirror"
                        dangerouslySetInnerHTML={{ __html: task.description }}
                      />
                    )}
                  </Box>

                  <Divider />

                  {/* Task Details Grid */}
                  <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                    {/* Story Points */}
                    <GridItem>
                      <VStack align="start" spacing={2}>
                        <HStack>
                          <Icon as={FaClock} />
                          <Text fontWeight="medium">Story Points</Text>
                        </HStack>
                        {editMode ? (
                          <Input
                            value={editedTask.storyPoints}
                            onChange={(e) => setEditedTask({ ...editedTask, storyPoints: e.target.value })}
                          />
                        ) : (
                          <Text fontSize="lg" fontWeight="bold">{task.storyPoints || "Not set"}</Text>
                        )}
                      </VStack>
                    </GridItem>

                    {/* Due Date */}
                    <GridItem>
                      <VStack align="start" spacing={2}>
                        <HStack>
                          <Icon as={FaCalendarAlt} />
                          <Text fontWeight="medium">Due Date</Text>
                        </HStack>
                        {editMode ? (
                          <Input
                            type="datetime-local"
                            value={editedTask.dueDate}
                            onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
                          />
                        ) : (
                          <Text fontSize="lg" fontWeight="bold">
                            {formatLocalDateTime(task.dueDate)}
                          </Text>
                        )}
                      </VStack>
                    </GridItem>

                    {/* Assignees */}
                    <GridItem>
                      <VStack align="start" spacing={2}>
                        <HStack>
                          <Icon as={FaUsers} />
                          <Text fontWeight="medium">Assignees</Text>
                        </HStack>
                        {task.assignees && task.assignees.length > 0 ? (
                          <AvatarGroup size="md" max={3}>
                            {task.assignees.map((user, index) => (
                              <Avatar key={index} src={user.avatar} name={user.name} />
                            ))}
                          </AvatarGroup>
                        ) : (
                          <Text color="gray.500">No assignees</Text>
                        )}
                      </VStack>
                    </GridItem>

                    {/* Labels */}
                    <GridItem>
                      <VStack align="start" spacing={2}>
                        <HStack>
                          <Icon as={FaHashtag} />
                          <Text fontWeight="medium">Labels</Text>
                        </HStack>
                        {task.labels && task.labels.length > 0 ? (
                          <HStack flexWrap="wrap" spacing={2}>
                            {task.labels.map((label, index) => (
                              <Tag
                                key={index}
                                size="md"
                                borderRadius="full"
                                variant="solid"
                                bg={tagBg}
                                color={tagColor}
                              >
                                <TagLabel>{label}</TagLabel>
                              </Tag>
                            ))}
                          </HStack>
                        ) : (
                          <Text color="gray.500">No labels</Text>
                        )}
                      </VStack>
                    </GridItem>
                  </Grid>

                  {/* Attachments */}
                  {task.attachments && task.attachments.length > 0 && (
                    <>
                      <Divider />
                      <Box>
                        <HStack mb={2}>
                          <Icon as={FaPaperclip} />
                          <Text fontWeight="medium">Attachments</Text>
                        </HStack>
                        <VStack align="start" spacing={2}>
                          {task.attachments.map((file, index) => (
                            <HStack
                              key={index}
                              p={2}
                              bg={infoBg}
                              borderRadius="md"
                              w="100%"
                              justify="space-between"
                            >
                              <Text fontSize="sm">{file.name}</Text>
                              <IconButton
                                size="xs"
                                icon={<FaPaperclip />}
                                variant="ghost"
                                onClick={() => window.open(file.url, '_blank')}
                              />
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                    </>
                  )}

                  {editMode && (
                    <HStack justify="flex-end" mt={4}>
                      <Button variant="outline" onClick={() => setEditMode(false)}>
                        Cancel
                      </Button>
                      <Button colorScheme="blue" onClick={handleUpdateTask}>
                        Save Changes
                      </Button>
                    </HStack>
                  )}
                </VStack>
              </TabPanel>

              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {task.comments?.map((comment) => (
                    <Box
                      key={comment.comment_id}
                      p={4}
                      bg={infoBg}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={borderColor}
                    >
                      <Flex justify="space-between" align="center" mb={2}>
                        <HStack>
                          <Avatar size="sm" name="User">
                            <AvatarBadge boxSize="1.25em" bg="green.500" />
                          </Avatar>
                          <Text fontWeight="bold">User</Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.500">
                          {formatLocalDateTime(comment.created_at)}
                        </Text>
                      </Flex>
                      <Text>{comment.content}</Text>
                    </Box>
                  ))}

                  <Box mt={4}>
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      mb={2}
                    />
                    <Button
                      colorScheme="blue"
                      onClick={handleAddComment}
                      isLoading={isCommentLoading}
                      isDisabled={!newComment.trim()}
                    >
                      Add Comment
                    </Button>
                  </Box>
                </VStack>
              </TabPanel>

              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {task.activities?.map((activity, index) => (
                    <Box
                      key={index}
                      p={4}
                      bg={infoBg}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={borderColor}
                    >
                      <Flex justify="space-between" align="center">
                        <HStack>
                          <Icon as={FaHistory} />
                          <Text>{activity.description}</Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.500">
                          {formatLocalDateTime(activity.created_at)}
                        </Text>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              </TabPanel>

              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {relatedTasks.map((relatedTask) => (
                    <Box
                      key={relatedTask.task_id}
                      p={4}
                      bg={infoBg}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={borderColor}
                      cursor="pointer"
                      onClick={() => navigate(`/page-detail?task_id=${relatedTask.task_id}`)}
                    >
                      <Text fontWeight="bold">{relatedTask.title}</Text>
                      <HStack mt={2}>
                        <Badge colorScheme={getStatusColor(relatedTask.status)}>
                          {relatedTask.status}
                        </Badge>
                        <Badge colorScheme={getPriorityColor(relatedTask.priority)}>
                          {relatedTask.priority}
                        </Badge>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
          </Box>
        </Box>
      </Box>

      {/* Modals and Drawers */}
      <EditTaskDrawer
        currentTask={task}
        setCurrentTask={setTask}
        disclosures={edit_drawer}
      />
      <DeleteTaskNoteModal
        currentTask={task}
        disclosures={delete_modal}
        type="task"
      />
      <TaskViewModal
        isOpen={view_modal.isOpen}
        onClose={view_modal.onClose}
        task={task}
        onEdit={handleEdit}
      />
    </>
  );
};

export default TaskPage; 
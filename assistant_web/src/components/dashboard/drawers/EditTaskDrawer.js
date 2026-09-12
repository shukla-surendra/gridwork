import React, { useState, useEffect } from "react";
import {
  Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton,
  DrawerHeader, DrawerBody, DrawerFooter, Box, Button, FormControl,
  Input, Menu, MenuButton, MenuItem, MenuList, Icon, Text, useColorModeValue,
  Badge, Tooltip, useToast, IconButton, VStack, HStack, Divider, Tag,
  TagLabel, TagCloseButton, Wrap, Select, InputGroup, InputLeftElement,
  InputRightElement, Spinner, Flex, Popover, PopoverTrigger, PopoverContent,
  PopoverBody, PopoverArrow, Portal, MenuDivider, FormLabel,
  Avatar, Progress, Checkbox
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { updateTask } from "../../../slices/tasks";
import { selectIsModuleEnabled } from "../../../slices/modules";
import {
  FaArrowLeft, FaSave, FaCalendarAlt, FaTag, FaClipboardList,
  FaUser, FaPaperclip, FaPlus, FaClock, FaHashtag,
  FaShare, FaEllipsisH, FaCheckCircle, FaRegCircle, FaLink, FaTrash
} from "react-icons/fa";
import { FiMoreHorizontal, FiCheck, FiClock } from "react-icons/fi";
import RichTextEditor from '../editor/RichTextEditor';
import TaskDataService from "../../../services/taskservice";
import TaskLinkService from "../../../services/TaskLinkService";
import EpicService from "../../../services/EpicService";
import SprintService from "../../../services/SprintService";
import MemberService from "../../../services/MemberService";
import ConfigService from "../../../utils/config";
import { formatLocalDateTime } from "../../../utils/locale";

const LINK_TYPE_LABELS = {
  blocks: "Blocks",
  relates_to: "Relates to",
  duplicates: "Duplicates",
  clones: "Clones",
};

// Fibonacci-ish scale -- the same convention Jira's own estimation field
// uses, so "8" reads as a familiar relative-size number, not a day count.
const STORY_POINT_OPTIONS = [1, 2, 3, 5, 8, 13, 21];

const PRIORITY_COLORS = {
  Low: "green",
  Medium: "yellow",
  High: "orange",
  Urgent: "red"
};

const STATUS_CONFIG = {
  todo: { color: "gray", label: "To Do" },
  in_progress: { color: "blue", label: "In Progress" },
  done: { color: "green", label: "Done" }
};

export default function EditTaskDrawer(props) {
  const { currentTask, setCurrentTask, disclosures, onTaskUpdate } = props;
  const { isOpen, onClose } = disclosures;
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const toast = useToast();
  const taskLinksEnabled = useSelector((state) => selectIsModuleEnabled(state, 'task_links'));
  const epicsEnabled = useSelector((state) => selectIsModuleEnabled(state, 'epics'));
  const sprintsEnabled = useSelector((state) => selectIsModuleEnabled(state, 'sprints'));
  const [newLabel, setNewLabel] = useState('');
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [links, setLinks] = useState([]);
  const [boardEpics, setBoardEpics] = useState([]);
  const [boardSprints, setBoardSprints] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [linkableTasks, setLinkableTasks] = useState([]);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkTargetId, setNewLinkTargetId] = useState('');
  const [newLinkType, setNewLinkType] = useState('relates_to');

  // Theme colors
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const inputBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.800", "white");
  const mutedColor = useColorModeValue("gray.600", "gray.400");
  const hoverBg = useColorModeValue("gray.100", "gray.700");
  const labelColor = useColorModeValue("gray.700", "gray.300");

  useEffect(() => {
    if (isOpen && currentTask?.task_id) {
      getTask(currentTask.task_id);
      // Task Links is a toggleable module (Settings > Modules) -- skip
      // the request when it's off instead of firing it on every task
      // edit just to eat a 403.
      if (taskLinksEnabled) {
        loadLinks(currentTask.task_id);
      }
    }
  }, [isOpen, currentTask?.task_id, taskLinksEnabled]);

  // Epics/sprints are board-scoped -- only relevant once we know which
  // board (if any) this task lives on. Also toggleable modules -- same
  // reasoning as Task Links above.
  useEffect(() => {
    if (isOpen && currentTask?.board_id && epicsEnabled) {
      EpicService.getAll(currentTask.board_id).then(res => setBoardEpics(res.data)).catch(() => {});
    } else {
      setBoardEpics([]);
    }
  }, [isOpen, currentTask?.board_id, epicsEnabled]);

  useEffect(() => {
    if (isOpen && currentTask?.board_id && sprintsEnabled) {
      SprintService.getAll(currentTask.board_id).then(res => setBoardSprints(res.data)).catch(() => {});
    } else {
      setBoardSprints([]);
    }
  }, [isOpen, currentTask?.board_id, sprintsEnabled]);

  const handleStoryPointsChange = (e) => {
    const value = e.target.value;
    setCurrentTask(prev => ({ ...prev, story_points: value === '' ? null : parseInt(value, 10) }));
  };

  useEffect(() => {
    if (isOpen) {
      const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
      MemberService.getMembers(workspace_id)
        .then(res => setWorkspaceMembers(res.data))
        .catch(() => {});
    }
  }, [isOpen]);

  const handleAssign = (memberId) => {
    setCurrentTask(prev => ({ ...prev, assignee_id: memberId || null }));
  };

  const currentAssignee = workspaceMembers.find(m => m.user_id === currentTask?.assignee_id);

  const loadLinks = async (taskId) => {
    try {
      const response = await TaskLinkService.getAll(taskId);
      setLinks(response.data);
    } catch (error) {
      console.error('Error loading links:', error);
    }
  };

  const loadLinkableTasks = async () => {
    if (linkableTasks.length > 0) return;
    try {
      const response = await TaskDataService.getAllForLinking();
      setLinkableTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks to link:', error);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !currentTask?.task_id) return;
    try {
      const response = await TaskDataService.create({
        title: newSubtaskTitle.trim(),
        parent_task_id: currentTask.task_id,
        board_id: currentTask.board_id,
      });
      setCurrentTask(prev => ({ ...prev, subtasks: [...(prev.subtasks || []), response.data] }));
      setNewSubtaskTitle('');
    } catch (error) {
      toast({ title: "Couldn't add subtask", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleToggleSubtask = async (subtask) => {
    const completed = !subtask.completed;
    try {
      await TaskDataService.update(subtask.task_id, {
        task_id: subtask.task_id,
        workspace_id: currentTask.workspace_id,
        user_id: currentTask.user_id,
        completed,
        status: completed ? 'done' : 'todo',
      });
      setCurrentTask(prev => ({
        ...prev,
        subtasks: prev.subtasks.map(s => s.task_id === subtask.task_id ? { ...s, completed, status: completed ? 'done' : 'todo' } : s),
      }));
    } catch (error) {
      toast({ title: "Couldn't update subtask", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleAddLink = async () => {
    if (!newLinkTargetId || !currentTask?.task_id) return;
    try {
      const response = await TaskLinkService.create(currentTask.task_id, {
        target_task_id: newLinkTargetId,
        link_type: newLinkType,
      });
      setLinks(prev => [...prev, response.data]);
      setNewLinkTargetId('');
      setIsAddingLink(false);
    } catch (error) {
      toast({
        title: "Couldn't add link",
        description: error.response?.data?.detail || 'Please try again',
        status: "error", duration: 3000, isClosable: true,
      });
    }
  };

  const handleDeleteLink = async (linkId) => {
    try {
      await TaskLinkService.remove(currentTask.task_id, linkId);
      setLinks(prev => prev.filter(l => l.link_id !== linkId));
    } catch (error) {
      toast({ title: "Couldn't remove link", status: "error", duration: 3000, isClosable: true });
    }
  };

  const getTask = async (id) => {
    setLoading(true);
    try {
      const response = await TaskDataService.get(id);
      if (response?.data) {
        setCurrentTask(response.data);
      }
    } catch (error) {
      console.error('Error loading task:', error);
      toast({
        title: "Error",
        description: "Failed to load task",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setCurrentTask({ ...currentTask, [name]: value });
  };

  const updateContent = async () => {
    setLoading(true);
    try {
      await dispatch(updateTask({ task_id: currentTask.task_id, data: currentTask })).unwrap();
      toast({
        title: "Success",
        description: "Task updated successfully",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      if (onTaskUpdate) {
        onTaskUpdate(currentTask);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLabel = () => {
    if (newLabel.trim() && !currentTask.labels?.includes(newLabel.trim())) {
      setCurrentTask(prev => ({
        ...prev,
        labels: [...(prev.labels || []), newLabel.trim()]
      }));
      setNewLabel('');
    }
    setIsAddingLabel(false);
  };

  const handleRemoveLabel = (labelToRemove) => {
    setCurrentTask(prev => ({
      ...prev,
      labels: prev.labels?.filter(label => label !== labelToRemove) || []
    }));
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setCurrentTask(prev => ({
      ...prev,
      checklist: [...(prev.checklist || []), { id: `${Date.now()}`, text: newChecklistItem.trim(), done: false }]
    }));
    setNewChecklistItem('');
  };

  const handleToggleChecklistItem = (itemId) => {
    setCurrentTask(prev => ({
      ...prev,
      checklist: (prev.checklist || []).map(item => item.id === itemId ? { ...item, done: !item.done } : item)
    }));
  };

  const handleRemoveChecklistItem = (itemId) => {
    setCurrentTask(prev => ({
      ...prev,
      checklist: (prev.checklist || []).filter(item => item.id !== itemId)
    }));
  };

  return (
    <Drawer 
      onClose={onClose} 
      isOpen={isOpen} 
      size="xl"
      placement="right"
    >
      <DrawerOverlay backdropFilter="blur(4px)" />
      <DrawerContent 
        bg={bgColor} 
        borderLeft="1px" 
        borderColor={borderColor}
        boxShadow="xl"
      >
        <DrawerCloseButton top={4} right={4} zIndex={2} />
        
        {/* Header */}
        <DrawerHeader 
          borderBottomWidth="1px" 
          borderColor={borderColor}
          py={4}
          px={6}
        >
          <Flex justify="space-between" align="center" position="relative">
            <HStack spacing={4}>
              <IconButton
                icon={<Icon as={FaArrowLeft} />}
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Back"
              />
              <Badge 
                colorScheme={STATUS_CONFIG[currentTask?.status || 'todo'].color}
                px={2}
                py={1}
                borderRadius="full"
                fontSize="xs"
              >
                {STATUS_CONFIG[currentTask?.status || 'todo'].label}
              </Badge>
            </HStack>
            <HStack spacing={2} position="absolute" right="4" zIndex={1}>
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<Icon as={FiMoreHorizontal} />}
                  variant="ghost"
                  size="sm"
                  aria-label="More options"
                />
                <MenuList shadow="lg" py={2}>
                  <MenuItem icon={<Icon as={FaShare} />} py={2}>
                    Share
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem icon={<Icon as={FaCheckCircle} />} py={2}>
                    Mark as Complete
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </Flex>
        </DrawerHeader>

        {/* Body */}
        <DrawerBody px={6} py={4}>
          <VStack spacing={6} align="stretch">
            {/* Title Input */}
            <FormControl>
              <Input
                placeholder="Task title"
                name="title"
                value={currentTask?.title || ''}
                onChange={handleInputChange}
                size="lg"
                fontSize="2xl"
                fontWeight="bold"
                variant="unstyled"
                px={0}
                _placeholder={{ color: mutedColor }}
              />
              <Text fontSize="sm" color={mutedColor}>
                Created {formatLocalDateTime(currentTask?.created_at)}
              </Text>
            </FormControl>

            <Divider />

            {/* Task Metadata */}
            <VStack spacing={4} align="stretch">
              {/* Status and Priority */}
              <HStack spacing={6}>
                <FormControl>
                  <HStack spacing={3}>
                    <Icon as={FaClipboardList} color={mutedColor} />
                    <Select
                      name="status"
                      value={currentTask?.status || ''}
                      onChange={handleInputChange}
                      size="sm"
                      width="150px"
                      variant="filled"
                      bg={inputBg}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </Select>
                  </HStack>
                </FormControl>

                <FormControl>
                  <HStack spacing={3}>
                    <Icon as={FaTag} color={mutedColor} />
                    <Select
                      name="priority"
                      value={currentTask?.priority || ''}
                      onChange={handleInputChange}
                      size="sm"
                      width="150px"
                      variant="filled"
                      bg={inputBg}
                    >
                      {Object.keys(PRIORITY_COLORS).map(priority => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </Select>
                  </HStack>
                </FormControl>
              </HStack>

              {/* Due Date */}
              <FormControl>
                <HStack spacing={3}>
                  <Icon as={FaCalendarAlt} color={mutedColor} />
                  <Input
                    type="datetime-local"
                    name="due_on"
                    value={currentTask?.due_on || ''}
                    onChange={handleInputChange}
                    size="sm"
                    width="auto"
                    variant="filled"
                    bg={inputBg}
                  />
                </HStack>
              </FormControl>

              {/* Story Points */}
              <FormControl>
                <HStack spacing={3}>
                  <Icon as={FaHashtag} color={mutedColor} />
                  <Text fontSize="sm" color={mutedColor}>Story points</Text>
                  <Select
                    value={currentTask?.story_points ?? ''}
                    onChange={handleStoryPointsChange}
                    size="sm"
                    width="110px"
                    variant="filled"
                    bg={inputBg}
                  >
                    <option value="">None</option>
                    {STORY_POINT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </HStack>
              </FormControl>

              {/* Epic / Sprint -- only meaningful once this task lives on
                  a board, since both are board-scoped resources. */}
              {currentTask?.board_id && (
                <FormControl>
                  <HStack spacing={3}>
                    <Icon as={FaTag} color={mutedColor} />
                    <VStack align="stretch" spacing={1} flex={1}>
                      <HStack>
                        <Text fontSize="xs" color={mutedColor} width="45px">Epic</Text>
                        <Select
                          name="epic_id"
                          value={currentTask?.epic_id || ''}
                          onChange={handleInputChange}
                          size="sm"
                          variant="filled"
                          bg={inputBg}
                        >
                          <option value="">No epic</option>
                          {boardEpics.map(e => <option key={e.epic_id} value={e.epic_id}>{e.title}</option>)}
                        </Select>
                      </HStack>
                      <HStack>
                        <Text fontSize="xs" color={mutedColor} width="45px">Sprint</Text>
                        <Select
                          name="sprint_id"
                          value={currentTask?.sprint_id || ''}
                          onChange={handleInputChange}
                          size="sm"
                          variant="filled"
                          bg={inputBg}
                        >
                          <option value="">Backlog</option>
                          {boardSprints.filter(s => s.status !== 'completed').map(s => (
                            <option key={s.sprint_id} value={s.sprint_id}>{s.name}{s.status === 'active' ? ' (active)' : ''}</option>
                          ))}
                        </Select>
                      </HStack>
                    </VStack>
                  </HStack>
                </FormControl>
              )}

              {/* Assignee -- the Task model has a single assignee_id, not
                  a list, so this is a picker, not a multi-avatar roster. */}
              <FormControl>
                <HStack spacing={3}>
                  <Icon as={FaUser} color={mutedColor} />
                  <Text fontSize="sm" fontWeight="medium" color={textColor}>Assignee</Text>
                  <Menu>
                    <MenuButton as={Button} size="sm" variant="outline" leftIcon={
                      currentAssignee
                        ? <Avatar size="2xs" name={currentAssignee.name} src={currentAssignee.avatar} />
                        : <Icon as={FaUser} />
                    }>
                      {currentAssignee ? currentAssignee.name : "Unassigned"}
                    </MenuButton>
                    <MenuList>
                      <MenuItem onClick={() => handleAssign(null)}>Unassigned</MenuItem>
                      <MenuDivider />
                      {workspaceMembers.map(member => (
                        <MenuItem key={member.user_id} onClick={() => handleAssign(member.user_id)}>
                          <HStack>
                            <Avatar size="2xs" name={member.name} src={member.avatar} />
                            <Text>{member.name}</Text>
                          </HStack>
                        </MenuItem>
                      ))}
                    </MenuList>
                  </Menu>
                </HStack>
              </FormControl>

              {/* Labels */}
              <FormControl>
                <HStack spacing={3} align="flex-start">
                  <Icon as={FaHashtag} color={mutedColor} mt={2} />
                  <VStack align="stretch" spacing={2} flex={1}>
                    <HStack>
                      <Text fontSize="sm" fontWeight="medium" color={textColor}>
                        Labels
                      </Text>
                      <Popover
                        isOpen={isAddingLabel}
                        onClose={() => setIsAddingLabel(false)}
                        placement="bottom-start"
                      >
                        <PopoverTrigger>
                          <IconButton
                            icon={<Icon as={FaPlus} />}
                            size="xs"
                            variant="ghost"
                            aria-label="Add label"
                            onClick={() => setIsAddingLabel(true)}
                          />
                        </PopoverTrigger>
                        <Portal>
                          <PopoverContent>
                            <PopoverArrow />
                            <PopoverBody p={4}>
                              <InputGroup size="sm">
                                <Input
                                  placeholder="Add new label"
                                  value={newLabel}
                                  onChange={(e) => setNewLabel(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddLabel();
                                    }
                                  }}
                                />
                                <InputRightElement width="4.5rem">
                                  <Button
                                    h="1.75rem"
                                    size="sm"
                                    onClick={handleAddLabel}
                                    colorScheme="blue"
                                  >
                                    Add
                                  </Button>
                                </InputRightElement>
                              </InputGroup>
                            </PopoverBody>
                          </PopoverContent>
                        </Portal>
                      </Popover>
                    </HStack>
                    <Wrap>
                      {currentTask?.labels?.map(label => (
                        <Tag
                          key={label}
                          size="sm"
                          borderRadius="full"
                          variant="subtle"
                          colorScheme="blue"
                        >
                          <TagLabel>{label}</TagLabel>
                          <TagCloseButton onClick={() => handleRemoveLabel(label)} />
                        </Tag>
                      ))}
                    </Wrap>
                  </VStack>
                </HStack>
              </FormControl>

              {/* Checklist */}
              <FormControl>
                <HStack spacing={3} align="flex-start">
                  <Icon as={FaClipboardList} color={mutedColor} mt={2} />
                  <VStack align="stretch" spacing={2} flex={1}>
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="medium" color={textColor}>
                        Checklist
                        {currentTask?.checklist?.length > 0 && (
                          <Text as="span" color={mutedColor} fontWeight="normal" ml={2}>
                            {currentTask.checklist.filter(i => i.done).length}/{currentTask.checklist.length}
                          </Text>
                        )}
                      </Text>
                    </HStack>
                    {currentTask?.checklist?.length > 0 && (
                      <Progress
                        size="xs"
                        borderRadius="full"
                        colorScheme="green"
                        value={(currentTask.checklist.filter(i => i.done).length / currentTask.checklist.length) * 100}
                      />
                    )}
                    <VStack align="stretch" spacing={1}>
                      {currentTask?.checklist?.map(item => (
                        <HStack key={item.id} justify="space-between">
                          <Checkbox
                            isChecked={item.done}
                            onChange={() => handleToggleChecklistItem(item.id)}
                          >
                            <Text
                              fontSize="sm"
                              textDecoration={item.done ? 'line-through' : 'none'}
                              color={item.done ? mutedColor : textColor}
                            >
                              {item.text}
                            </Text>
                          </Checkbox>
                          <IconButton
                            icon={<Icon as={FaTrash} />}
                            size="xs"
                            variant="ghost"
                            aria-label="Remove checklist item"
                            onClick={() => handleRemoveChecklistItem(item.id)}
                          />
                        </HStack>
                      ))}
                    </VStack>
                    <InputGroup size="sm">
                      <Input
                        placeholder="Add checklist item"
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') handleAddChecklistItem(); }}
                      />
                      <InputRightElement width="4.5rem">
                        <Button h="1.75rem" size="sm" onClick={handleAddChecklistItem} colorScheme="blue">
                          Add
                        </Button>
                      </InputRightElement>
                    </InputGroup>
                  </VStack>
                </HStack>
              </FormControl>

              {/* Subtasks */}
              <FormControl>
                <HStack spacing={3} align="flex-start">
                  <Icon as={FaCheckCircle} color={mutedColor} mt={2} />
                  <VStack align="stretch" spacing={2} flex={1}>
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="medium" color={textColor}>
                        Subtasks {currentTask?.subtasks?.length > 0 && (
                          <Text as="span" color={mutedColor} fontWeight="normal">
                            ({currentTask.subtasks.filter(s => s.completed).length}/{currentTask.subtasks.length})
                          </Text>
                        )}
                      </Text>
                    </HStack>
                    {currentTask?.subtasks?.length > 0 && (
                      <Progress
                        size="xs"
                        borderRadius="full"
                        value={(currentTask.subtasks.filter(s => s.completed).length / currentTask.subtasks.length) * 100}
                      />
                    )}
                    <VStack align="stretch" spacing={1}>
                      {currentTask?.subtasks?.map(subtask => (
                        <HStack key={subtask.task_id} justify="space-between">
                          <Checkbox
                            isChecked={subtask.completed}
                            onChange={() => handleToggleSubtask(subtask)}
                            size="sm"
                          >
                            <Text fontSize="sm" as={subtask.completed ? 's' : undefined} color={subtask.completed ? mutedColor : textColor}>
                              {subtask.title}
                            </Text>
                          </Checkbox>
                        </HStack>
                      ))}
                    </VStack>
                    <InputGroup size="sm">
                      <Input
                        placeholder="Add a subtask"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') handleAddSubtask(); }}
                      />
                      <InputRightElement width="4.5rem">
                        <Button h="1.75rem" size="sm" onClick={handleAddSubtask}>Add</Button>
                      </InputRightElement>
                    </InputGroup>
                  </VStack>
                </HStack>
              </FormControl>

              {/* Linked Issues -- task_links is a toggleable module
                  (Settings > Modules); hide the whole field rather than
                  show an "Add link" control that would just 403. */}
              {taskLinksEnabled && (
              <FormControl>
                <HStack spacing={3} align="flex-start">
                  <Icon as={FaLink} color={mutedColor} mt={2} />
                  <VStack align="stretch" spacing={2} flex={1}>
                    <HStack>
                      <Text fontSize="sm" fontWeight="medium" color={textColor}>
                        Linked Issues
                      </Text>
                      <Popover
                        isOpen={isAddingLink}
                        onClose={() => setIsAddingLink(false)}
                        placement="bottom-start"
                      >
                        <PopoverTrigger>
                          <IconButton
                            icon={<Icon as={FaPlus} />}
                            size="xs"
                            variant="ghost"
                            aria-label="Add link"
                            onClick={() => { setIsAddingLink(true); loadLinkableTasks(); }}
                          />
                        </PopoverTrigger>
                        <Portal>
                          <PopoverContent>
                            <PopoverArrow />
                            <PopoverBody p={3}>
                              <VStack align="stretch" spacing={2}>
                                <Select size="sm" value={newLinkType} onChange={(e) => setNewLinkType(e.target.value)}>
                                  {Object.entries(LINK_TYPE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                  ))}
                                </Select>
                                <Select
                                  size="sm"
                                  placeholder="Select issue"
                                  value={newLinkTargetId}
                                  onChange={(e) => setNewLinkTargetId(e.target.value)}
                                >
                                  {linkableTasks
                                    .filter(t => t.task_id !== currentTask?.task_id)
                                    .map(t => <option key={t.task_id} value={t.task_id}>{t.title}</option>)}
                                </Select>
                                <Button size="sm" colorScheme="blue" onClick={handleAddLink}>Link</Button>
                              </VStack>
                            </PopoverBody>
                          </PopoverContent>
                        </Portal>
                      </Popover>
                    </HStack>
                    <VStack align="stretch" spacing={1}>
                      {links.map(link => (
                        <HStack key={link.link_id} justify="space-between" fontSize="sm">
                          <HStack>
                            <Badge colorScheme="purple" fontSize="2xs">{link.display_label}</Badge>
                            <Text noOfLines={1}>{link.related_task.title}</Text>
                          </HStack>
                          <IconButton
                            icon={<Icon as={FaTrash} />}
                            size="xs"
                            variant="ghost"
                            aria-label="Remove link"
                            onClick={() => handleDeleteLink(link.link_id)}
                          />
                        </HStack>
                      ))}
                      {links.length === 0 && <Text fontSize="xs" color={mutedColor}>No linked issues.</Text>}
                    </VStack>
                  </VStack>
                </HStack>
              </FormControl>
              )}
            </VStack>

            <Divider />

            {/* Description */}
            <Box flex={1}>
              <Text fontSize="sm" fontWeight="medium" color={textColor} mb={3}>
                Description
              </Text>
              <RichTextEditor
                value={currentTask?.description || ''}
                onChange={(newContent) => {
                  setCurrentTask(prev => ({
                    ...prev,
                    description: newContent
                  }));
                }}
              />
            </Box>
          </VStack>
        </DrawerBody>

        {/* Footer */}
        <DrawerFooter 
          borderTopWidth="1px" 
          borderColor={borderColor}
          py={4}
          px={6}
        >
          <Flex w="100%" justify="space-between" align="center">
            <Box>
              {loading && (
                <HStack>
                  <Spinner size="sm" />
                  <Text fontSize="sm" color={mutedColor}>
                    Saving changes...
                  </Text>
                </HStack>
              )}
            </Box>
            <HStack spacing={3}>
              <Button
                variant="ghost"
                onClick={onClose}
                size="md"
              >
                Close
              </Button>
              <Button
                colorScheme="blue"
                onClick={updateContent}
                isLoading={loading}
                leftIcon={<Icon as={FaSave} />}
                size="md"
              >
                Save
              </Button>
            </HStack>
          </Flex>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
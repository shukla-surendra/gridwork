import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Badge,
  Box,
  Text,
  HStack,
  VStack,
  Divider,
  useColorModeValue,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  AvatarGroup,
  Tag,
  TagLabel,
  Icon,
  Grid,
  GridItem,
  Textarea,
  Button,
  AvatarBadge,
  useToast,
  Checkbox,
  Progress,
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
  FaRegComment,
  FaEdit
} from "react-icons/fa";
import { useSelector } from 'react-redux';
import { formatLocalDateTime } from '../../../utils/locale';
import CommentService from '../../../services/CommentService';
import ConfigService from '../../../utils/config';
import { selectIsModuleEnabled } from '../../../slices/modules';

const TaskViewModal = ({ isOpen, onClose, task, onEdit }) => {
  const commentsEnabled = useSelector((state) => selectIsModuleEnabled(state, 'comments'));
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const infoBg = useColorModeValue("gray.50", "gray.700");
  const tagBg = useColorModeValue("blue.50", "blue.900");
  const tagColor = useColorModeValue("blue.700", "blue.200");
  const commentBg = useColorModeValue("gray.50", "gray.700");

  useEffect(() => {
    if (task?.description) {
      setContent(task.description);
    }
  }, [task?.description]);

  useEffect(() => {
    // Comments is a toggleable module (Settings > Modules) -- skip the
    // request entirely when it's off instead of firing it and eating a
    // 403 (and the error toast below) on every task view.
    if (task?.task_id && commentsEnabled) {
      fetchComments();
    }
  }, [task, commentsEnabled]);

  const fetchComments = async () => {
    try {
      const workspace = ConfigService.getDefaultWorkspace();
      const userId = ConfigService.getUserId();
      const response = await CommentService.listComments(workspace.workspace_id, task.task_id, userId);
      setComments(response.data);
    } catch (error) {
      // A disabled module 403s here -- that's an expected, silent
      // no-comments state (see commentsEnabled above), not an error
      // worth interrupting the user with a toast for.
      if (error.response?.status !== 403) {
        toast({
          title: "Error fetching comments",
          description: error.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setIsLoading(true);
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
      fetchComments();
      toast({
        title: 'Comment added',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error adding comment',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent bg={bg}>
        <ModalHeader>
          <Flex justify="space-between" align="center">
            <VStack align="start" spacing={2}>
              <Text fontSize="xl" fontWeight="bold">{task.title}</Text>
              <HStack spacing={2}>
                <Badge colorScheme={getStatusColor(task.status)}>
                  {task.status === 'todo' ? 'To Do' : 
                   task.status === 'in_progress' ? 'In Progress' : 'Done'}
                </Badge>
                <Badge colorScheme={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </HStack>
            </VStack>
            <IconButton
              aria-label="Edit task"
              icon={<Icon as={FaEdit} />}
              variant="ghost"
              colorScheme="blue"
              onClick={() => {
                onClose();
                onEdit(task);
              }}
            />
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={6} align="stretch">
            {/* Description Section */}
            <Box>
              <Text fontWeight="bold" mb={2}>Description</Text>
              <Box 
                p={3} 
                bg={infoBg} 
                borderRadius="md"
                className="ProseMirror"
                dangerouslySetInnerHTML={{ __html: content }}
              />
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
                  <Text fontSize="lg" fontWeight="bold">{task.storyPoints || "Not set"}</Text>
                </VStack>
              </GridItem>

              {/* Due Date */}
              <GridItem>
                <VStack align="start" spacing={2}>
                  <HStack>
                    <Icon as={FaCalendarAlt} />
                    <Text fontWeight="medium">Due Date</Text>
                  </HStack>
                  <Text fontSize="lg" fontWeight="bold">
                    {formatLocalDateTime(task.dueDate)}
                  </Text>
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

              {/* Checklist */}
              {task.checklist && task.checklist.length > 0 && (
                <GridItem colSpan={2}>
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={FaClipboardList} />
                        <Text fontWeight="medium">Checklist</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.500">
                        {task.checklist.filter(i => i.done).length}/{task.checklist.length}
                      </Text>
                    </HStack>
                    <Progress
                      size="xs"
                      borderRadius="full"
                      colorScheme="green"
                      value={(task.checklist.filter(i => i.done).length / task.checklist.length) * 100}
                    />
                    <VStack align="stretch" spacing={1}>
                      {task.checklist.map((item) => (
                        <Checkbox key={item.id} isChecked={item.done} isReadOnly pointerEvents="none">
                          <Text
                            fontSize="sm"
                            textDecoration={item.done ? 'line-through' : 'none'}
                            color={item.done ? 'gray.500' : undefined}
                          >
                            {item.text}
                          </Text>
                        </Checkbox>
                      ))}
                    </VStack>
                  </VStack>
                </GridItem>
              )}
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

            {/* Comments Section -- comments is a toggleable module
                (Settings > Modules); hide the whole section rather than
                show an empty list + a submit button that would just 403. */}
            {commentsEnabled && (
            <>
            <Divider />
            <Box>
              <Flex align="center" mb={4}>
                <Icon as={FaRegComment} mr={2} />
                <Text fontWeight="bold">Comments</Text>
              </Flex>

              <VStack align="start" spacing={4} mb={4}>
                {comments.map((comment) => (
                  <Box
                    key={comment.comment_id}
                    w="100%"
                    p={3}
                    bg={commentBg}
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
                        Just now
                      </Text>
                    </Flex>
                    <Text>{comment.content}</Text>
                  </Box>
                ))}
              </VStack>

              <Box w="100%">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  mb={2}
                  size="sm"
                  rows={3}
                />
                <Button
                  colorScheme="blue"
                  size="sm"
                  onClick={handleAddComment}
                  isDisabled={!newComment.trim() || isLoading}
                  isLoading={isLoading}
                >
                  Add Comment
                </Button>
              </Box>
            </Box>
            </>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TaskViewModal;

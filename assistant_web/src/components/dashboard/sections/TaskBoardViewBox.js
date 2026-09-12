import React, { useState } from 'react';
import { Box, Flex, Badge, Text, IconButton, Menu, MenuButton, MenuList, MenuItem, HStack, Table, Thead, Tbody, Tr, Th, Td, Tooltip } from "@chakra-ui/react";
import { EditIcon, DeleteIcon, ExternalLinkIcon, ViewIcon } from '@chakra-ui/icons';
import { FaEllipsisH } from 'react-icons/fa';
import { useToast } from "@chakra-ui/react";
import { useColorModeValue } from "@chakra-ui/react";
import TaskDataService from "../../../services/taskservice";
import TaskViewModal from "../modals/TaskViewModal";

// Color mapping for priorities
const priorityColors = {
  High: "red.400",
  Medium: "yellow.400",
  Low: "green.400",
  default: "gray.300"
};

const statusColors = {
  todo: "blue.400",
  in_progress: "orange.400",
  done: "green.400",
  default: "gray.300"
};

function TaskBoardViewBox({ task, handleUpdateItem, handleDeleteItem, priorityColorMapping, onEdit }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toast = useToast();
  const tileBg = useColorModeValue("white", "gray.800");
  const tileHoverBg = useColorModeValue("gray.50", "gray.700");
  const descColor = useColorModeValue("gray.600", "gray.400");

  const priorityColor = priorityColors[task.priority] || priorityColors.default;
  const statusColor = statusColors[task.status] || statusColors.default;

  const handleViewItem = () => {
    setIsModalOpen(true);
  };

  const handleShareClick = () => {
    const shareUrl = `${window.location.origin}/notes/${task.task_id}`;
    if (navigator.share) {
      navigator.share({
        title: task.title,
        text: task.description,
        url: shareUrl,
      }).catch(() => {});
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "Shareable link copied to clipboard.",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const saveTask = (task) => {
    TaskDataService.update(task.task_id, task)
      .then(response => {
        // Update local state with the new task data
        handleUpdateItem(response.data); // or use `task` if your backend doesn't return the updated object
        toast({
          title: "Task updated!",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      })
      .catch(error => {
        toast({
          title: "Update failed",
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      });
  };

  return (
    <>
      <Box
        p={3}
        borderRadius="lg"
        boxShadow="md"
        bg={tileBg}
        borderLeft="6px solid"
        borderLeftColor={priorityColor}
        transition="box-shadow 0.2s, transform 0.2s"
        _hover={{
          boxShadow: "lg",
          transform: "translateY(-2px)",
          bg: tileHoverBg
        }}
        minH="60px"
        maxW="320px"
        w="100%"
      >
        <Flex justify="space-between" align="center">
          <HStack spacing={2}>
            <Badge colorScheme={task.status === "done" ? "green" : task.status === "in_progress" ? "orange" : "blue"}>
              {task.status === "todo" ? "Not Started" : task.status === "in_progress" ? "In Progress" : "Done"}
            </Badge>
            <Badge colorScheme={priorityColorMapping[task.priority] || "gray"}>
              {task.priority}
            </Badge>
          </HStack>
          <HStack spacing={1}>
            <IconButton
              aria-label="View Task"
              icon={<ViewIcon />}
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleViewItem();
              }}
            />
            <Menu>
              <MenuButton 
                as={IconButton} 
                icon={<FaEllipsisH />} 
                aria-label="Options" 
                variant="ghost" 
                size="xs"
                onClick={(e) => e.stopPropagation()}
              />
              <MenuList>
                <MenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateItem(task);
                }} icon={<EditIcon />}>Edit</MenuItem>
                <MenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteItem(task);
                }} icon={<DeleteIcon />}>Delete</MenuItem>
                <MenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleShareClick();
                }} icon={<ExternalLinkIcon />}>Share</MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
        <Box onClick={handleViewItem} cursor="pointer" mt={2}>
          <Text fontWeight="bold" fontSize="md" noOfLines={1}>
            {task.title}
          </Text>
        </Box>
      </Box>
      <TaskViewModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        task={task}
        onEdit={onEdit}
      />
    </>
  );
}

export default TaskBoardViewBox;

export function NotionLikeTableView({
  data,
  onEdit,
  onDelete,
  onShare,
  columns = [
    { key: "title", label: "Title" },
    { key: "created_at", label: "Created At" },
    { key: "status", label: "Status" },
    { key: "priority", label: "Priority" },
  ],
}) {
  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const rowHoverBg = useColorModeValue("gray.50", "gray.700");
  const [selectedTask, setSelectedTask] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleViewTask = (task) => {
    setSelectedTask(task);
    setIsViewModalOpen(true);
  };

  return (
    <>
      <Box
        bg={bg}
        border="1px solid"
        borderColor={border}
        borderRadius="lg"
        boxShadow="md"
        p={4}
        mt={4}
        overflowX="auto"
      >
        <Table variant="simple" size="md">
          <Thead>
            <Tr>
              {columns.map((col) => (
                <Th key={col.key} fontWeight="bold" fontSize="md" color="gray.600">
                  {col.label}
                </Th>
              ))}
              <Th fontWeight="bold" fontSize="md" color="gray.600">
                Actions
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {data.map((row, idx) => (
              <Tr
                key={row.task_id || idx}
                _hover={{ bg: rowHoverBg }}
                transition="background 0.2s"
              >
                <Td maxW="220px">
                  <Tooltip label={row.title} hasArrow>
                    <Text isTruncated fontWeight="semibold">
                      {row.title}
                    </Text>
                  </Tooltip>
                </Td>
                <Td>
                  <Text fontSize="sm" color="gray.500">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString()
                      : "-"}
                  </Text>
                </Td>
                <Td>
                  <Badge
                    colorScheme={
                      row.status === "done"
                        ? "green"
                        : row.status === "in_progress"
                        ? "orange"
                        : "blue"
                    }
                    variant="subtle"
                    px={2}
                    py={1}
                    borderRadius="md"
                  >
                    {row.status === "todo"
                      ? "Not Started"
                      : row.status === "in_progress"
                      ? "In Progress"
                      : "Done"}
                  </Badge>
                </Td>
                <Td>
                  <Badge
                    colorScheme={
                      row.priority === "High"
                        ? "red"
                        : row.priority === "Medium"
                        ? "yellow"
                        : "green"
                    }
                    variant="outline"
                    px={2}
                    py={1}
                    borderRadius="md"
                  >
                    {row.priority}
                  </Badge>
                </Td>
                <Td>
                  <Flex gap={2}>
                    <Tooltip label="View" hasArrow>
                      <IconButton
                        aria-label="View"
                        icon={<ViewIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewTask(row)}
                      />
                    </Tooltip>
                    <Tooltip label="Edit" hasArrow>
                      <IconButton
                        aria-label="Edit"
                        icon={<EditIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(row)}
                      />
                    </Tooltip>
                    <Tooltip label="Delete" hasArrow>
                      <IconButton
                        aria-label="Delete"
                        icon={<DeleteIcon />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => onDelete(row)}
                      />
                    </Tooltip>
                    <Tooltip label="Share" hasArrow>
                      <IconButton
                        aria-label="Share"
                        icon={<ExternalLinkIcon />}
                        size="sm"
                        variant="ghost"
                        colorScheme="blue"
                        onClick={() => onShare(row)}
                      />
                    </Tooltip>
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
      {selectedTask && (
        <TaskViewModal 
          isOpen={isViewModalOpen} 
          onClose={() => setIsViewModalOpen(false)} 
          task={selectedTask}
          onEdit={onEdit}
        />
      )}
    </>
  );
}

import React, { useState } from 'react';
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Flex,
  VStack,
  HStack,
  Badge,
  Text,
  useToast,
  Icon,
  Tooltip,
  IconButton,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  SimpleGrid,
  useColorModeValue
} from '@chakra-ui/react';
import { useDispatch } from "react-redux";
import TimeBlock from './TimeBlock';
import { createGeneralTask } from '../../slices/tasks';
import { FiEdit2, FiTrash2, FiClock, FiChevronUp, FiChevronDown, FiPlus } from 'react-icons/fi';

const TimeBlockComponent = ({ isDrawerOpen, setIsDrawerOpen, blocks, setBlocks, viewMode, selectedDate }) => {
  const dispatch = useDispatch();
  const toast = useToast();
  const [editingBlock, setEditingBlock] = useState(null);

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.900', 'white');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const iconColor = useColorModeValue('gray.400', 'gray.500');
  const drawerBg = useColorModeValue('white', 'gray.800');
  const inputBg = useColorModeValue('white', 'gray.700');
  const inputBorder = useColorModeValue('gray.200', 'gray.600');

  const [newBlock, setNewBlock] = useState({
    startTime: '',
    endTime: '',
    description: '',
    status: 'pending'
  });

  const handleTimeChange = (type, hours, minutes) => {
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    
    setNewBlock({
      ...newBlock,
      [type]: date
    });
  };

  const handleDescriptionChange = (event) => {
    setNewBlock({
      ...newBlock,
      description: event.target.value,
    });
  };

  const saveTask = () => {
    const task_to_save = {
      description: newBlock.description,
      start_time: newBlock.startTime.toISOString(),
      end_time: newBlock.endTime.toISOString(),
      task_type: 'time_block',
      status: newBlock.status
    };

    dispatch(createGeneralTask(task_to_save))
      .unwrap()
      .then(() => {
        toast({
          title: "Success",
          description: "Time block created successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to create time block",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      });
  };

  const handleAddBlock = () => {
    if (!newBlock.startTime || !newBlock.endTime || !newBlock.description) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (newBlock.startTime >= newBlock.endTime) {
      toast({
        title: "Error",
        description: "End time must be after start time",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    saveTask();
    setBlocks([...blocks, { ...newBlock, id: Date.now() }]);
    setIsDrawerOpen(false);
    setNewBlock({
      startTime: '',
      endTime: '',
      description: '',
      status: 'pending'
    });
  };

  const handleEditBlock = (block) => {
    setEditingBlock(block);
    setNewBlock(block);
    setIsDrawerOpen(true);
  };

  const handleDeleteBlock = (blockId) => {
    setBlocks(blocks.filter(block => block.id !== blockId));
    toast({
      title: "Success",
      description: "Time block deleted successfully",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'in-progress':
        return 'blue';
      case 'pending':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const TimePicker = ({ type, value }) => {
    const hours = value ? value.getHours() : 0;
    const minutes = value ? value.getMinutes() : 0;

    return (
      <SimpleGrid columns={2} spacing={4}>
        <FormControl>
          <FormLabel>Hours</FormLabel>
          <NumberInput
            value={hours}
            min={0}
            max={23}
            onChange={(_, val) => handleTimeChange(type, val, minutes)}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>
        <FormControl>
          <FormLabel>Minutes</FormLabel>
          <NumberInput
            value={minutes}
            min={0}
            max={59}
            step={15}
            onChange={(_, val) => handleTimeChange(type, hours, val)}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>
      </SimpleGrid>
    );
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Time Blocks List */}
      {blocks.length === 0 ? (
        <Box 
          textAlign="center" 
          py={12} 
          px={6} 
          bg={cardBg} 
          borderRadius="xl" 
          borderWidth="1px" 
          borderColor={borderColor}
          borderStyle="dashed"
        >
          <Icon as={FiClock} boxSize={12} color={iconColor} mb={4} />
          <Text color={textColor} fontSize="lg" fontWeight="medium" mb={2}>No Time Blocks Yet</Text>
          <Text color={subTextColor}>Get started by creating your first time block</Text>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="blue"
            size="md"
            mt={6}
            onClick={() => setIsDrawerOpen(true)}
          >
            Create Time Block
          </Button>
        </Box>
      ) : (
        blocks.map((block) => (
          <Box
            key={block.id}
            p={6}
            bg={cardBg}
            borderRadius="xl"
            boxShadow="sm"
            position="relative"
            borderWidth="1px"
            borderColor={borderColor}
            _hover={{ 
              boxShadow: 'md',
              bg: hoverBg,
              transform: 'translateY(-2px)',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <Flex justify="space-between" align="center">
              <TimeBlock
                startTime={block.startTime}
                endTime={block.endTime}
                description={block.description}
              />
              <HStack spacing={3}>
                <Badge 
                  colorScheme={getStatusColor(block.status)}
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="sm"
                >
                  {block.status}
                </Badge>
                <Tooltip label="Edit">
                  <IconButton
                    icon={<FiEdit2 />}
                    size="sm"
                    variant="ghost"
                    color={textColor}
                    _hover={{ bg: hoverBg }}
                    onClick={() => handleEditBlock(block)}
                  />
                </Tooltip>
                <Tooltip label="Delete">
                  <IconButton
                    icon={<FiTrash2 />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    _hover={{ bg: 'red.50' }}
                    onClick={() => handleDeleteBlock(block.id)}
                  />
                </Tooltip>
              </HStack>
            </Flex>
          </Box>
        ))
      )}

      {/* Add/Edit Time Block Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        placement="right"
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingBlock(null);
          setNewBlock({
            startTime: '',
            endTime: '',
            description: '',
            status: 'pending'
          });
        }}
      >
        <DrawerOverlay />
        <DrawerContent bg={drawerBg}>
          <DrawerCloseButton color={textColor} />
          <DrawerHeader 
            borderBottomWidth="1px" 
            borderColor={borderColor}
            color={textColor}
          >
            {editingBlock ? 'Edit Time Block' : 'New Time Block'}
          </DrawerHeader>

          <DrawerBody>
            <Stack spacing={6}>
              <FormControl>
                <FormLabel color={textColor}>Start Time</FormLabel>
                <TimePicker type="startTime" value={newBlock.startTime} />
              </FormControl>

              <FormControl>
                <FormLabel color={textColor}>End Time</FormLabel>
                <TimePicker type="endTime" value={newBlock.endTime} />
              </FormControl>

              <FormControl>
                <FormLabel color={textColor}>Description</FormLabel>
                <Input
                  value={newBlock.description}
                  onChange={handleDescriptionChange}
                  placeholder="Enter block description"
                  bg={inputBg}
                  color={textColor}
                  borderColor={inputBorder}
                  _hover={{ borderColor: 'blue.400' }}
                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
                />
              </FormControl>

              <FormControl>
                <FormLabel color={textColor}>Status</FormLabel>
                <Select
                  value={newBlock.status}
                  onChange={(e) => setNewBlock({ ...newBlock, status: e.target.value })}
                  bg={inputBg}
                  color={textColor}
                  borderColor={inputBorder}
                  _hover={{ borderColor: 'blue.400' }}
                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </Select>
              </FormControl>
            </Stack>
          </DrawerBody>

          <DrawerFooter borderTopWidth="1px" borderColor={borderColor}>
            <Button 
              variant="outline" 
              mr={3} 
              onClick={() => setIsDrawerOpen(false)}
              color={textColor}
              borderColor={borderColor}
              _hover={{ bg: hoverBg }}
            >
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleAddBlock}
              _hover={{ transform: 'translateY(-1px)', boxShadow: 'md' }}
            >
              {editingBlock ? 'Save Changes' : 'Add Block'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </VStack>
  );
};

export default TimeBlockComponent;

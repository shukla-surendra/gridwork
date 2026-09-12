import React, { useEffect, useState } from 'react';
import {
  Box, Heading, Text, VStack, HStack, Checkbox, IconButton, Button, Icon,
  useColorModeValue, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, Input, Textarea, useToast, Spinner, Center, Badge,
} from '@chakra-ui/react';
import { FiBell, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import { fetchReminders, createReminder, updateReminder, deleteReminder } from '../../slices/reminders';

function toDatetimeLocal(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function NewReminderModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(() => toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000)));
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = () => {
    if (!title.trim()) {
      toast({ title: "Reminder title can't be empty", status: 'warning', duration: 2500, isClosable: true });
      return;
    }
    setIsSaving(true);
    dispatch(createReminder({ title: title.trim(), description: description.trim() || null, due_date: dueDate }))
      .unwrap()
      .then(() => {
        toast({ title: 'Reminder created', status: 'success', duration: 2000, isClosable: true });
        setTitle('');
        setDescription('');
        onClose();
      })
      .catch(err => toast({ title: "Couldn't create reminder", description: err, status: 'error', duration: 3500, isClosable: true }))
      .finally(() => setIsSaving(false));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>New Reminder</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Input placeholder="What do you want to be reminded of?" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
            <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="orange" onClick={handleCreate} isLoading={isSaving}>Create</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function ReminderRow({ reminder }) {
  const dispatch = useDispatch();
  const rowBg = useColorModeValue('white', 'gray.700');
  const isOverdue = !reminder.is_completed && new Date(reminder.due_date) < new Date();

  const toggleComplete = () => {
    dispatch(updateReminder({ reminderId: reminder.reminder_id, data: { is_completed: !reminder.is_completed } }));
  };

  const remove = () => {
    dispatch(deleteReminder(reminder.reminder_id));
  };

  return (
    <HStack bg={rowBg} p={3} borderRadius="md" boxShadow="sm" align="flex-start">
      <Checkbox isChecked={reminder.is_completed} onChange={toggleComplete} mt={1} />
      <VStack align="flex-start" spacing={0} flex={1}>
        <HStack>
          <Text
            fontWeight="medium"
            textDecoration={reminder.is_completed ? 'line-through' : 'none'}
            color={reminder.is_completed ? 'gray.500' : undefined}
          >
            {reminder.title}
          </Text>
          {reminder.repeat && <Badge colorScheme="purple" fontSize="2xs">{reminder.repeat}</Badge>}
          {isOverdue && <Badge colorScheme="red" fontSize="2xs">overdue</Badge>}
        </HStack>
        {reminder.description && <Text fontSize="sm" color="gray.500">{reminder.description}</Text>}
        <Text fontSize="xs" color="gray.400">{new Date(reminder.due_date).toLocaleString()}</Text>
      </VStack>
      <IconButton icon={<FiTrash2 />} size="sm" variant="ghost" colorScheme="red" aria-label="Delete reminder" onClick={remove} />
    </HStack>
  );
}

export default function RemindersPage() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const newReminderModal = useDisclosure();
  const dispatch = useDispatch();
  const { reminders, loading, error } = useSelector(state => state.reminders);
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');

  useEffect(() => {
    dispatch(fetchReminders());
  }, [dispatch]);

  return (
    <Box minH="100vh" bg={pageBg}>
      <Navbar isCollapsed={isMenuCollapsed} />
      <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
        <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
        <Box as="main" p={{ base: 3, md: 4 }} minH="calc(100vh - 4rem)" bg={mainBg} borderRadius="lg" boxShadow="sm">
          <HStack justify="space-between" mb={6}>
            <Heading size="lg">Reminders</Heading>
            <Button leftIcon={<FiPlus />} colorScheme="orange" onClick={newReminderModal.onOpen}>
              New Reminder
            </Button>
          </HStack>

          {loading && <Center py={16}><Spinner /></Center>}
          {error && <Text color="red.500">{error}</Text>}
          {!loading && !error && reminders.length === 0 && (
            <Center py={16}>
              <VStack spacing={3}>
                <Icon as={FiBell} boxSize={10} color="gray.400" />
                <Text color="gray.500">No reminders yet. Create one to get started.</Text>
              </VStack>
            </Center>
          )}

          <VStack align="stretch" spacing={3} maxW="640px">
            {reminders.map(reminder => (
              <ReminderRow key={reminder.reminder_id} reminder={reminder} />
            ))}
          </VStack>
        </Box>
      </Box>
      <NewReminderModal isOpen={newReminderModal.isOpen} onClose={newReminderModal.onClose} />
    </Box>
  );
}

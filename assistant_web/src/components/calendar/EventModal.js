import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Textarea,
  Button,
  ButtonGroup,
  HStack,
  VStack,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  Avatar,
  Box,
  Text,
  useToast,
} from '@chakra-ui/react';
import { FiTrash2 } from 'react-icons/fi';
import TaskService from '../../services/taskservice';
import MemberService from '../../services/MemberService';
import ConfigService from '../../utils/config';

export const KIND_TASK_TYPE = { event: 'meeting', focus: 'time_block' };
export const EVENT_COLORS = ['#3182CE', '#805AD5', '#38A169', '#DD6B20', '#E53E3E', '#319795', '#718096'];

const pad = (n) => String(n).padStart(2, '0');
// <input type="datetime-local"> works in local wall time without a zone.
export const toLocalInput = (date) => (date
  ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  : '');

const emptyForm = (draft) => ({
  kind: draft?.kind || 'event',
  title: draft?.title || '',
  start: toLocalInput(draft?.start),
  end: toLocalInput(draft?.end),
  location: draft?.location || '',
  description: draft?.description || '',
  color: draft?.color || EVENT_COLORS[0],
  attendees: draft?.attendees || [],
});

// Create or edit a calendar event (shared with the workspace) or a focus
// block (private). `draft` carries task_id when editing.
export default function EventModal({ isOpen, onClose, draft, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm(draft));
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isEdit = !!draft?.task_id;

  useEffect(() => {
    if (!isOpen) return;
    setForm(emptyForm(draft));
    setSubmitted(false);
    try {
      MemberService.getMembers(ConfigService.getDefaultWorkspace().workspace_id)
        .then((res) => setMembers(res.data || []))
        .catch(() => setMembers([]));
    } catch (e) { /* no workspace */ }
  }, [isOpen, draft]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleAttendee = (userId) => set('attendees', form.attendees.includes(userId)
    ? form.attendees.filter((id) => id !== userId)
    : [...form.attendees, userId]);

  const startDate = form.start ? new Date(form.start) : null;
  const endDate = form.end ? new Date(form.end) : null;
  const titleError = !form.title.trim() ? 'Give it a title' : null;
  const timeError = !startDate || !endDate ? 'Pick a start and end' : (endDate <= startDate ? 'End must be after start' : null);

  const save = async () => {
    setSubmitted(true);
    if (titleError || timeError) return;
    setSaving(true);
    const isEvent = form.kind === 'event';
    const payload = {
      title: form.title.trim(),
      description: form.description,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      meta_data: { ...(draft?.meta_data || {}), color: form.color, ...(isEvent ? { location: form.location } : {}) },
      watchers: isEvent ? form.attendees : [],
    };
    try {
      if (isEdit) {
        await TaskService.update(draft.task_id, payload);
      } else {
        await TaskService.create({ ...payload, task_type: KIND_TASK_TYPE[form.kind], status: 'scheduled', priority: 'medium' });
      }
      toast({ title: isEdit ? 'Saved' : (isEvent ? 'Event created' : 'Focus block added'), status: 'success', duration: 2000 });
      onSaved?.();
      onClose();
    } catch (err) {
      toast({ title: "Couldn't save", description: err.response?.data?.detail || 'Please try again', status: 'error', duration: 3500 });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await TaskService.remove(draft.task_id);
      toast({ title: 'Deleted', status: 'info', duration: 2000 });
      onSaved?.();
      onClose();
    } catch (err) {
      toast({ title: "Couldn't delete", description: err.response?.data?.detail || 'Please try again', status: 'error', duration: 3500 });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isEdit ? 'Edit' : 'New'} {form.kind === 'event' ? 'event' : 'focus block'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {!isEdit && (
              <ButtonGroup size="sm" isAttached variant="outline">
                <Button isActive={form.kind === 'event'} onClick={() => set('kind', 'event')}>Event</Button>
                <Button isActive={form.kind === 'focus'} onClick={() => set('kind', 'focus')}>Focus block</Button>
              </ButtonGroup>
            )}
            <Text fontSize="xs" color="gray.500" mt={-2}>
              {form.kind === 'event'
                ? 'Events are visible to everyone in the workspace.'
                : 'Focus blocks are private to you.'}
            </Text>

            <FormControl isRequired isInvalid={submitted && !!titleError}>
              <FormLabel>Title</FormLabel>
              <Input autoFocus value={form.title} onChange={(e) => set('title', e.target.value)}
                placeholder={form.kind === 'event' ? 'Sprint planning' : 'Deep work'} />
              <FormErrorMessage>{titleError}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={submitted && !!timeError}>
              <HStack align="flex-end">
                <Box flex="1">
                  <FormLabel>Start</FormLabel>
                  <Input type="datetime-local" value={form.start} onChange={(e) => set('start', e.target.value)} />
                </Box>
                <Box flex="1">
                  <FormLabel>End</FormLabel>
                  <Input type="datetime-local" value={form.end} onChange={(e) => set('end', e.target.value)} />
                </Box>
              </HStack>
              <FormErrorMessage>{timeError}</FormErrorMessage>
            </FormControl>

            {form.kind === 'event' && (
              <>
                <FormControl>
                  <FormLabel>Location or link</FormLabel>
                  <Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Room 2 or https://meet…" />
                </FormControl>
                <FormControl>
                  <FormLabel>Attendees</FormLabel>
                  {members.length === 0 ? (
                    <Text fontSize="sm" color="gray.500">No other members in this workspace yet.</Text>
                  ) : (
                    <Wrap>
                      {members.map((m) => {
                        const selected = form.attendees.includes(m.user_id);
                        return (
                          <WrapItem key={m.user_id}>
                            <Tag
                              size="lg"
                              borderRadius="full"
                              cursor="pointer"
                              variant={selected ? 'solid' : 'outline'}
                              colorScheme={selected ? 'blue' : 'gray'}
                              onClick={() => toggleAttendee(m.user_id)}
                            >
                              <Avatar size="2xs" name={m.name} src={m.avatar} ml={-1} mr={2} />
                              <TagLabel>{m.name || m.email}</TagLabel>
                            </Tag>
                          </WrapItem>
                        );
                      })}
                    </Wrap>
                  )}
                </FormControl>
              </>
            )}

            <FormControl>
              <FormLabel>Color</FormLabel>
              <HStack>
                {EVENT_COLORS.map((c) => (
                  <Box
                    key={c}
                    as="button"
                    type="button"
                    aria-label={`Color ${c}`}
                    w={6}
                    h={6}
                    borderRadius="full"
                    bg={c}
                    outline={form.color === c ? '2px solid' : 'none'}
                    outlineColor="blue.300"
                    outlineOffset="2px"
                    onClick={() => set('color', c)}
                  />
                ))}
              </HStack>
            </FormControl>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter justifyContent="space-between">
          {isEdit ? (
            <Button leftIcon={<FiTrash2 />} variant="ghost" colorScheme="red" onClick={remove} isLoading={deleting}>
              Delete
            </Button>
          ) : <span />}
          <HStack>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={save} isLoading={saving}>{isEdit ? 'Save' : 'Create'}</Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

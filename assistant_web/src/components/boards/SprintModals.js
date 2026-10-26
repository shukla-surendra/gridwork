import React, { useEffect, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Button, FormControl, FormLabel, Input, Textarea, Select, VStack, HStack, Text, Alert, AlertIcon,
} from '@chakra-ui/react';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm", not ISO/UTC.
const toLocalInput = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function StartSprintModal({ isOpen, onClose, sprint, issueCount, onStart }) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState('2');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !sprint) return;
    const start = sprint.start_date ? new Date(sprint.start_date) : new Date();
    setName(sprint.name);
    setGoal(sprint.goal || '');
    setDuration(sprint.end_date ? 'custom' : '2');
    setStartDate(toLocalInput(start));
    setEndDate(toLocalInput(sprint.end_date ? new Date(sprint.end_date) : new Date(start.getTime() + 2 * WEEK_MS)));
  }, [isOpen, sprint]);

  const applyDuration = (weeks, start = startDate) => {
    if (weeks !== 'custom' && start) {
      setEndDate(toLocalInput(new Date(new Date(start).getTime() + Number(weeks) * WEEK_MS)));
    }
  };

  const endBeforeStart = startDate && endDate && new Date(endDate) <= new Date(startDate);

  const handleStart = async () => {
    setSaving(true);
    try {
      // onStart reports failure itself (toast) and returns false -- keep
      // the dialog open so the user can fix and retry.
      const ok = await onStart({
        name: name.trim() || sprint.name,
        goal,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
      });
      if (ok !== false) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Start Sprint</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text fontSize="sm" color="gray.500" mb={4}>
            {issueCount} {issueCount === 1 ? 'issue' : 'issues'} will be included in this sprint.
          </Text>
          <VStack align="stretch" spacing={3}>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Sprint name</FormLabel>
              <Input size="sm" value={name} onChange={(e) => setName(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Duration</FormLabel>
              <Select size="sm" value={duration} onChange={(e) => { setDuration(e.target.value); applyDuration(e.target.value); }}>
                <option value="1">1 week</option>
                <option value="2">2 weeks</option>
                <option value="3">3 weeks</option>
                <option value="4">4 weeks</option>
                <option value="custom">Custom</option>
              </Select>
            </FormControl>
            <HStack spacing={3} align="flex-start">
              <FormControl isRequired>
                <FormLabel fontSize="sm">Start date</FormLabel>
                <Input
                  size="sm"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); applyDuration(duration, e.target.value); }}
                />
              </FormControl>
              <FormControl isRequired isInvalid={endBeforeStart}>
                <FormLabel fontSize="sm">End date</FormLabel>
                <Input
                  size="sm"
                  type="datetime-local"
                  value={endDate}
                  isDisabled={duration !== 'custom'}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </FormControl>
            </HStack>
            <FormControl>
              <FormLabel fontSize="sm">Sprint goal</FormLabel>
              <Textarea size="sm" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={2} onClick={onClose}>Cancel</Button>
          <Button colorScheme="teal" onClick={handleStart} isLoading={saving} isDisabled={!startDate || !endDate || endBeforeStart}>
            Start
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export function CompleteSprintModal({ isOpen, onClose, sprint, doneCount, openCount, onComplete }) {
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    setSaving(true);
    try {
      const ok = await onComplete();
      if (ok !== false) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Complete {sprint?.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={3}>
            <Text fontSize="sm">This sprint contains:</Text>
            <Text fontSize="sm" pl={3}>• <b>{doneCount}</b> completed {doneCount === 1 ? 'issue' : 'issues'}</Text>
            <Text fontSize="sm" pl={3}>• <b>{openCount}</b> open {openCount === 1 ? 'issue' : 'issues'}</Text>
            {openCount > 0 && (
              <Alert status="info" borderRadius="md" fontSize="sm">
                <AlertIcon />
                Open issues will be moved to the backlog.
              </Alert>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={2} onClick={onClose}>Cancel</Button>
          <Button colorScheme="teal" onClick={handleComplete} isLoading={saving}>Complete sprint</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

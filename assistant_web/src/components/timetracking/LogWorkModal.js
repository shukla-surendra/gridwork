import React, { useEffect, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, FormErrorMessage, FormHelperText, Input, Textarea, Button, HStack, VStack,
  Box, Text, Badge, Spinner, useColorModeValue, useToast,
} from '@chakra-ui/react';
import { FiTrash2 } from 'react-icons/fi';
import TaskService from '../../services/taskservice';
import TimeTrackingService from '../../services/TimeTrackingService';
import { parseDuration, formatDuration, toDateKey } from '../../utils/duration';

// Log (or edit) time on an issue. Without a `task` it asks which issue,
// for logging from the timesheet. onSaved receives the API result:
// { worklog?, task: {time fields} }. `userId` logs on someone else's
// behalf (admins only; the API enforces it).
export default function LogWorkModal({ isOpen, onClose, task, worklog, initialDate, userId, onSaved }) {
  const toast = useToast();
  const [issue, setIssue] = useState(task || null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [spent, setSpent] = useState('');
  const [workDate, setWorkDate] = useState(toDateKey(new Date()));
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  const isEdit = !!worklog;

  useEffect(() => {
    if (!isOpen) return;
    setIssue(task || (worklog ? { task_id: worklog.task_id, ticket_key: worklog.ticket_key, title: worklog.task_title } : null));
    setSpent(worklog ? formatDuration(worklog.duration_minutes) : '');
    setWorkDate(worklog?.work_date || initialDate || toDateKey(new Date()));
    setDescription(worklog?.description || '');
    setQuery('');
    setResults([]);
    setSubmitted(false);
  }, [isOpen, task, worklog, initialDate]);

  useEffect(() => {
    if (!isOpen || issue || !query.trim()) { setResults([]); return undefined; }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      TaskService.search(query.trim(), 8)
        .then((res) => { if (!cancelled) setResults((res.data || []).filter((t) => t.ticket_key)); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, issue, isOpen]);

  const minutes = parseDuration(spent);
  const today = toDateKey(new Date());
  const spentError = minutes == null ? 'Enter time like 1h 30m, 45m or 2' : (minutes < 1 || minutes > 1440 ? 'Between 1 minute and 24 hours' : null);
  const dateError = !workDate ? 'Pick a date' : (workDate > today ? "Can't log time in the future" : null);
  const issueError = !issue ? 'Pick an issue' : null;

  const save = async () => {
    setSubmitted(true);
    if (spentError || dateError || issueError) return;
    setSaving(true);
    const data = { work_date: workDate, duration_minutes: minutes, description };
    try {
      const res = isEdit
        ? await TimeTrackingService.updateWorklog(worklog.worklog_id, data)
        : await TimeTrackingService.logWork(issue.task_id, userId ? { ...data, user_id: userId } : data);
      toast({ title: isEdit ? 'Worklog updated' : `Logged ${formatDuration(minutes)} on ${issue.ticket_key}`, status: 'success', duration: 2000 });
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toast({ title: "Couldn't save the worklog", description: err.response?.data?.detail || 'Please try again', status: 'error', duration: 3500 });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      const res = await TimeTrackingService.deleteWorklog(worklog.worklog_id);
      toast({ title: 'Worklog deleted', status: 'info', duration: 2000 });
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toast({ title: "Couldn't delete the worklog", description: err.response?.data?.detail || 'Please try again', status: 'error', duration: 3500 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isEdit ? 'Edit worklog' : 'Log time'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired isInvalid={submitted && !!issueError}>
              <FormLabel>Issue</FormLabel>
              {issue ? (
                <HStack justify="space-between" borderWidth="1px" borderRadius="md" px={3} py={2}>
                  <HStack minW={0}>
                    <Badge colorScheme="blue">{issue.ticket_key}</Badge>
                    <Text noOfLines={1}>{issue.title}</Text>
                  </HStack>
                  {!task && !isEdit && <Button size="xs" variant="ghost" onClick={() => setIssue(null)}>Change</Button>}
                </HStack>
              ) : (
                <Box>
                  <Input autoFocus placeholder="Search by key or title" value={query} onChange={(e) => setQuery(e.target.value)} />
                  {searching && <Spinner size="xs" mt={2} />}
                  {results.length > 0 && (
                    <Box borderWidth="1px" borderRadius="md" mt={1} maxH="200px" overflowY="auto">
                      {results.map((t) => (
                        <HStack key={t.task_id} px={3} py={2} cursor="pointer" _hover={{ bg: hoverBg }} onClick={() => setIssue(t)}>
                          <Badge colorScheme="blue">{t.ticket_key}</Badge>
                          <Text fontSize="sm" noOfLines={1}>{t.title}</Text>
                        </HStack>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
              <FormErrorMessage>{issueError}</FormErrorMessage>
            </FormControl>

            <HStack align="flex-start">
              <FormControl isRequired isInvalid={submitted && !!spentError}>
                <FormLabel>Time spent</FormLabel>
                <Input autoFocus={!!issue} placeholder="2h 30m" value={spent} onChange={(e) => setSpent(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
                {minutes != null && !spentError
                  ? <FormHelperText>{formatDuration(minutes)}</FormHelperText>
                  : <FormErrorMessage>{spentError}</FormErrorMessage>}
              </FormControl>
              <FormControl isRequired isInvalid={submitted && !!dateError}>
                <FormLabel>Date</FormLabel>
                <Input type="date" max={today} value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
                <FormErrorMessage>{dateError}</FormErrorMessage>
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel>What did you work on?</FormLabel>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter justifyContent="space-between">
          {isEdit ? (
            <Button leftIcon={<FiTrash2 />} variant="ghost" colorScheme="red" onClick={remove} isDisabled={saving}>Delete</Button>
          ) : <span />}
          <HStack>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={save} isLoading={saving}>{isEdit ? 'Save' : 'Log time'}</Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

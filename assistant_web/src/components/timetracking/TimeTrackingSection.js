import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, HStack, VStack, Text, Progress, Avatar, IconButton, Input, FormControl, FormLabel,
  FormHelperText, Popover, PopoverTrigger, PopoverContent, PopoverBody, PopoverArrow, Portal,
  useColorModeValue, useDisclosure, useToast, Collapse,
} from '@chakra-ui/react';
import { FiClock, FiEdit2, FiPlus } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import TimeTrackingService from '../../services/TimeTrackingService';
import { formatDuration, parseDuration, fromDateKey } from '../../utils/duration';
import LogWorkModal from './LogWorkModal';

const TIME_FIELDS = ['original_estimate_minutes', 'remaining_estimate_minutes', 'time_spent_minutes'];

// Jira's time tracking field on an issue: estimate vs logged, the
// worklogs themselves, and "Log time". Estimate and worklog changes save
// immediately (not with the drawer's Save) and are merged back into the
// task through onTimeChange, so unsaved drawer edits aren't clobbered.
export default function TimeTrackingSection({ task, onTimeChange }) {
  const toast = useToast();
  const currentUserId = useSelector((state) => state.auth.user?.user_id);
  const logModal = useDisclosure();
  const estimatePopover = useDisclosure();
  const [worklogs, setWorklogs] = useState([]);
  const [canViewAll, setCanViewAll] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [editing, setEditing] = useState(null);
  const [original, setOriginal] = useState('');
  const [remaining, setRemaining] = useState('');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const rowBg = useColorModeValue('gray.50', 'gray.700');

  const spent = task?.time_spent_minutes || 0;
  const remainingMinutes = task?.remaining_estimate_minutes;
  const estimate = task?.original_estimate_minutes;
  const total = spent + (remainingMinutes || 0);
  const over = estimate != null && spent > estimate;

  const loadWorklogs = useCallback(() => {
    if (!task?.task_id) return;
    // Members get only their own worklogs back; admins get everyone's.
    TimeTrackingService.getWorklogs(task.task_id)
      .then((res) => { setWorklogs(res.data?.worklogs || []); setCanViewAll(!!res.data?.can_view_all); })
      .catch(() => setWorklogs([]));
  }, [task?.task_id]);

  useEffect(() => { loadWorklogs(); }, [loadWorklogs]);

  const applyTime = (result) => {
    if (result?.task) {
      onTimeChange?.(Object.fromEntries(TIME_FIELDS.map((k) => [k, result.task[k]])));
    }
    loadWorklogs();
  };

  const openEstimate = () => {
    setOriginal(estimate != null ? formatDuration(estimate) : '');
    setRemaining(task?.remaining_estimate_minutes != null ? formatDuration(task.remaining_estimate_minutes) : '');
    estimatePopover.onOpen();
  };

  const originalMinutes = original.trim() ? parseDuration(original) : null;
  const remainingParsed = remaining.trim() ? parseDuration(remaining) : null;
  const estimateInvalid = (original.trim() && originalMinutes == null) || (remaining.trim() && remainingParsed == null);

  const saveEstimate = async () => {
    if (estimateInvalid) return;
    const data = { original_estimate_minutes: originalMinutes };
    // Only send remaining when it was changed by hand; an untouched or
    // cleared field leaves it counting down from the new estimate.
    if (remaining.trim() && remainingParsed !== task?.remaining_estimate_minutes) {
      data.remaining_estimate_minutes = remainingParsed;
    }
    try {
      const res = await TimeTrackingService.setEstimate(task.task_id, data);
      applyTime({ task: res.data });
      estimatePopover.onClose();
    } catch (err) {
      toast({ title: "Couldn't save the estimate", description: err.response?.data?.detail, status: 'error', duration: 3000 });
    }
  };

  const openLog = (worklog = null) => {
    setEditing(worklog);
    logModal.onOpen();
  };

  if (!task?.task_id || !task.ticket_key) return null;

  return (
    <Box>
      <HStack justify="space-between" mb={2}>
        <HStack>
          <FiClock />
          <Text fontSize="sm" fontWeight="medium">Time tracking</Text>
        </HStack>
        <HStack spacing={1}>
          <Popover isOpen={estimatePopover.isOpen} onOpen={openEstimate} onClose={estimatePopover.onClose} placement="bottom-end">
            <PopoverTrigger>
              <Button size="xs" variant="ghost" leftIcon={<FiEdit2 />}>Estimate</Button>
            </PopoverTrigger>
            <Portal>
              <PopoverContent w="260px">
                <PopoverArrow />
                <PopoverBody>
                  <VStack align="stretch" spacing={3}>
                    <FormControl isInvalid={!!original.trim() && originalMinutes == null}>
                      <FormLabel fontSize="sm">Original estimate</FormLabel>
                      <Input size="sm" autoFocus placeholder="e.g. 2d or 6h" value={original} onChange={(e) => setOriginal(e.target.value)} />
                    </FormControl>
                    <FormControl isInvalid={!!remaining.trim() && remainingParsed == null}>
                      <FormLabel fontSize="sm">Remaining</FormLabel>
                      <Input size="sm" placeholder="Automatic" value={remaining} onChange={(e) => setRemaining(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEstimate(); }} />
                      <FormHelperText fontSize="xs">Leave blank to count down from the estimate. 1d = 8h.</FormHelperText>
                    </FormControl>
                    <HStack justify="flex-end">
                      <Button size="sm" variant="ghost" onClick={estimatePopover.onClose}>Cancel</Button>
                      <Button size="sm" colorScheme="blue" onClick={saveEstimate} isDisabled={estimateInvalid}>Save</Button>
                    </HStack>
                  </VStack>
                </PopoverBody>
              </PopoverContent>
            </Portal>
          </Popover>
          <Button size="xs" colorScheme="blue" variant="outline" leftIcon={<FiPlus />} onClick={() => openLog()}>Log time</Button>
        </HStack>
      </HStack>

      <Progress
        value={total ? (100 * spent) / total : 0}
        size="sm"
        borderRadius="full"
        colorScheme={over ? 'orange' : 'blue'}
        aria-label="Time logged against the estimate"
      />
      <HStack justify="space-between" mt={1} fontSize="xs" color={mutedColor}>
        <Text>{formatDuration(spent)} logged</Text>
        <Text>
          {remainingMinutes != null ? `${formatDuration(remainingMinutes)} remaining` : 'Not estimated'}
          {estimate != null && ` · estimate ${formatDuration(estimate)}`}
        </Text>
      </HStack>

      {worklogs.length > 0 && (
        <Box mt={2}>
          <Button size="xs" variant="link" onClick={() => setShowLogs((v) => !v)}>
            {showLogs ? 'Hide' : 'Show'} {canViewAll ? 'worklogs' : 'your worklogs'} ({worklogs.length})
          </Button>
          <Collapse in={showLogs} animateOpacity>
            <VStack align="stretch" spacing={1} mt={2}>
              {worklogs.map((w) => (
                <HStack key={w.worklog_id} bg={rowBg} borderRadius="md" px={2} py={1.5} spacing={2} align="flex-start">
                  <Avatar size="xs" name={w.user_name} />
                  <Box flex={1} minW={0}>
                    <HStack spacing={2} fontSize="sm">
                      <Text fontWeight="medium" noOfLines={1}>{w.user_name}</Text>
                      <Text color={mutedColor} fontSize="xs">
                        {fromDateKey(w.work_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                    </HStack>
                    {w.description && <Text fontSize="xs" color={mutedColor} noOfLines={2}>{w.description}</Text>}
                  </Box>
                  <Text fontSize="sm" fontWeight="semibold" whiteSpace="nowrap">{formatDuration(w.duration_minutes)}</Text>
                  {(w.user_id === currentUserId || canViewAll) && (
                    <IconButton size="xs" variant="ghost" icon={<FiEdit2 />} aria-label="Edit worklog" onClick={() => openLog(w)} />
                  )}
                </HStack>
              ))}
            </VStack>
          </Collapse>
        </Box>
      )}

      <LogWorkModal
        isOpen={logModal.isOpen}
        onClose={logModal.onClose}
        task={task}
        worklog={editing}
        onSaved={applyTime}
      />
    </Box>
  );
}

import React, { useEffect, useState } from 'react';
import { Avatar, Box, HStack, Spinner, Text, Tooltip, VStack, useColorModeValue } from '@chakra-ui/react';
import ActivityFeedService from '../../services/ActivityFeedService';
import ConfigService from '../../utils/config';
import { fullDateTime, relativeTime } from '../../utils/locale';
import { labelForStatus } from '../../utils/taskStatus';

const FIELD_LABELS = {
  status: 'Status',
  assignee_id: 'Assignee',
  completed: 'Resolution',
  title: 'Summary',
  priority: 'Priority',
  story_points: 'Story points',
  epic_id: 'Epic',
  sprint_id: 'Sprint',
  due_on: 'Due date',
};

const describe = (action, changes) => {
  if (action === 'created') return 'created the issue';
  if (action === 'commented') return 'added a comment';
  return changes.length === 1 ? `changed the ${FIELD_LABELS[changes[0][0]]}` : 'updated the issue';
};

const capitalize = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

// Field changes recorded on the issue (see TaskHandler.update_task), newest first.
export default function IssueHistory({ taskId, members = [], epics = [], sprints = [] }) {
  const [entries, setEntries] = useState(null);
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const valueBg = useColorModeValue('gray.100', 'gray.700');

  useEffect(() => {
    if (!taskId) return;
    setEntries(null);
    ActivityFeedService.getAll(ConfigService.getDefaultWorkspace().workspace_id, { entityId: taskId, limit: 100 })
      .then((res) => setEntries(res.data || []))
      .catch(() => setEntries([]));
  }, [taskId]);

  const display = (field, value) => {
    if (value === null || value === undefined || value === '') return 'None';
    switch (field) {
      case 'status': return labelForStatus(value);
      case 'priority': return capitalize(value);
      case 'assignee_id': return members.find((m) => m.user_id === value)?.name || 'Former member';
      case 'epic_id': return epics.find((e) => e.epic_id === value)?.title || 'Deleted epic';
      case 'sprint_id': return sprints.find((s) => s.sprint_id === value)?.name || 'Deleted sprint';
      case 'completed': return value ? 'Done' : 'Unresolved';
      case 'due_on': return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' });
      default: return String(value);
    }
  };

  if (entries === null) return <Spinner size="sm" />;
  if (entries.length === 0) return <Text fontSize="sm" color={mutedColor}>No history yet.</Text>;

  const Value = ({ children }) => (
    <Box as="span" bg={valueBg} px={1.5} py={0.5} borderRadius="sm" fontSize="xs">{children}</Box>
  );

  return (
    <VStack align="stretch" spacing={4}>
      {entries.map((entry) => {
        const who = `${entry.user?.first_name || ''} ${entry.user?.last_name || ''}`.trim() || 'Someone';
        const changes = Object.entries(entry.properties?.changes || {}).filter(([field]) => FIELD_LABELS[field]);
        return (
          <HStack key={entry.activity_id} align="flex-start" spacing={3}>
            <Avatar size="sm" name={who} />
            <Box flex={1} fontSize="sm">
              <HStack spacing={2} flexWrap="wrap">
                <Text fontWeight="semibold">{who}</Text>
                <Text>{describe(entry.action, changes)}</Text>
                <Tooltip label={fullDateTime(entry.created_at)} openDelay={400}>
                  <Text color={mutedColor}>{relativeTime(entry.created_at)}</Text>
                </Tooltip>
              </HStack>
              {changes.map(([field, change]) => (
                <HStack key={field} spacing={2} mt={1} flexWrap="wrap">
                  {changes.length > 1 && <Text color={mutedColor} minW="90px">{FIELD_LABELS[field]}</Text>}
                  <Value>{display(field, change.from)}</Value>
                  <Text color={mutedColor}>→</Text>
                  <Value>{display(field, change.to)}</Value>
                </HStack>
              ))}
            </Box>
          </HStack>
        );
      })}
    </VStack>
  );
}

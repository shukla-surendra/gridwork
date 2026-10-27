import React from 'react';
import {
  HStack, Input, InputGroup, InputLeftElement, Avatar, Tooltip, Button, Select, Box, Wrap, WrapItem,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiSearch, FiX } from 'react-icons/fi';
import { ISSUE_TYPES, issueTypeOf } from '../../utils/issueTypes';

export const EMPTY_FILTERS = { search: '', assigneeIds: [], onlyMine: false, epicId: '', issueType: '' };

export const hasActiveFilters = (filters) =>
  !!(filters.search || filters.assigneeIds.length || filters.onlyMine || filters.epicId || filters.issueType);

// Quick-filter semantics: every active filter must match (AND), and
// within the avatar row any selected person matches (OR).
export const matchesFilters = (task, filters, currentUserId) => {
  const q = filters.search.trim().toLowerCase();
  if (q && !(task.title || '').toLowerCase().includes(q) && !(task.ticket_key || '').toLowerCase().includes(q)) {
    return false;
  }
  if (filters.assigneeIds.length && !filters.assigneeIds.includes(task.assignee_id)) return false;
  if (filters.onlyMine && task.assignee_id !== currentUserId) return false;
  if (filters.epicId && task.epic_id !== filters.epicId) return false;
  if (filters.issueType && issueTypeOf(task) !== filters.issueType) return false;
  return true;
};

export default function BoardFilters({
  filters, onChange, members, epics, groupBy, onGroupByChange,
}) {
  const ringColor = useColorModeValue('white', 'gray.800');
  const set = (patch) => onChange({ ...filters, ...patch });
  const toggleAssignee = (userId) => set({
    assigneeIds: filters.assigneeIds.includes(userId)
      ? filters.assigneeIds.filter(id => id !== userId)
      : [...filters.assigneeIds, userId],
  });

  return (
    <Wrap spacing={3} align="center" mb={4}>
      <WrapItem>
        <InputGroup size="sm" width="220px">
          <InputLeftElement pointerEvents="none"><FiSearch /></InputLeftElement>
          <Input
            placeholder="Search this board"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            borderRadius="md"
          />
        </InputGroup>
      </WrapItem>

      {members.length > 0 && (
        <WrapItem>
          <HStack spacing={-1}>
            {members.map(member => {
              const selected = filters.assigneeIds.includes(member.user_id);
              return (
                <Tooltip key={member.user_id} label={member.name}>
                  <Box
                    as="button"
                    type="button"
                    aria-pressed={selected}
                    aria-label={`Filter by ${member.name}`}
                    onClick={() => toggleAssignee(member.user_id)}
                    borderRadius="full"
                    zIndex={selected ? 1 : 0}
                    _hover={{ zIndex: 2, transform: 'translateY(-2px)' }}
                    transition="transform 0.1s ease"
                  >
                    <Avatar
                      size="sm"
                      name={member.name}
                      src={member.avatar}
                      borderWidth="2px"
                      borderColor={selected ? 'teal.400' : ringColor}
                    />
                  </Box>
                </Tooltip>
              );
            })}
          </HStack>
        </WrapItem>
      )}

      <WrapItem>
        <Button
          size="sm"
          variant={filters.onlyMine ? 'solid' : 'ghost'}
          colorScheme={filters.onlyMine ? 'teal' : 'gray'}
          onClick={() => set({ onlyMine: !filters.onlyMine })}
        >
          Only my issues
        </Button>
      </WrapItem>

      <WrapItem>
        <Select size="sm" width="130px" value={filters.issueType} onChange={(e) => set({ issueType: e.target.value })}>
          <option value="">All types</option>
          {Object.entries(ISSUE_TYPES).map(([value, config]) => (
            <option key={value} value={value}>{config.label}</option>
          ))}
        </Select>
      </WrapItem>

      {epics.length > 0 && (
        <WrapItem>
          <Select size="sm" width="160px" value={filters.epicId} onChange={(e) => set({ epicId: e.target.value })}>
            <option value="">All epics</option>
            {epics.map(epic => <option key={epic.epic_id} value={epic.epic_id}>{epic.title}</option>)}
          </Select>
        </WrapItem>
      )}

      {onGroupByChange && (
        <WrapItem>
          <Select size="sm" width="170px" value={groupBy} onChange={(e) => onGroupByChange(e.target.value)}>
            <option value="none">No swimlanes</option>
            <option value="assignee">Swimlanes: Assignee</option>
            {epics.length > 0 && <option value="epic">Swimlanes: Epic</option>}
          </Select>
        </WrapItem>
      )}

      {hasActiveFilters(filters) && (
        <WrapItem>
          <Button size="sm" variant="link" leftIcon={<FiX />} onClick={() => onChange(EMPTY_FILTERS)}>
            Clear filters
          </Button>
        </WrapItem>
      )}
    </Wrap>
  );
}

import React from 'react';
import { Icon, Tooltip } from '@chakra-ui/react';
import { ISSUE_TYPES, PRIORITY_ICONS, issueTypeOf } from '../../utils/issueTypes';
import { labelForPriority } from '../../utils/taskStatus';

export function IssueTypeIcon({ task, type, boxSize = 3.5 }) {
  const config = ISSUE_TYPES[type || issueTypeOf(task)];
  return (
    <Tooltip label={config.label} openDelay={400}>
      <span><Icon as={config.icon} color={config.color} boxSize={boxSize} display="block" /></span>
    </Tooltip>
  );
}

export function PriorityIcon({ priority, boxSize = 4 }) {
  const config = PRIORITY_ICONS[priority];
  if (!config) return null;
  return (
    <Tooltip label={`${labelForPriority(priority)} priority`} openDelay={400}>
      <span><Icon as={config.icon} color={config.color} boxSize={boxSize} display="block" /></span>
    </Tooltip>
  );
}

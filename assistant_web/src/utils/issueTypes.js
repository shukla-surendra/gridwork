import { FiBookmark, FiCheckSquare, FiAlertOctagon, FiChevronsUp, FiChevronUp, FiChevronDown, FiMinus } from 'react-icons/fi';

// Jira-style issue types. Stored in Task.meta_data.issue_type rather than
// Task.task_type -- task_type already separates tasks from notes/time
// blocks across the app (and is filtered on by several list endpoints), so
// overloading it would hide board cards from those views. A card with no
// issue_type set renders as a plain Task.
export const ISSUE_TYPES = {
  story: { label: 'Story', icon: FiBookmark, color: 'green.500' },
  task: { label: 'Task', icon: FiCheckSquare, color: 'blue.500' },
  bug: { label: 'Bug', icon: FiAlertOctagon, color: 'red.500' },
};

export const DEFAULT_ISSUE_TYPE = 'task';

export const issueTypeOf = (task) => {
  const type = task?.meta_data?.issue_type;
  return ISSUE_TYPES[type] ? type : DEFAULT_ISSUE_TYPE;
};

// Merge-friendly setter for the drawers: keeps whatever else lives in
// meta_data instead of replacing the whole object.
export const withIssueType = (task, issueType) => ({
  ...task,
  meta_data: { ...(task?.meta_data || {}), issue_type: issueType },
});

// Jira's priority arrows -- keyed by the lowercase values the backend
// stores (see PRIORITY_COLOR in taskStatus.js).
export const PRIORITY_ICONS = {
  urgent: { icon: FiChevronsUp, color: 'red.500' },
  high: { icon: FiChevronUp, color: 'orange.400' },
  medium: { icon: FiMinus, color: 'yellow.500' },
  low: { icon: FiChevronDown, color: 'green.500' },
};

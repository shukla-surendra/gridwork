// What each backend notification type (utils/notifications.py) looks like in
// the UI, and where clicking one takes you.
import { FiUserCheck, FiMessageSquare, FiRefreshCw, FiClock, FiBell } from 'react-icons/fi';
import { browsePath } from './issueLinks';

export const NOTIFICATION_TYPES = {
  assigned: { label: 'Assigned', color: 'blue', icon: FiUserCheck, description: 'An issue is assigned to you' },
  comment: { label: 'Comment', color: 'purple', icon: FiMessageSquare, description: 'Someone comments on an issue you follow' },
  status_changed: { label: 'Status', color: 'green', icon: FiRefreshCw, description: 'An issue you follow changes status' },
  reminder: { label: 'Reminder', color: 'orange', icon: FiClock, description: 'One of your reminders comes due' },
};

export const notificationMeta = (type) =>
  NOTIFICATION_TYPES[type] || { label: type || 'Notice', color: 'gray', icon: FiBell };

export const notificationHref = (n) => {
  if (n.properties?.ticket_key) return browsePath(n.properties.ticket_key);
  if (n.entity_type === 'reminder') return '/reminders';
  return null;
};

// The API sends naive UTC timestamps; without a zone the browser would read them as local time.
export const asUtc = (value) =>
  (typeof value === 'string' && !/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? `${value}Z` : value);

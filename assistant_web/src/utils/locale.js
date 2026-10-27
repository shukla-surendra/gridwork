export function formatLocalDateTime(datetimeStr) {
    if (!datetimeStr) return ''; // return empty string if datetimeStr is null or undefined
    
    const utcDate = new Date(datetimeStr);
    const options = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    };
    const localDateStr = utcDate.toLocaleString('en-US', options);

    return localDateStr;
  }

export function timeAgo(datetimeStr) {
  if (!datetimeStr) return '';
  const seconds = Math.floor((Date.now() - new Date(datetimeStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatLocalDateTime(datetimeStr);
}
// The API returns naive UTC timestamps ("2026-10-27T09:30:00"); without a
// zone, Date would read them as local time.
export function serverDate(value) {
  if (!value) return null;
  const hasZone = /([zZ]|[+-]\d\d:?\d\d)$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

// "just now", "5 minutes ago", "yesterday", then a short date.
export function relativeTime(value) {
  const date = value instanceof Date ? value : serverDate(value);
  if (!date) return '';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

export function fullDateTime(value) {
  const date = value instanceof Date ? value : serverDate(value);
  return date ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

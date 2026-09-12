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
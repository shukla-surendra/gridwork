// Shareable issue links: /browse?key=ENG-42 resolves the key and
// forwards to wherever the issue lives (its board, or the Tasks page) with
// ?selectedIssue=ENG-42 so that page opens it. Query params rather than a
// /browse/[key] route because the app is a static export (next.config.mjs).
export const browsePath = (ticketKey) => `/browse?key=${encodeURIComponent(ticketKey)}`;

export const browseUrl = (ticketKey) =>
  (typeof window === 'undefined' ? '' : window.location.origin) + browsePath(ticketKey);

export const issuePagePath = (task) => (task.board_id
  ? `/boards/detail?boardId=${task.board_id}&selectedIssue=${encodeURIComponent(task.ticket_key)}`
  : `/tasks?selectedIssue=${encodeURIComponent(task.ticket_key)}`);

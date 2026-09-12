// Shared between the Tasks Kanban, Board Kanban, and Dashboard cards so a
// status like "in_progress" always renders as "In Progress" instead of the
// raw enum value, and so the color/label mapping doesn't drift between pages.
export const TASK_STATUSES = ["todo", "in_progress", "review", "done"];

export const STATUS_LABELS = {
  todo: "To Do",
  backlog: "Backlog",
  in_progress: "In Progress",
  blocked: "Blocked",
  review: "Review",
  approved: "Approved",
  done: "Done",
  cancelled: "Cancelled",
  archived: "Archived",
  scheduled: "Scheduled",
  on_hold: "On Hold",
};

export const labelForStatus = (status) => {
  if (!status) return "No Status";
  return STATUS_LABELS[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export const getStatusColor = (status) => {
  switch (status) {
    case "todo": return "gray";
    case "backlog": return "gray";
    case "in_progress": return "blue";
    case "review": return "purple";
    case "approved": return "cyan";
    case "blocked": return "red";
    case "done": return "green";
    case "cancelled": return "red";
    case "archived": return "gray";
    case "on_hold": return "orange";
    default: return "gray";
  }
};

// Real Task.priority values are lowercase ("urgent"/"high"/"medium"/"low"/
// "none") -- keyed that way here since a Title-Case key here would never match.
export const PRIORITY_COLOR = { urgent: 'red', high: 'orange', medium: 'yellow', low: 'green', none: 'gray' };

export const labelForPriority = (priority) => {
  if (!priority) return "No Priority";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

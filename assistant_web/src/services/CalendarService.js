import http from "../http-common";
import ConfigService from "../utils/config";

// Read side of the calendar: events, focus blocks, due dates, reminders and
// sprints overlapping [start, end). Events/focus blocks are tasks
// (task_type "meeting" / "time_block") and are written through TaskService.
const getRange = (start, end) => {
  const workspaceId = ConfigService.getDefaultWorkspace().workspace_id;
  return http.get(`/api/v1/workspaces/${workspaceId}/calendar`, {
    params: { start: start.toISOString(), end: end.toISOString() },
  });
};

const CalendarService = { getRange };

export default CalendarService;

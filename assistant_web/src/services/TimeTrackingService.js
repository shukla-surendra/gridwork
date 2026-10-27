import http from "../http-common";
import ConfigService from "../utils/config";

// Worklogs, estimates, timesheets and capacity.
const base = () => `/api/v1/workspaces/${ConfigService.getDefaultWorkspace().workspace_id}`;

const getWorklogs = (taskId) => http.get(`${base()}/tasks/${taskId}/worklogs`);
const logWork = (taskId, data) => http.post(`${base()}/tasks/${taskId}/worklogs`, data);
const updateWorklog = (worklogId, data) => http.put(`${base()}/worklogs/${worklogId}`, data);
const deleteWorklog = (worklogId) => http.delete(`${base()}/worklogs/${worklogId}`);
const setEstimate = (taskId, data) => http.put(`${base()}/tasks/${taskId}/estimate`, data);

const getTimesheet = (start, end, userId) => http.get(`${base()}/timesheet`, { params: { start, end, user_id: userId || undefined } });
const getTeamTimesheet = (start, end) => http.get(`${base()}/timesheet/team`, { params: { start, end } });

const getMemberSchemes = () => http.get(`${base()}/capacity/members`);
const setMemberScheme = (userId, data) => http.put(`${base()}/capacity/members/${userId}`, data);
const getOpenSprints = () => http.get(`${base()}/capacity/sprints`);
const getSprintWorkload = (sprintId) => http.get(`${base()}/capacity/sprints/${sprintId}`);

const getTimeOff = (start, end) => http.get(`${base()}/time-off`, { params: { start, end } });
const addTimeOff = (data) => http.post(`${base()}/time-off`, data);
const deleteTimeOff = (timeOffId) => http.delete(`${base()}/time-off/${timeOffId}`);

const TimeTrackingService = {
  getWorklogs, logWork, updateWorklog, deleteWorklog, setEstimate,
  getTimesheet, getTeamTimesheet,
  getMemberSchemes, setMemberScheme, getOpenSprints, getSprintWorkload,
  getTimeOff, addTimeOff, deleteTimeOff,
};

export default TimeTrackingService;

import http from "../http-common";
import ConfigService from "../utils/config";

const getAll = () => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.get(`/api/v1/workspaces/${workspace_id}/reminders/`);
};

const create = (data) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.post(`/api/v1/workspaces/${workspace_id}/reminders/`, data);
};

const update = (reminderId, data) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.put(`/api/v1/workspaces/${workspace_id}/reminders/${reminderId}`, data);
};

const remove = (reminderId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.delete(`/api/v1/workspaces/${workspace_id}/reminders/${reminderId}`);
};

const ReminderService = {
  getAll,
  create,
  update,
  remove,
};

export default ReminderService;

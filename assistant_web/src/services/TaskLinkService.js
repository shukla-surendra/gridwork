import http from "../http-common";
import ConfigService from "../utils/config";

const base = (taskId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return `/api/v1/workspaces/${workspace_id}/tasks/${taskId}/links`;
};

const getAll = (taskId) => http.get(`${base(taskId)}/`);
const create = (taskId, data) => http.post(`${base(taskId)}/`, data);
const remove = (taskId, linkId) => http.delete(`${base(taskId)}/${linkId}`);

const TaskLinkService = { getAll, create, remove };

export default TaskLinkService;

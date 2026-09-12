import http from "../http-common";
import ConfigService from "../utils/config";

const getAll = () => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.get(`/api/v1/workspaces/${workspace_id}/databases/`);
};

const get = (databaseId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.get(`/api/v1/workspaces/${workspace_id}/databases/${databaseId}`);
};

const create = (data) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.post(`/api/v1/workspaces/${workspace_id}/databases/`, data);
};

const update = (databaseId, data) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.put(`/api/v1/workspaces/${workspace_id}/databases/${databaseId}`, data);
};

const remove = (databaseId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.delete(`/api/v1/workspaces/${workspace_id}/databases/${databaseId}`);
};

const DatabaseService = {
  getAll,
  get,
  create,
  update,
  remove,
};

export default DatabaseService;

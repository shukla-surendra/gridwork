import http from "../http-common";
import ConfigService from "../utils/config";

const getAll = (databaseId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.get(`/api/v1/workspaces/${workspace_id}/databases/${databaseId}/entries`);
};

const create = (databaseId, data) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.post(`/api/v1/workspaces/${workspace_id}/databases/${databaseId}/entries`, data);
};

const update = (databaseId, entryId, data) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.put(`/api/v1/workspaces/${workspace_id}/databases/${databaseId}/entries/${entryId}`, data);
};

const remove = (databaseId, entryId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.delete(`/api/v1/workspaces/${workspace_id}/databases/${databaseId}/entries/${entryId}`);
};

const DatabaseEntryService = {
  getAll,
  create,
  update,
  remove,
};

export default DatabaseEntryService;

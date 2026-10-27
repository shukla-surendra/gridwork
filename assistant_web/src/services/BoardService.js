import http from "../http-common";
import ConfigService from "../utils/config";

const getAll = () => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.get(`/api/v1/workspaces/${workspace_id}/boards/`);
};

const get = (boardId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.get(`/api/v1/workspaces/${workspace_id}/boards/${boardId}`);
};

const create = (data) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.post(`/api/v1/workspaces/${workspace_id}/boards/`, data);
};

const update = (boardId, data) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.put(`/api/v1/workspaces/${workspace_id}/boards/${boardId}`, data);
};

const remove = (boardId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.delete(`/api/v1/workspaces/${workspace_id}/boards/${boardId}`);
};

// CSV issue import. dryRun previews what would be created without saving.
const importIssues = (boardId, csv, dryRun = true) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.post(`/api/v1/workspaces/${workspace_id}/boards/${boardId}/import`, { csv, dry_run: dryRun });
};

const BoardService = {
  importIssues,
  getAll,
  get,
  create,
  update,
  remove,
};

export default BoardService;

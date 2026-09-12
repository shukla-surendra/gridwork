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

const BoardService = {
  getAll,
  get,
  create,
  update,
  remove,
};

export default BoardService;

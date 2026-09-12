import http from "../http-common";
import ConfigService from "../utils/config";

const getAll = (pageId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.get(`/api/v1/workspaces/${workspace_id}/pages/${pageId}/blocks`);
};

const create = (pageId, data) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.post(`/api/v1/workspaces/${workspace_id}/pages/${pageId}/blocks`, data);
};

const update = (pageId, blockId, data) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.put(`/api/v1/workspaces/${workspace_id}/pages/${pageId}/blocks/${blockId}`, data);
};

const remove = (pageId, blockId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.delete(`/api/v1/workspaces/${workspace_id}/pages/${pageId}/blocks/${blockId}`);
};

const BlockService = {
  getAll,
  create,
  update,
  remove,
};

export default BlockService;

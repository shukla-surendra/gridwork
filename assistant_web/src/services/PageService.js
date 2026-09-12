import http from "../http-common";
import ConfigService from "../utils/config";

const getAll = () => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.get(`/api/v1/workspaces/${workspace_id}/pages/`);
};

const get = (pageId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.get(`/api/v1/workspaces/${workspace_id}/pages/${pageId}`);
};

const create = (data) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.post(`/api/v1/workspaces/${workspace_id}/pages/`, data);
};

const update = (pageId, data) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.put(`/api/v1/workspaces/${workspace_id}/pages/${pageId}`, data);
};

const remove = (pageId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.delete(`/api/v1/workspaces/${workspace_id}/pages/${pageId}`);
};

const PageService = {
  getAll,
  get,
  create,
  update,
  remove,
};

export default PageService;

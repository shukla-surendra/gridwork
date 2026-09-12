import http from "../http-common";
import ConfigService from "../utils/config";

const getAll = (pageId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.get(`/api/v1/workspaces/${workspace_id}/pages/${pageId}/comments`);
};

const create = (pageId, content) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.post(`/api/v1/workspaces/${workspace_id}/pages/${pageId}/comments`, { content });
};

const remove = (pageId, commentId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return http.delete(`/api/v1/workspaces/${workspace_id}/pages/${pageId}/comments/${commentId}`);
};

const PageCommentService = { getAll, create, remove };

export default PageCommentService;

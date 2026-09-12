import http from "../http-common";
import ConfigService from "../utils/config";

const getAll = () => {
  const workspaceId = ConfigService.getDefaultWorkspace().workspace_id;
  return http.get(`/api/v1/workspaces/${workspaceId}/notifications/`);
};

const update = (notificationId, data) => {
  const workspaceId = ConfigService.getDefaultWorkspace().workspace_id;
  return http.put(`/api/v1/workspaces/${workspaceId}/notifications/${notificationId}`, data);
};

const remove = (notificationId) => {
  const workspaceId = ConfigService.getDefaultWorkspace().workspace_id;
  return http.delete(`/api/v1/workspaces/${workspaceId}/notifications/${notificationId}`);
};

const NotificationService = {
  getAll,
  update,
  remove,
};

export default NotificationService;

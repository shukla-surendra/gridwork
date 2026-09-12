import http from "../http-common";
import ConfigService from "../utils/config";

const get = () => {
  return http.get(`/api/v1/workspaces/${ConfigService.getDefaultWorkspace().workspace_id}/settings/`);
};

const update = (data) => {
  // settings_id comes from the GET response (merged into Redux state) --
  // the real PUT route is scoped to one settings row, not just a workspace.
  const workspaceId = ConfigService.getDefaultWorkspace().workspace_id;
  return http.put(`/api/v1/workspaces/${workspaceId}/settings/${data.settings_id}`, data);
};

const SettingsService = {
  get,
  update,
};

export default SettingsService; 
import http from "../http-common";
import ConfigService from "../utils/config";

const base = () => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return `/api/v1/workspaces/${workspace_id}/modules`;
};

const getAll = () => http.get(`${base()}/`);
const toggle = (moduleKey, enabled) => http.put(`${base()}/${moduleKey}`, { enabled });

const ModuleService = { getAll, toggle };

export default ModuleService;

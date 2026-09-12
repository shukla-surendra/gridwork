import http from "../http-common";
import ConfigService from "../utils/config";

const getSummary = () => {
  return http.get(`/api/v1/workspaces/${ConfigService.getDefaultWorkspace().workspace_id}/reports/summary`);
};

const ReportsService = {
  getSummary,
};

export default ReportsService;

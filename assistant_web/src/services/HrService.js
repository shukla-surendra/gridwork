import http from "../http-common";
import ConfigService from "../utils/config";

const wsId = () => ConfigService.getDefaultWorkspace().workspace_id;

// Employees
const getEmployees = () => http.get(`/api/v1/workspaces/${wsId()}/hr/employees`);
const getMyEmployeeRecord = () => http.get(`/api/v1/workspaces/${wsId()}/hr/employees/me`);
const getEmployee = (employeeId) => http.get(`/api/v1/workspaces/${wsId()}/hr/employees/${employeeId}`);
const createEmployee = (data) => http.post(`/api/v1/workspaces/${wsId()}/hr/employees`, data);
const updateEmployee = (employeeId, data) => http.put(`/api/v1/workspaces/${wsId()}/hr/employees/${employeeId}`, data);
const removeEmployee = (employeeId) => http.delete(`/api/v1/workspaces/${wsId()}/hr/employees/${employeeId}`);

// Leave requests
const getLeaveRequests = (params = {}) => http.get(`/api/v1/workspaces/${wsId()}/hr/leave-requests`, { params });
const createLeaveRequest = (data) => http.post(`/api/v1/workspaces/${wsId()}/hr/leave-requests`, data);
const reviewLeaveRequest = (leaveRequestId, data) => http.put(`/api/v1/workspaces/${wsId()}/hr/leave-requests/${leaveRequestId}/review`, data);
const cancelLeaveRequest = (leaveRequestId) => http.delete(`/api/v1/workspaces/${wsId()}/hr/leave-requests/${leaveRequestId}`);
const getLeaveBalance = (employeeId) => http.get(`/api/v1/workspaces/${wsId()}/hr/employees/${employeeId}/leave-balance`);

// Onboarding
const getOnboardingTemplates = () => http.get(`/api/v1/workspaces/${wsId()}/hr/onboarding-templates`);
const createOnboardingTemplate = (data) => http.post(`/api/v1/workspaces/${wsId()}/hr/onboarding-templates`, data);
const updateOnboardingTemplate = (templateId, data) => http.put(`/api/v1/workspaces/${wsId()}/hr/onboarding-templates/${templateId}`, data);
const removeOnboardingTemplate = (templateId) => http.delete(`/api/v1/workspaces/${wsId()}/hr/onboarding-templates/${templateId}`);
const applyOnboardingTemplate = (employeeId, templateId) => http.post(`/api/v1/workspaces/${wsId()}/hr/employees/${employeeId}/onboarding/apply`, { template_id: templateId });
const toggleChecklistItem = (employeeId, itemId, done) => http.put(`/api/v1/workspaces/${wsId()}/hr/employees/${employeeId}/onboarding/${itemId}`, { done });

const HrService = {
  getEmployees,
  getMyEmployeeRecord,
  getEmployee,
  createEmployee,
  updateEmployee,
  removeEmployee,
  getLeaveRequests,
  createLeaveRequest,
  reviewLeaveRequest,
  cancelLeaveRequest,
  getLeaveBalance,
  getOnboardingTemplates,
  createOnboardingTemplate,
  updateOnboardingTemplate,
  removeOnboardingTemplate,
  applyOnboardingTemplate,
  toggleChecklistItem,
};

export default HrService;

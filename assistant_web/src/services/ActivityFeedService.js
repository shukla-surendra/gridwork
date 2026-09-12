import http from "../http-common";

// Workspace-wide activity audit log (Activity model) -- distinct from the
// CRM-only contact/deal activities in slices/crm/activitiesSlice.js.
const getAll = (workspaceId, { entityType, limit = 50 } = {}) => {
  const params = new URLSearchParams();
  if (entityType) params.set('entity_type', entityType);
  if (limit) params.set('limit', limit);
  const qs = params.toString();
  return http.get(`/api/v1/workspaces/${workspaceId}/activities/${qs ? `?${qs}` : ''}`);
};

const ActivityFeedService = { getAll };

export default ActivityFeedService;

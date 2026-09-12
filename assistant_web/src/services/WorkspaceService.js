// src/services/WorkspaceService.js
import http from "../http-common";

const getAll = () => http.get("/api/v1/workspaces/member-workspaces");
const getOwn = () => http.get("/api/v1/workspaces");
const update = (workspaceId, data) => http.put(`/api/v1/workspaces/workspace/${workspaceId}`, data);

const WorkspaceService = {
  getAll,
  getOwn,
  update
};

export default WorkspaceService;
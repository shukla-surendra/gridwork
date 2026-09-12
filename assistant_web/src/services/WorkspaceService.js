// src/services/WorkspaceService.js
import http from "../http-common";

const getAll = () => http.get("/api/v1/workspaces/member-workspaces");
const getOwn = () => http.get("/api/v1/workspaces");
const create = (data) => http.post("/api/v1/workspaces/", data);
const update = (workspaceId, data) => http.put(`/api/v1/workspaces/workspace/${workspaceId}`, data);

const WorkspaceService = {
  getAll,
  getOwn,
  create,
  update
};

export default WorkspaceService;
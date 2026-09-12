import http from "../http-common";
import ConfigService from "../utils/config";

const base = (boardId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return `/api/v1/workspaces/${workspace_id}/boards/${boardId}/sprints`;
};

const getAll = (boardId) => http.get(`${base(boardId)}/`);
const create = (boardId, data) => http.post(`${base(boardId)}/`, data);
const update = (boardId, sprintId, data) => http.put(`${base(boardId)}/${sprintId}`, data);
const remove = (boardId, sprintId) => http.delete(`${base(boardId)}/${sprintId}`);
const start = (boardId, sprintId) => http.post(`${base(boardId)}/${sprintId}/start`);
const complete = (boardId, sprintId) => http.post(`${base(boardId)}/${sprintId}/complete`);

const SprintService = { getAll, create, update, remove, start, complete };

export default SprintService;

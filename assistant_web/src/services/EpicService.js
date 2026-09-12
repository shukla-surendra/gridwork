import http from "../http-common";
import ConfigService from "../utils/config";

const base = (boardId) => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return `/api/v1/workspaces/${workspace_id}/boards/${boardId}/epics`;
};

const getAll = (boardId) => http.get(`${base(boardId)}/`);
const create = (boardId, data) => http.post(`${base(boardId)}/`, data);
const update = (boardId, epicId, data) => http.put(`${base(boardId)}/${epicId}`, data);
const remove = (boardId, epicId) => http.delete(`${base(boardId)}/${epicId}`);

const EpicService = { getAll, create, update, remove };

export default EpicService;

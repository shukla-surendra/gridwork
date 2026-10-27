import http from "../http-common";

const base = (workspaceId) => `/api/v1/workspaces/${workspaceId}/comments`;

const createComment = (workspaceId, data) => http.post(`${base(workspaceId)}/`, data);

// order: "newest" (default) or "oldest"
const listComments = (workspaceId, taskId, order = "newest") =>
  http.get(`${base(workspaceId)}/tasks/${taskId}`, { params: { order } });

const updateComment = (workspaceId, commentId, content) =>
  http.put(`${base(workspaceId)}/${commentId}`, { content });

const deleteComment = (workspaceId, commentId) => http.delete(`${base(workspaceId)}/${commentId}`);

const CommentService = {
  createComment,
  listComments,
  updateComment,
  deleteComment,
};

export default CommentService;

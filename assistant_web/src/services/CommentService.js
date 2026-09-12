import http from "../http-common";

const createComment = (workspaceId, data) => {
  return http.post(`/api/v1/workspaces/${workspaceId}/comments/`, data);
};

const listComments = (workspaceId, taskId) => {
  return http.get(`/api/v1/workspaces/${workspaceId}/comments/tasks/${taskId}`);
};

const CommentService = {
  createComment,
  listComments
};

export default CommentService; 
import http from "../http-common";

const login = data => {
  return http.post("/api/v1/users/login", data);
};

const signup = data => {
  return http.post("/api/v1/users/signup", data);
};

const me = data => {
  return http.get("/api/v1/users/me");
};

const update = (userId, data) => {
  return http.put(`/api/v1/users/${userId}`, data);
};

const remove = (userId) => {
  return http.delete(`/api/v1/users/${userId}`);
};

const uploadAvatar = (userId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  // Explicitly undefined, not "multipart/form-data" -- this axios instance's
  // default Content-Type is application/json (http-common.js), and axios
  // sends whatever Content-Type header is present verbatim (no boundary
  // auto-added). undefined is the one value axios's header merge drops
  // entirely, which is what lets the browser set its own Content-Type with
  // the multipart boundary when it sees the body is a FormData.
  return http.post(`/api/v1/users/${userId}/avatar`, formData, {
    headers: { "Content-Type": undefined },
  });
};

const UserService = {
  login, signup, me, update, remove, uploadAvatar
};

export default UserService;
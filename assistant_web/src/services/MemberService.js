import http from "../http-common";

const getMembers = async (workspaceId) => {
  try {
    const response = await http.get(`/api/v1/workspaces/${workspaceId}/members`);
    return response;
  } catch (error) {
    throw error;
  }
};

const addMember = async (workspaceId, ownerId, email, role = "member") => {
  try {
    const response = await http.post(`/api/v1/workspaces/${workspaceId}/invite`, {
      workspace_id: workspaceId,
      owner_id: ownerId,
      email: email,
      role: role
    });
    return response;
  } catch (error) {
    throw error;
  }
};

const removeMember = async (workspaceId, userId) => {
  try {
    const response = await http.delete(`/api/v1/workspaces/${workspaceId}/users/${userId}`);
    return response;
  } catch (error) {
    throw error;
  }
};

const updateMemberRole = async (workspaceId, userId, role) => {
  try {
    const response = await http.put(`/api/v1/workspaces/${workspaceId}/users/${userId}/role`, { role });
    return response;
  } catch (error) {
    throw error;
  }
};

const MemberService = {
  getMembers,
  addMember,
  removeMember,
  updateMemberRole
};

export default MemberService; 
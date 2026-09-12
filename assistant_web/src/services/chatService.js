import http from '../http-common';

// Real backend routes are workspace-scoped: /api/v1/workspaces/{workspaceId}/chats/...
// (this used to call /api/v1/chat/... via a separate axios client hardcoded to
// http://localhost:8000, which 404'd every request and would have broken again
// over LAN/anywhere but localhost even once the paths were fixed).

export const getChats = async (workspaceId) => {
    const response = await http.get(`/api/v1/workspaces/${workspaceId}/chats/`);
    return response.data;
};

export const createChat = async (workspaceId, chatData) => {
    const response = await http.post(`/api/v1/workspaces/${workspaceId}/chats/`, chatData);
    return response.data;
};

export const getMessages = async (workspaceId, chatId) => {
    const response = await http.get(`/api/v1/workspaces/${workspaceId}/chats/${chatId}/messages`);
    return response.data;
};

export const createMessage = async (workspaceId, chatId, messageData) => {
    const response = await http.post(`/api/v1/workspaces/${workspaceId}/chats/${chatId}/messages`, messageData);
    return response.data;
};

export const createCompletion = async (workspaceId, chatId) => {
    // No body needed -- the backend replies using the chat's persisted history,
    // so call createMessage() with the new user turn first.
    const response = await http.post(`/api/v1/workspaces/${workspaceId}/chats/${chatId}/completion`);
    return response.data;
};

export const updateChat = async (workspaceId, chatId, chatData) => {
    const response = await http.put(`/api/v1/workspaces/${workspaceId}/chats/${chatId}`, chatData);
    return response.data;
};

export const deleteChat = async (workspaceId, chatId) => {
    const response = await http.delete(`/api/v1/workspaces/${workspaceId}/chats/${chatId}`);
    return response.data;
};

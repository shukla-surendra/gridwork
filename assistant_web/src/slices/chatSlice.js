import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as chatService from '../services/chatService';
import ConfigService from '../utils/config';

// Async thunks
export const fetchChats = createAsyncThunk(
    'chat/fetchChats',
    async (_, { rejectWithValue }) => {
        try {
            const workspace = ConfigService.getDefaultWorkspace();
            if (!workspace) {
                throw new Error('No workspace selected');
            }
            const response = await chatService.getChats(workspace.workspace_id);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.detail || error.message);
        }
    }
);

export const createChat = createAsyncThunk(
    'chat/createChat',
    async (chatData, { rejectWithValue }) => {
        try {
            const workspace = ConfigService.getDefaultWorkspace();
            if (!workspace) {
                throw new Error('No workspace selected');
            }
            const response = await chatService.createChat(workspace.workspace_id, chatData);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.detail || error.message);
        }
    }
);

export const fetchMessages = createAsyncThunk(
    'chat/fetchMessages',
    async (chatId, { rejectWithValue }) => {
        try {
            const workspace = ConfigService.getDefaultWorkspace();
            if (!workspace) {
                throw new Error('No workspace selected');
            }
            const response = await chatService.getMessages(workspace.workspace_id, chatId);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.detail || error.message);
        }
    }
);

export const sendMessage = createAsyncThunk(
    'chat/sendMessage',
    async ({ chatId, messageData }, { rejectWithValue }) => {
        try {
            const workspace = ConfigService.getDefaultWorkspace();
            if (!workspace) {
                throw new Error('No workspace selected');
            }
            const response = await chatService.createMessage(workspace.workspace_id, chatId, messageData);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.detail || error.message);
        }
    }
);

export const getAICompletion = createAsyncThunk(
    'chat/getAICompletion',
    async ({ chatId }, { rejectWithValue }) => {
        try {
            const workspace = ConfigService.getDefaultWorkspace();
            if (!workspace) {
                throw new Error('No workspace selected');
            }
            // No completionData needed -- the backend replies from the chat's
            // persisted history, which already includes the turn sendMessage()
            // just saved.
            const response = await chatService.createCompletion(workspace.workspace_id, chatId);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.detail || error.message);
        }
    }
);

const initialState = {
    chats: [],
    currentChat: null,
    messages: [],
    loading: false,
    error: null
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setCurrentChat: (state, action) => {
            state.currentChat = action.payload;
        },
        clearChatState: (state) => {
            state.chats = [];
            state.currentChat = null;
            state.messages = [];
            state.loading = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Chats
            .addCase(fetchChats.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchChats.fulfilled, (state, action) => {
                state.loading = false;
                state.chats = action.payload;
                state.error = null;
            })
            .addCase(fetchChats.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Create Chat
            .addCase(createChat.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createChat.fulfilled, (state, action) => {
                state.loading = false;
                state.chats.unshift(action.payload);
                state.error = null;
            })
            .addCase(createChat.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Fetch Messages
            .addCase(fetchMessages.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMessages.fulfilled, (state, action) => {
                state.loading = false;
                state.messages = action.payload;
                state.error = null;
            })
            .addCase(fetchMessages.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Send Message
            .addCase(sendMessage.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(sendMessage.fulfilled, (state, action) => {
                state.loading = false;
                state.messages.push(action.payload);
                state.error = null;
            })
            .addCase(sendMessage.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Get AI Completion
            .addCase(getAICompletion.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getAICompletion.fulfilled, (state, action) => {
                state.loading = false;
                state.messages.push(action.payload);
                state.error = null;
            })
            .addCase(getAICompletion.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export const { setCurrentChat, clearChatState } = chatSlice.actions;
export default chatSlice.reducer; 
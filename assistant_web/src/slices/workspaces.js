// src/slices/workspaces.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import WorkspaceService from "../services/WorkspaceService";

const initialState = {
  workspaces: [],
  selectedWorkspace: null,
  loading: false,
  error: null
};

export const fetchWorkspaces = createAsyncThunk(
  "workspaces/fetch",
  async () => {
    const [memberRes, ownRes] = await Promise.all([
      WorkspaceService.getAll(),
      WorkspaceService.getOwn()
    ]);
    // Combine and deduplicate by workspace_id
    const all = [...memberRes.data, ...ownRes.data];
    const unique = Array.from(new Map(all.map(ws => [ws.workspace_id, ws])).values());
    return unique;
  }
);

export const createWorkspace = createAsyncThunk(
  "workspaces/create",
  async (workspaceData) => {
    const response = await WorkspaceService.create(workspaceData);
    return response.data;
  }
);

export const updateWorkspace = createAsyncThunk(
  "workspaces/update",
  async ({ id, ...workspaceData }) => {
    const response = await WorkspaceService.update(id, workspaceData);
    return response.data;
  }
);

export const deleteWorkspace = createAsyncThunk(
  "workspaces/delete",
  async (workspaceId) => {
    await WorkspaceService.delete(workspaceId);
    return workspaceId;
  }
);

const workspaceSlice = createSlice({
  name: "workspaces",
  initialState,
  reducers: {
    selectWorkspace: (state, action) => {
      state.selectedWorkspace = action.payload;
    },
    clearSelectedWorkspace: (state) => {
      state.selectedWorkspace = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch workspaces
      .addCase(fetchWorkspaces.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.loading = false;
        state.workspaces = action.payload;
        // If no workspace is selected and we have workspaces, select the first one
        if (!state.selectedWorkspace && action.payload.length > 0) {
          state.selectedWorkspace = action.payload[0];
        }
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Create workspace
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.workspaces.push(action.payload);
      })
      // Update workspace
      .addCase(updateWorkspace.fulfilled, (state, action) => {
        const index = state.workspaces.findIndex(ws => ws.workspace_id === action.payload.workspace_id);
        if (index !== -1) {
          state.workspaces[index] = action.payload;
          // Update selected workspace if it was the one being updated
          if (state.selectedWorkspace?.workspace_id === action.payload.workspace_id) {
            state.selectedWorkspace = action.payload;
          }
        }
      })
      // Delete workspace
      .addCase(deleteWorkspace.fulfilled, (state, action) => {
        state.workspaces = state.workspaces.filter(ws => ws.workspace_id !== action.payload);
        // Clear selected workspace if it was the one being deleted
        if (state.selectedWorkspace?.workspace_id === action.payload) {
          state.selectedWorkspace = null;
        }
      });
  }
});

export const { selectWorkspace, clearSelectedWorkspace } = workspaceSlice.actions;
export default workspaceSlice.reducer;
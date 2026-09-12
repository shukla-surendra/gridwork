import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import ActivityFeedService from "../services/ActivityFeedService";

export const fetchWorkspaceActivity = createAsyncThunk(
  "workspaceActivity/fetch",
  async (workspaceId) => {
    const res = await ActivityFeedService.getAll(workspaceId, { limit: 50 });
    return res.data;
  }
);

const workspaceActivitySlice = createSlice({
  name: "workspaceActivity",
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspaceActivity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaceActivity.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchWorkspaceActivity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default workspaceActivitySlice.reducer;

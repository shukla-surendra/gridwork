import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import SprintService from "../services/SprintService";

const initialState = {
  sprints: [],
  loading: false,
  error: null,
};

export const fetchSprints = createAsyncThunk(
  "sprints/fetch",
  async (boardId, { rejectWithValue }) => {
    try {
      const response = await SprintService.getAll(boardId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to load sprints");
    }
  }
);

export const createSprint = createAsyncThunk(
  "sprints/create",
  async ({ boardId, data }, { rejectWithValue }) => {
    try {
      const response = await SprintService.create(boardId, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to create sprint");
    }
  }
);

export const updateSprint = createAsyncThunk(
  "sprints/update",
  async ({ boardId, sprintId, data }, { rejectWithValue }) => {
    try {
      const response = await SprintService.update(boardId, sprintId, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to update sprint");
    }
  }
);

export const deleteSprint = createAsyncThunk(
  "sprints/delete",
  async ({ boardId, sprintId }, { rejectWithValue }) => {
    try {
      await SprintService.remove(boardId, sprintId);
      return sprintId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to delete sprint");
    }
  }
);

export const startSprint = createAsyncThunk(
  "sprints/start",
  async ({ boardId, sprintId }, { rejectWithValue }) => {
    try {
      const response = await SprintService.start(boardId, sprintId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to start sprint");
    }
  }
);

export const completeSprint = createAsyncThunk(
  "sprints/complete",
  async ({ boardId, sprintId }, { rejectWithValue }) => {
    try {
      const response = await SprintService.complete(boardId, sprintId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to complete sprint");
    }
  }
);

const sprintsSlice = createSlice({
  name: "sprints",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    const upsert = (state, action) => {
      const index = state.sprints.findIndex(s => s.sprint_id === action.payload.sprint_id);
      if (index !== -1) state.sprints[index] = action.payload;
    };
    builder
      .addCase(fetchSprints.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSprints.fulfilled, (state, action) => {
        state.loading = false;
        state.sprints = action.payload;
      })
      .addCase(fetchSprints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createSprint.fulfilled, (state, action) => {
        state.sprints.push(action.payload);
      })
      .addCase(updateSprint.fulfilled, upsert)
      .addCase(startSprint.fulfilled, upsert)
      .addCase(completeSprint.fulfilled, upsert)
      .addCase(deleteSprint.fulfilled, (state, action) => {
        state.sprints = state.sprints.filter(s => s.sprint_id !== action.payload);
      });
  }
});

export default sprintsSlice.reducer;

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import EpicService from "../services/EpicService";

const initialState = {
  epics: [],
  loading: false,
  error: null,
};

export const fetchEpics = createAsyncThunk(
  "epics/fetch",
  async (boardId, { rejectWithValue }) => {
    try {
      const response = await EpicService.getAll(boardId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to load epics");
    }
  }
);

export const createEpic = createAsyncThunk(
  "epics/create",
  async ({ boardId, data }, { rejectWithValue }) => {
    try {
      const response = await EpicService.create(boardId, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to create epic");
    }
  }
);

export const updateEpic = createAsyncThunk(
  "epics/update",
  async ({ boardId, epicId, data }, { rejectWithValue }) => {
    try {
      const response = await EpicService.update(boardId, epicId, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to update epic");
    }
  }
);

export const deleteEpic = createAsyncThunk(
  "epics/delete",
  async ({ boardId, epicId }, { rejectWithValue }) => {
    try {
      await EpicService.remove(boardId, epicId);
      return epicId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to delete epic");
    }
  }
);

const epicsSlice = createSlice({
  name: "epics",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEpics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEpics.fulfilled, (state, action) => {
        state.loading = false;
        state.epics = action.payload;
      })
      .addCase(fetchEpics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createEpic.fulfilled, (state, action) => {
        state.epics.push(action.payload);
      })
      .addCase(updateEpic.fulfilled, (state, action) => {
        const index = state.epics.findIndex(e => e.epic_id === action.payload.epic_id);
        if (index !== -1) state.epics[index] = action.payload;
      })
      .addCase(deleteEpic.fulfilled, (state, action) => {
        state.epics = state.epics.filter(e => e.epic_id !== action.payload);
      });
  }
});

export default epicsSlice.reducer;

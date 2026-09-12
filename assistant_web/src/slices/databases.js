import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import DatabaseService from "../services/DatabaseService";

const initialState = {
  databases: [],
  loading: false,
  error: null,
};

export const fetchDatabases = createAsyncThunk(
  "databases/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await DatabaseService.getAll();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to load databases");
    }
  }
);

export const createDatabase = createAsyncThunk(
  "databases/create",
  async (data, { rejectWithValue }) => {
    try {
      const response = await DatabaseService.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to create database");
    }
  }
);

export const updateDatabase = createAsyncThunk(
  "databases/update",
  async ({ databaseId, data }, { rejectWithValue }) => {
    try {
      const response = await DatabaseService.update(databaseId, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to update database");
    }
  }
);

export const deleteDatabase = createAsyncThunk(
  "databases/delete",
  async (databaseId, { rejectWithValue }) => {
    try {
      await DatabaseService.remove(databaseId);
      return databaseId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to delete database");
    }
  }
);

const databasesSlice = createSlice({
  name: "databases",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDatabases.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDatabases.fulfilled, (state, action) => {
        state.loading = false;
        state.databases = action.payload;
      })
      .addCase(fetchDatabases.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createDatabase.fulfilled, (state, action) => {
        state.databases.push(action.payload);
      })
      .addCase(updateDatabase.fulfilled, (state, action) => {
        const index = state.databases.findIndex(d => d.database_id === action.payload.database_id);
        if (index !== -1) state.databases[index] = action.payload;
      })
      .addCase(deleteDatabase.fulfilled, (state, action) => {
        state.databases = state.databases.filter(d => d.database_id !== action.payload);
      });
  }
});

export default databasesSlice.reducer;

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import ReminderService from "../services/ReminderService";

const initialState = {
  reminders: [],
  loading: false,
  error: null,
};

export const fetchReminders = createAsyncThunk(
  "reminders/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await ReminderService.getAll();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to load reminders");
    }
  }
);

export const createReminder = createAsyncThunk(
  "reminders/create",
  async (data, { rejectWithValue }) => {
    try {
      const response = await ReminderService.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to create reminder");
    }
  }
);

export const updateReminder = createAsyncThunk(
  "reminders/update",
  async ({ reminderId, data }, { rejectWithValue }) => {
    try {
      const response = await ReminderService.update(reminderId, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to update reminder");
    }
  }
);

export const deleteReminder = createAsyncThunk(
  "reminders/delete",
  async (reminderId, { rejectWithValue }) => {
    try {
      await ReminderService.remove(reminderId);
      return reminderId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to delete reminder");
    }
  }
);

const remindersSlice = createSlice({
  name: "reminders",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReminders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReminders.fulfilled, (state, action) => {
        state.loading = false;
        state.reminders = action.payload;
      })
      .addCase(fetchReminders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createReminder.fulfilled, (state, action) => {
        state.reminders.push(action.payload);
        state.reminders.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
      })
      .addCase(updateReminder.fulfilled, (state, action) => {
        const index = state.reminders.findIndex(r => r.reminder_id === action.payload.reminder_id);
        if (index !== -1) state.reminders[index] = action.payload;
      })
      .addCase(deleteReminder.fulfilled, (state, action) => {
        state.reminders = state.reminders.filter(r => r.reminder_id !== action.payload);
      });
  }
});

export default remindersSlice.reducer;

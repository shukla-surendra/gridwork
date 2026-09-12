import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import SettingsService from "../services/settingsservice";

const initialState = {
  settings: {
    email_notifications: true,
    task_reminders: true,
    weekly_digest: false,
    language: 'en',
    timezone: 'UTC',
    theme: 'light',
  }
};

export const retrieveSettings = createAsyncThunk(
  "settings/retrieve",
  async () => {
    const res = await SettingsService.get();
    return res.data;
  }
);

export const updateSettings = createAsyncThunk(
  "settings/update",
  async (data) => {
    const res = await SettingsService.update(data);
    return res.data;
  }
);

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  extraReducers: {
    [retrieveSettings.fulfilled]: (state, action) => {
      state.settings = action.payload;
    },
    [updateSettings.fulfilled]: (state, action) => {
      state.settings = {
        ...state.settings,
        ...action.payload,
      };
    },
  },
});

const { reducer } = settingsSlice;
export default reducer; 
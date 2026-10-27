import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import SettingsService from "../services/settingsservice";

// null until the real row loads -- it carries the settings_id every update needs.
const initialState = {
  settings: null,
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
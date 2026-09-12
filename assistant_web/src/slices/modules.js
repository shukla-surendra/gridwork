import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import ModuleService from "../services/ModuleService";

export const fetchModules = createAsyncThunk(
  "modules/fetch",
  async () => {
    const res = await ModuleService.getAll();
    return res.data; // [{key, name, description, icon, enabled}]
  }
);

const modulesSlice = createSlice({
  name: "modules",
  initialState: { items: [], byKey: {}, loaded: false },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchModules.fulfilled, (state, action) => {
      state.items = action.payload;
      state.byKey = Object.fromEntries(action.payload.map(m => [m.key, m.enabled]));
      state.loaded = true;
    });
  },
});

// Default-on until the fetch above actually confirms a module was
// switched off, matching Navbar's original "no flash of missing nav
// items while the request is in flight" behavior -- callers should treat
// `false` as "known disabled" and anything else as "assume enabled".
export const selectIsModuleEnabled = (state, key) => state.modules.byKey[key] !== false;

export default modulesSlice.reducer;

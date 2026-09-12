import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import PageService from "../services/PageService";

const initialState = {
  pages: [],
  loading: false,
  error: null,
};

export const fetchPages = createAsyncThunk(
  "pages/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await PageService.getAll();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to load pages");
    }
  }
);

export const createPage = createAsyncThunk(
  "pages/create",
  async (data, { rejectWithValue }) => {
    try {
      const response = await PageService.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to create page");
    }
  }
);

export const updatePage = createAsyncThunk(
  "pages/update",
  async ({ pageId, data }, { rejectWithValue }) => {
    try {
      const response = await PageService.update(pageId, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to update page");
    }
  }
);

export const deletePage = createAsyncThunk(
  "pages/delete",
  async (pageId, { rejectWithValue }) => {
    try {
      await PageService.remove(pageId);
      return pageId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to delete page");
    }
  }
);

const pagesSlice = createSlice({
  name: "pages",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPages.fulfilled, (state, action) => {
        state.loading = false;
        state.pages = action.payload;
      })
      .addCase(fetchPages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createPage.fulfilled, (state, action) => {
        state.pages.push(action.payload);
      })
      .addCase(updatePage.fulfilled, (state, action) => {
        const index = state.pages.findIndex(p => p.page_id === action.payload.page_id);
        if (index !== -1) state.pages[index] = action.payload;
      })
      .addCase(deletePage.fulfilled, (state, action) => {
        state.pages = state.pages.filter(p => p.page_id !== action.payload);
      });
  }
});

export default pagesSlice.reducer;

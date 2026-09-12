import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import ReportsService from "../services/reportsservice";

const initialState = {
  summary: null,
  loading: false,
  error: null,
};

export const fetchReportsSummary = createAsyncThunk(
  "reports/fetchSummary",
  async (_, { rejectWithValue }) => {
    try {
      const res = await ReportsService.getSummary();
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message);
    }
  }
);

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportsSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReportsSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(fetchReportsSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default reportsSlice.reducer;

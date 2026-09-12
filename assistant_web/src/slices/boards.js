import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import BoardService from "../services/BoardService";

const initialState = {
  boards: [],
  loading: false,
  error: null,
};

export const fetchBoards = createAsyncThunk(
  "boards/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await BoardService.getAll();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to load boards");
    }
  }
);

export const createBoard = createAsyncThunk(
  "boards/create",
  async (data, { rejectWithValue }) => {
    try {
      const response = await BoardService.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to create board");
    }
  }
);

export const updateBoard = createAsyncThunk(
  "boards/update",
  async ({ boardId, data }, { rejectWithValue }) => {
    try {
      const response = await BoardService.update(boardId, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to update board");
    }
  }
);

export const deleteBoard = createAsyncThunk(
  "boards/delete",
  async (boardId, { rejectWithValue }) => {
    try {
      await BoardService.remove(boardId);
      return boardId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to delete board");
    }
  }
);

const boardsSlice = createSlice({
  name: "boards",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBoards.fulfilled, (state, action) => {
        state.loading = false;
        state.boards = action.payload;
      })
      .addCase(fetchBoards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createBoard.fulfilled, (state, action) => {
        state.boards.push(action.payload);
      })
      .addCase(updateBoard.fulfilled, (state, action) => {
        const index = state.boards.findIndex(b => b.board_id === action.payload.board_id);
        if (index !== -1) state.boards[index] = action.payload;
      })
      .addCase(deleteBoard.fulfilled, (state, action) => {
        state.boards = state.boards.filter(b => b.board_id !== action.payload);
      });
  }
});

export default boardsSlice.reducer;

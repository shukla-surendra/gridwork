import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import TaskService from "../services/taskservice";

const initialState = { 'notes':[], 'tasks': []};

export const createTask = createAsyncThunk(
  "tasks/create",
  async ({ title, description, priority, due_date, task_type, workspace_id, user_id }) => {
    const res = await TaskService.create({ title, description, priority, due_date, task_type, workspace_id, user_id });
    return res.data;
  }
);

export const createNotes = createAsyncThunk(
  "tasks/create",
  async ({ title, description, priority, task_type, due_date, workspace_id, user_id }) => {
    const res = await TaskService.create({ title, description, priority, task_type, due_date, workspace_id, user_id });
    return res.data;
  }
);

export const createGeneralTask = createAsyncThunk(
  "tasks/create",
  async (acceptable_task_body) => {
    const res = await TaskService.create(acceptable_task_body);
    return res.data;
  }
);

export const retrieveTasks = createAsyncThunk(
  "tasks/retrieve",
  async () => {
    const res = await TaskService.getAll();
    console.log("fetched data for tasks", res.data)
    return res.data;
  }
);

export const retrieveNotes = createAsyncThunk(
  "notes/retrieve",
  async () => {
    const res = await TaskService.getAllNotes();
    return res.data;
  }
);

export const updateTask = createAsyncThunk(
  "tasks/update",
  async ({ task_id, data }) => {
    
    const res = await TaskService.update(task_id, data);
    return res.data;
  }
);

export const deleteTask = createAsyncThunk(
  "tasks/delete",
  async ({ task_id }) => {
    const res = await TaskService.remove(task_id);
    return { task_id };
  }
);

export const deleteNotes = createAsyncThunk(
  "notes/delete",
  async ({ task_id }) => {
    await TaskService.remove(task_id);
    return { task_id };
  }
);


const taskSlice = createSlice({
  name: "task",
  initialState,
  extraReducers: {
    [createTask.fulfilled]: (state, action) => {
      state.tasks.push(action.payload);
    },
    [createNotes.fulfilled]: (state, action) => {
      state.notes.push(action.payload);
    },
    [retrieveTasks.fulfilled]: (state, action) => {
      state.tasks = [...action.payload];
    },
    [retrieveNotes.fulfilled]: (state, action) => {
      state.notes = [...action.payload];
    },
    [updateTask.fulfilled]: (state, action) => {
      const index = state.notes.findIndex(note => note.task_id === action.payload.task_id);
      if (index !== -1) {
        state.notes[index] = {
          ...state.notes[index],
          ...action.payload,
        };
      }
    },
    [deleteTask.fulfilled]: (state, action) => {
      const index = state.tasks.findIndex(task => task.task_id === action.payload.task_id);
      if (index !== -1) {
        state.tasks.splice(index, 1);
      }
    },
    [deleteTask.rejected]: (state, action) => {
      console.error('Failed to delete task:', action.error);
    }
  },
});

const { reducer } = taskSlice;
export default reducer;
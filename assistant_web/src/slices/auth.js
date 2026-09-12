import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import auth from '../utils/auth';
import ConfigService from '../utils/config';
import { BACKEND_URL } from '../http-common';
import UserService from '../services/userservice';

// Async thunk for login
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/users/login`, credentials);
      // Use auth service to handle login
      auth.login(response.data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

// "Try Demo": no email/password -- the backend mints a brand-new, fully
// seeded user + workspace and returns the exact same shape login() does,
// so this reuses auth.login() to actually get the visitor signed in.
export const tryDemo = createAsyncThunk(
  'auth/tryDemo',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/users/demo`);
      auth.login(response.data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Could not start a demo session');
    }
  }
);

// Profile edits (currently first_name/last_name -- see UserUpdateCommand on
// the backend, email/password aren't editable through this endpoint).
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      const response = await UserService.update(userId, data);
      const merged = auth.updateProfile(response.data);
      return merged;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update profile');
    }
  }
);

export const uploadAvatar = createAsyncThunk(
  'auth/uploadAvatar',
  async ({ userId, file }, { rejectWithValue }) => {
    try {
      const response = await UserService.uploadAvatar(userId, file);
      const merged = auth.updateProfile(response.data);
      return merged;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to upload avatar');
    }
  }
);

const initialState = {
  user: auth.getProfile(),
  token: auth.getToken(),
  isAuthenticated: auth.loggedIn(),
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      auth.logout();
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Try Demo cases -- same shape as login, since it IS a login once
      // the backend hands back a token
      .addCase(tryDemo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(tryDemo.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
      })
      .addCase(tryDemo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update profile cases
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Upload avatar cases
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.error = action.payload;
      });
  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer; 
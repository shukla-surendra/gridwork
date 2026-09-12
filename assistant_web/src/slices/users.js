import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import UserService from "../services/userservice";
import { login } from './auth';

const initialState = {me: {first_name:"", last_name: "", email:""}, login_payload:{}};

export const userLogin = createAsyncThunk(
  "users/login",
  async ({ email, password }) => {
    const res = await UserService.login({ email, password });
    return res.data;
  }
);

export const signupUser = createAsyncThunk(
  "user/signup",
  async ({ first_name, last_name, email, password }, { rejectWithValue }) => {
    try {
      const res = await UserService.signup({ first_name, last_name, email, password });
      // Store token in localStorage
      localStorage.setItem('token', res.data.token);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Signup failed');
    }
  }
);

export const retrieveMe = createAsyncThunk(
  "user/me",
  async () => {
    const res = await UserService.me();
    return res.data;
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  extraReducers: {
    [userLogin.fulfilled]: (state, action) => {
      state.login_payload = action.payload;
    },
    [retrieveMe.fulfilled]: (state, action) => {
      state.me = action.payload;
    },
  },
});

const { reducer } = userSlice;
export default reducer;
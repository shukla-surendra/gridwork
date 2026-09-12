import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import NotificationService from "../services/notificationservice";

const initialState = {
  notifications: [],
  loading: false,
  error: null,
};

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await NotificationService.getAll();
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message);
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async (notificationId, { rejectWithValue }) => {
    try {
      const res = await NotificationService.update(notificationId, { is_read: true });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message);
    }
  }
);

export const deleteNotification = createAsyncThunk(
  "notifications/delete",
  async (notificationId, { rejectWithValue }) => {
    try {
      await NotificationService.remove(notificationId);
      return notificationId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message);
    }
  }
);

// Individual PUT calls, not a dedicated bulk endpoint -- kept the backend
// change scoped to what was actually broken (create/read/serialization),
// not a new bulk-update route nothing else needs yet.
export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllRead",
  async (_, { getState, dispatch }) => {
    const { notifications } = getState().notifications;
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => dispatch(markNotificationRead(n.notification_id))));
    return true;
  }
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const idx = state.notifications.findIndex((n) => n.notification_id === action.payload.notification_id);
        if (idx !== -1) state.notifications[idx] = action.payload;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.notifications = state.notifications.filter((n) => n.notification_id !== action.payload);
      });
  },
});

export default notificationsSlice.reducer;

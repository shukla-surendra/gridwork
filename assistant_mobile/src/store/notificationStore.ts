import { create } from 'zustand';
import { Notification, getNotifications, markNotificationRead, deleteNotification } from '../services/notificationService';

interface NotificationStore {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  fetchNotifications: (workspaceId: string) => Promise<void>;
  markAsRead: (workspaceId: string, notificationId: string) => Promise<void>;
  deleteNotification: (workspaceId: string, notificationId: string) => Promise<void>;
  clearError: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  isLoading: false,
  error: null,
  fetchNotifications: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      const notifications = await getNotifications(workspaceId);
      set({ notifications });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch notifications' });
    } finally {
      set({ isLoading: false });
    }
  },
  markAsRead: async (workspaceId, notificationId) => {
    try {
      await markNotificationRead(workspaceId, notificationId);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.notification_id === notificationId ? { ...n, read: true } : n
        ),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to mark as read' });
    }
  },
  deleteNotification: async (workspaceId, notificationId) => {
    try {
      await deleteNotification(workspaceId, notificationId);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.notification_id !== notificationId),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete notification' });
    }
  },
  clearError: () => set({ error: null }),
})); 
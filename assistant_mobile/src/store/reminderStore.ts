import { create } from 'zustand';
import { reminderService, Reminder } from '../services/reminderService';

interface ReminderState {
  reminders: Reminder[];
  isLoading: boolean;
  error: string | null;
  fetchReminders: () => Promise<void>;
  createReminder: (reminder: Partial<Reminder>) => Promise<void>;
  updateReminder: (id: string, reminder: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  isLoading: false,
  error: null,

  fetchReminders: async () => {
    set({ isLoading: true, error: null });
    try {
      const reminders = await reminderService.getReminders();
      set({ reminders, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createReminder: async (reminder) => {
    set({ isLoading: true, error: null });
    try {
      await reminderService.createReminder(reminder);
      await get().fetchReminders();
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateReminder: async (id, reminder) => {
    set({ isLoading: true, error: null });
    try {
      await reminderService.updateReminder(id, reminder);
      await get().fetchReminders();
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteReminder: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await reminderService.deleteReminder(id);
      await get().fetchReminders();
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
})); 
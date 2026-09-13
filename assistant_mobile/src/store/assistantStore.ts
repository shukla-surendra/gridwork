import { create } from 'zustand';
import { assistantService, UserSettings, AssistantResponse } from '../services/assistantService';

interface AssistantState {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  lastResponse: AssistantResponse | null;
  fetchSettings: () => Promise<void>;
  updateAssistantSettings: (settings: Partial<UserSettings['assistant_settings']>) => Promise<void>;
  updateThemeSettings: (settings: Partial<UserSettings['theme_settings']>) => Promise<void>;
  updatePrivacySettings: (settings: Partial<UserSettings['privacy_settings']>) => Promise<void>;
  updateWorkspaceSettings: (settings: Partial<UserSettings['workspace_settings']>) => Promise<void>;
  processCommand: (command: string) => Promise<void>;
  clearError: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  settings: null,
  isLoading: false,
  error: null,
  lastResponse: null,

  fetchSettings: async () => {
    try {
      set({ isLoading: true, error: null });
      const settings = await assistantService.getSettings();
      set({ settings, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateAssistantSettings: async (settings) => {
    try {
      set({ isLoading: true, error: null });
      const updatedSettings = await assistantService.updateAssistantSettings(settings);
      set({ settings: updatedSettings, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateThemeSettings: async (settings) => {
    try {
      set({ isLoading: true, error: null });
      const updatedSettings = await assistantService.updateThemeSettings(settings);
      set({ settings: updatedSettings, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updatePrivacySettings: async (settings) => {
    try {
      set({ isLoading: true, error: null });
      const updatedSettings = await assistantService.updatePrivacySettings(settings);
      set({ settings: updatedSettings, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateWorkspaceSettings: async (settings) => {
    try {
      set({ isLoading: true, error: null });
      const updatedSettings = await assistantService.updateWorkspaceSettings(settings);
      set({ settings: updatedSettings, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  processCommand: async (command) => {
    try {
      set({ isLoading: true, error: null });
      const response = await assistantService.processCommand(command);
      set({ lastResponse: response, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
})); 
import api from './api';
import Config from '../utils/config';

export interface AssistantCommand {
  command: string;
}

export interface AssistantResponse {
  message: string;
  data: any;
  requires_clarification?: boolean;
  questions?: string[];
}

export interface UserSettings {
  assistant_settings: {
    name: string;
    voice_enabled: boolean;
    voice_gender: string;
    language: string;
    timezone: string;
    notification_preferences: {
      email: boolean;
      push: boolean;
      desktop: boolean;
    };
  };
  theme_settings: {
    mode: string;
    primary_color: string;
    font_size: string;
  };
  privacy_settings: {
    data_collection: boolean;
    analytics: boolean;
    history_retention_days: number;
  };
  workspace_settings: {
    default_view: string;
    sort_by: string;
    group_by: string;
  };
}

class AssistantService {
  private static instance: AssistantService;

  private constructor() {}

  public static getInstance(): AssistantService {
    if (!AssistantService.instance) {
      AssistantService.instance = new AssistantService();
    }
    return AssistantService.instance;
  }

  private async getWorkspaceId(): Promise<string> {
    const workspace = await Config.getDefaultWorkspace();
    if (!workspace?.workspace_id) {
      throw new Error('No workspace selected');
    }
    return workspace.workspace_id;
  }

  // Real route is /api/v1/assistant/command with workspace_id in the body
  // (assistant_controller.py) -- the old baseUrl ('/assistant') was missing
  // the /api/v1 prefix, and workspace_id was never sent at all, so every
  // call 404'd/422'd before reaching the agent.
  async processCommand(command: string): Promise<AssistantResponse> {
    try {
      const workspaceId = await this.getWorkspaceId();
      const response = await api.post<AssistantResponse>('/api/v1/assistant/command', {
        command,
        workspace_id: workspaceId,
      });
      return response.data;
    } catch (error) {
      console.error('Error processing command:', error);
      throw error;
    }
  }

  // NOTE: these four settings methods are a known gap. The backend has no
  // per-category settings endpoints at all -- settings_controller.py
  // exposes a single per-workspace settings row (POST/GET to create/fetch
  // it, then PUT /{settings_id}, PUT /{settings_id}/preferences, PUT
  // /{settings_id}/notifications against that row's ID) with a totally
  // different shape than UserSettings below. Wiring these up properly means
  // fetching/caching the settings_id first and reshaping this interface,
  // which is out of scope for this pass -- left as stubs pointing at
  // nonexistent routes rather than silently pretending to work.
  async getSettings(): Promise<UserSettings> {
    try {
      const response = await api.get<UserSettings>('/settings');
      return response.data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  async updateAssistantSettings(settings: Partial<UserSettings['assistant_settings']>): Promise<UserSettings> {
    try {
      const response = await api.put<UserSettings>('/settings/assistant', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating assistant settings:', error);
      throw error;
    }
  }

  async updateThemeSettings(settings: Partial<UserSettings['theme_settings']>): Promise<UserSettings> {
    try {
      const response = await api.put<UserSettings>('/settings/theme', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating theme settings:', error);
      throw error;
    }
  }

  async updatePrivacySettings(settings: Partial<UserSettings['privacy_settings']>): Promise<UserSettings> {
    try {
      const response = await api.put<UserSettings>('/settings/privacy', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw error;
    }
  }

  async updateWorkspaceSettings(settings: Partial<UserSettings['workspace_settings']>): Promise<UserSettings> {
    try {
      const response = await api.put<UserSettings>('/settings/workspace', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating workspace settings:', error);
      throw error;
    }
  }
}

export const assistantService = AssistantService.getInstance(); 
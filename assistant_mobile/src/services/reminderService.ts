import api from './api';
import Config from '../utils/config';

export interface Reminder {
  id: string;
  message: string;
  remind_at: string;
  user_id: string;
}

class ReminderService {
  private static instance: ReminderService;

  private constructor() {}

  public static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService();
    }
    return ReminderService.instance;
  }

  private async getWorkspaceId(): Promise<string> {
    const workspace = await Config.getDefaultWorkspace();
    if (!workspace?.workspace_id) {
      throw new Error('No workspace selected');
    }
    return workspace.workspace_id;
  }

  // Real routes are workspace-scoped: /api/v1/workspaces/{workspace_id}/reminders
  // (reminder_controller.py) -- the old baseUrl ('/reminders') hit no
  // route at all. Resolved internally so callers (reminderStore.ts) don't
  // need to thread a workspaceId through.
  async getReminders(): Promise<Reminder[]> {
    const workspaceId = await this.getWorkspaceId();
    const response = await api.get<Reminder[]>(`/api/v1/workspaces/${workspaceId}/reminders`);
    return response.data;
  }

  async createReminder(reminder: Partial<Reminder>): Promise<Reminder> {
    const workspaceId = await this.getWorkspaceId();
    const response = await api.post<Reminder>(`/api/v1/workspaces/${workspaceId}/reminders`, reminder);
    return response.data;
  }

  async updateReminder(id: string, reminder: Partial<Reminder>): Promise<Reminder> {
    const workspaceId = await this.getWorkspaceId();
    const response = await api.put<Reminder>(`/api/v1/workspaces/${workspaceId}/reminders/${id}`, reminder);
    return response.data;
  }

  async deleteReminder(id: string): Promise<void> {
    const workspaceId = await this.getWorkspaceId();
    await api.delete(`/api/v1/workspaces/${workspaceId}/reminders/${id}`);
  }
}

export const reminderService = ReminderService.getInstance();

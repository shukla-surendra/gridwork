import api from './api';
import Config from '../utils/config';
import Auth from '../utils/auth';

// These field names must match TaskDto (task_dto.py) exactly -- this used
// to declare a fictional `id`/`due_date` shape that the backend never
// returns (the real fields are `task_id`/`due_on`), so every screen
// reading `.id` off a task got `undefined`: list keys collided and
// task-detail navigation silently failed to load anything.
export interface TaskComment {
    comment_id: string;
    task_id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at: string;
    user?: { user_id: string; first_name: string; last_name: string } | null;
}

export interface Task {
    task_id: string;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'done';
    priority: 'low' | 'medium' | 'high';
    due_on?: string;
    workspace_id: string;
    created_at: string;
    updated_at: string;
    comments?: TaskComment[];
    story_points?: number;
    labels?: string[];
    task_type?: 'TASK' | 'NOTE' | 'quick_note' | 'time_block';
}

interface CreateTaskData {
    title: string;
    description?: string;
    status?: 'todo' | 'in_progress' | 'done';
    priority?: 'low' | 'medium' | 'high';
    due_on?: string;
    story_points?: number;
    task_type?: 'TASK' | 'NOTE' | 'quick_note' | 'time_block';
    workspace_id?: string;
}

interface UpdateTaskData {
    title?: string;
    description?: string;
    status?: 'todo' | 'in_progress' | 'done';
    priority?: 'low' | 'medium' | 'high';
    due_on?: string;
    story_points?: number;
    task_type?: 'TASK' | 'NOTE' | 'quick_note' | 'time_block';
}

interface CreateCommentData {
    content: string;
}

class TaskService {
    private async getWorkspaceId(): Promise<string> {
        const workspace = await Config.getDefaultWorkspace();
        if (!workspace?.workspace_id) {
            throw new Error('No workspace selected');
        }
        return workspace.workspace_id;
    }

    async getAll(): Promise<Task[]> {
        try {
            const workspaceId = await this.getWorkspaceId();
            const response = await api.get(`/api/v1/workspaces/${workspaceId}/tasks`, {
                params: {
                    order: 'desc',
                    task_type: 'TASK',
                    skip: 0,
                    page_size: 50
                }
            });
            return response.data || [];
        } catch (error) {
            console.error('Error fetching tasks:', error);
            throw error;
        }
    }

    async getAllNotes(): Promise<Task[]> {
        try {
            const workspaceId = await this.getWorkspaceId();
            const response = await api.get(`/api/v1/workspaces/${workspaceId}/tasks`, {
                params: {
                    order: 'desc',
                    task_type: 'NOTE'
                }
            });
            return response.data || [];
        } catch (error) {
            console.error('Error fetching notes:', error);
            throw error;
        }
    }

    async getAllQuickNotes(): Promise<Task[]> {
        try {
            const workspaceId = await this.getWorkspaceId();
            const response = await api.get(`/api/v1/workspaces/${workspaceId}/tasks`, {
                params: {
                    order: 'desc',
                    task_type: 'quick_note'
                }
            });
            return response.data || [];
        } catch (error) {
            console.error('Error fetching quick notes:', error);
            throw error;
        }
    }

    async getAllTimeBlocks(): Promise<Task[]> {
        try {
            const workspaceId = await this.getWorkspaceId();
            const response = await api.get(`/api/v1/workspaces/${workspaceId}/tasks`, {
                params: {
                    order: 'desc',
                    task_type: 'time_block'
                }
            });
            return response.data || [];
        } catch (error) {
            console.error('Error fetching time blocks:', error);
            throw error;
        }
    }

    async get(taskId: string): Promise<Task> {
        try {
            const workspaceId = await this.getWorkspaceId();
            const response = await api.get(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching task:', error);
            throw error;
        }
    }

    async getPostBySlug(slug: string): Promise<Task> {
        try {
            const workspaceId = await this.getWorkspaceId();
            const response = await api.get(`/api/v1/workspaces/${workspaceId}/tasks/${slug}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching task by slug:', error);
            throw error;
        }
    }

    async create(data: CreateTaskData): Promise<Task> {
        try {
            const workspaceId = await this.getWorkspaceId();
            const response = await api.post(`/api/v1/workspaces/${workspaceId}/tasks`, {
                ...data,
                task_type: data.task_type || 'TASK',
                workspace_id: workspaceId
            });
            return response.data;
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    async update(taskId: string, data: UpdateTaskData): Promise<Task> {
        try {
            const workspaceId = await this.getWorkspaceId();
            const response = await api.put(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`, data);
            return response.data;
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    async delete(taskId: string): Promise<void> {
        try {
            const workspaceId = await this.getWorkspaceId();
            await api.delete(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`);
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    async deleteAll(): Promise<void> {
        try {
            const workspaceId = await this.getWorkspaceId();
            await api.delete(`/api/v1/workspaces/${workspaceId}/tasks`);
        } catch (error) {
            console.error('Error deleting all tasks:', error);
            throw error;
        }
    }

    async findByTitle(title: string): Promise<Task[]> {
        try {
            const workspaceId = await this.getWorkspaceId();
            const response = await api.get(`/api/v1/workspaces/${workspaceId}/tasks`, {
                params: { title }
            });
            return response.data || [];
        } catch (error) {
            console.error('Error finding tasks by title:', error);
            throw error;
        }
    }

    async addComment(taskId: string, data: CreateCommentData): Promise<TaskComment> {
        try {
            const workspaceId = await this.getWorkspaceId();
            // Comments are a top-level workspace resource, not nested under
            // tasks (comment_controller.py: POST /workspaces/{id}/comments/),
            // and CommentCommand requires user_id + content + task_id.
            const profile = await Auth.getProfile();
            if (!profile?.user_id) {
                throw new Error('Not authenticated');
            }
            const response = await api.post(`/api/v1/workspaces/${workspaceId}/comments/`, {
                workspace_id: workspaceId,
                content: data.content,
                user_id: profile.user_id,
                task_id: taskId,
            });
            return response.data;
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    }
}

const taskService = new TaskService();
export default taskService; 
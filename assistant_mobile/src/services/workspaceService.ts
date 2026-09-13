import api from './api';

interface Workspace {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

class WorkspaceService {
    async getMemberWorkspaces(): Promise<Workspace[]> {
        try {
            const response = await api.get('/api/v1/workspaces/member-workspaces');
            return response.data;
        } catch (error) {
            console.error('Error fetching member workspaces:', error);
            throw error;
        }
    }

    async getOwnWorkspaces(): Promise<Workspace[]> {
        try {
            const response = await api.get('/api/v1/workspaces');
            return response.data;
        } catch (error) {
            console.error('Error fetching own workspaces:', error);
            throw error;
        }
    }

    async createWorkspace(name: string, description?: string): Promise<Workspace> {
        try {
            const response = await api.post('/api/v1/workspaces/', { name, description });
            return response.data;
        } catch (error) {
            console.error('Error creating workspace:', error);
            throw error;
        }
    }

    async updateWorkspace(workspaceId: string, name: string, description?: string): Promise<Workspace> {
        try {
            // Real route is /workspace/{id} (workspace_controller.py) -- the
            // bare /{id} form doesn't exist and 404s.
            const response = await api.put(`/api/v1/workspaces/workspace/${workspaceId}`, { name, description });
            return response.data;
        } catch (error) {
            console.error('Error updating workspace:', error);
            throw error;
        }
    }

    // There is no DELETE /api/v1/workspaces/{id} route on the backend at
    // all (workspace_controller.py has no delete_workspace handler) -- this
    // used to silently 404 in production. Not calling it until the backend
    // actually supports workspace deletion.
}

export default new WorkspaceService(); 
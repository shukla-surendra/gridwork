import api from './api';

interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    default_workspace?: {
        workspace_id: string;
        name: string;
    };
}

interface LoginResponse {
    access_token: string;
    token_type: string;
    user: User;
}

interface LoginData {
    email: string;
    password: string;
}

interface RegisterData {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
}

class UserService {
    async login(data: LoginData): Promise<LoginResponse> {
        try {
            const response = await api.post<LoginResponse>('/api/v1/users/login', data);
            return response.data;
        } catch (error) {
            console.error('Error logging in:', error);
            throw error;
        }
    }

    async register(data: RegisterData): Promise<User> {
        try {
            const response = await api.post<User>('/api/v1/users/signup', data);
            return response.data;
        } catch (error) {
            console.error('Error registering user:', error);
            throw error;
        }
    }

    async getProfile(): Promise<User> {
        try {
            const response = await api.get<User>('/api/v1/users/profile');
            return response.data;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    }

    async updateProfile(data: Partial<User>): Promise<User> {
        try {
            const response = await api.put<User>('/api/v1/users/profile', data);
            return response.data;
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        try {
            await api.post('/api/v1/users/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
            });
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }

    async forgotPassword(email: string): Promise<void> {
        try {
            await api.post('/api/v1/users/forgot-password', { email });
        } catch (error) {
            console.error('Error requesting password reset:', error);
            throw error;
        }
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        try {
            await api.post('/api/v1/users/reset-password', {
                token,
                new_password: newPassword,
            });
        } catch (error) {
            console.error('Error resetting password:', error);
            throw error;
        }
    }
}

export default new UserService(); 
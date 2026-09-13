import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from './config';
import api from '../services/api';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '../store/authStore';

interface User {
    user_id: string;
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

class Auth {
    private static instance: Auth;
    private token: string | null = null;
    private user: User | null = null;

    private constructor() {}

    static getInstance(): Auth {
        if (!Auth.instance) {
            Auth.instance = new Auth();
        }
        return Auth.instance;
    }

    async login(email: string, password: string): Promise<{ token: string; user: User }> {
        try {
            const response = await api.post('/api/v1/users/login', {
                email,
                password
            });
            return await this.applyLoginResponse(response.data);
        } catch (error: any) {
            console.error('Login error:', error);
            if (error.response) {
                throw new Error(error.response.data?.message || 'Login failed');
            } else if (error.request) {
                throw new Error('Network error: Could not connect to server');
            } else {
                throw new Error(error.message || 'Login failed');
            }
        }
    }

    /** "Try Demo" -- POST /api/v1/users/demo creates a brand-new, fully
     * seeded demo account server-side (see adapters/orm/fixtures.py's
     * create_demo_account on the backend) and returns the exact same
     * {access_token, token_type, user} shape login() does, so it can reuse
     * the same session-setup path with no password/signup form involved. */
    async loginDemo(): Promise<{ token: string; user: User }> {
        try {
            const response = await api.post('/api/v1/users/demo');
            return await this.applyLoginResponse(response.data);
        } catch (error: any) {
            console.error('Demo login error:', error);
            if (error.response) {
                throw new Error(error.response.data?.message || 'Could not start demo');
            } else if (error.request) {
                throw new Error('Network error: Could not connect to server');
            } else {
                throw new Error(error.message || 'Could not start demo');
            }
        }
    }

    private async applyLoginResponse(data: LoginResponse): Promise<{ token: string; user: User }> {
        if (!data) {
            throw new Error('Login failed: No data received');
        }

        const { access_token, user } = data;

        if (!access_token || !user) {
            throw new Error('Login failed: Invalid response format');
        }

        this.token = access_token;
        this.user = user;

        // Store token and user data
        await AsyncStorage.setItem('access_token', access_token);
        await AsyncStorage.setItem('user_info', JSON.stringify({
            user_id: user.user_id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role
        }));

        // Store default workspace if exists
        if (user.default_workspace) {
            await Config.setDefaultWorkspace(user.default_workspace);
            await Config.setUserId(user.user_id);
        }

        // Reactive layer -- screens read auth state via useAuthStore,
        // not by polling AsyncStorage themselves.
        useAuthStore.getState().setToken(access_token);

        return { token: access_token, user };
    }

    async logout(): Promise<void> {
        try {
            // Clear all stored data
            await AsyncStorage.removeItem('access_token');
            await AsyncStorage.removeItem('user_info');
            await Config.clear(); // also clears the workspace store

            // Reset instance state
            this.token = null;
            this.user = null;

            useAuthStore.getState().setToken(null);
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    /** Rehydrate the reactive Zustand stores from what's already persisted
     * in AsyncStorage -- needed on app launch for a *returning* user, who
     * skips login() entirely (see app/_layout.tsx's checkAuth) and would
     * otherwise leave useAuthStore/useWorkspaceStore at their empty
     * initial state even though loggedIn() is true. */
    async hydrateStores(): Promise<void> {
        const token = await this.getToken();
        useAuthStore.getState().setToken(token);
        const workspace = await Config.getDefaultWorkspace();
        // setDefaultWorkspace also pushes into useWorkspaceStore, and
        // re-persists the same value it just read -- a harmless no-op
        // write, simpler than duplicating that sync logic here.
        await Config.setDefaultWorkspace(workspace);
    }

    async getToken(): Promise<string | null> {
        if (this.token) {
            return this.token;
        }

        try {
            const token = await AsyncStorage.getItem('access_token');
            if (token) {
                this.token = token;
                return token;
            }
            return null;
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    }

    async getProfile(): Promise<User | null> {
        if (this.user) {
            return this.user;
        }

        try {
            const userStr = await AsyncStorage.getItem('user_info');
            if (userStr) {
                this.user = JSON.parse(userStr);
                return this.user;
            }
            return null;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    async loggedIn(): Promise<boolean> {
        try {
            const token = await this.getToken();
            if (!token) return false;
            
            const decoded = jwtDecode<{ exp: number }>(token);
            return decoded.exp > Date.now() / 1000;
        } catch (error) {
            console.error('Error checking auth status:', error);
            return false;
        }
    }

    isAuthenticated(): boolean {
        return this.token !== null;
    }
}

export default Auth.getInstance(); 
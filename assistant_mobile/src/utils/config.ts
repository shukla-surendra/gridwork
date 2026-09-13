import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useWorkspaceStore } from '../store/workspaceStore';

// The backend dev server always listens on :8000. Where that server is
// *reachable from* depends on what's running the app:
//   - Android emulator: the emulator's own loopback isn't the host's --
//     10.0.2.2 is Android's documented alias for the host machine.
//   - iOS simulator: shares the host's network stack, so localhost works.
//   - A physical device (either platform) or a tunnel/Expo Go on a real
//     phone: neither localhost nor 10.0.2.2 resolves to the dev machine --
//     this needs the machine's real LAN IP (or a tool like ngrok/Expo's
//     tunnel), which is set via EXPO_PUBLIC_BACKEND_URL. Expo inlines any
//     EXPO_PUBLIC_* env var at build time, so this doesn't need any extra
//     config -- e.g. `EXPO_PUBLIC_BACKEND_URL=http://192.168.1.23:8000 npx expo start`.
// This used to be hardcoded to one developer's personal LAN IP, which
// only ever worked on that one machine on that one network.
const DEV_FALLBACK = Platform.select({
    android: 'http://10.0.2.2:8000',
    default: 'http://localhost:8000',
});

export const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || DEV_FALLBACK;

interface Workspace {
    workspace_id: string;
    name: string;
    description?: string;
}

class ConfigService {
    private static instance: ConfigService;
    private defaultWorkspace: Workspace | null = null;
    private userId: string | null = null;

    private constructor() {}

    static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    async setDefaultWorkspace(workspace: Workspace | null): Promise<void> {
        this.defaultWorkspace = workspace;
        if (workspace) {
            await AsyncStorage.setItem('defaultWorkspace', JSON.stringify(workspace));
        } else {
            await AsyncStorage.removeItem('defaultWorkspace');
        }
        // Keep the reactive Zustand store (what useWorkspaceId()/screens
        // actually subscribe to) in lockstep with persisted state --
        // nothing previously called setCurrentWorkspace() anywhere in the
        // app, so useWorkspaceId() always returned null and every
        // workspace-scoped screen (Boards, Notifications) silently broke.
        useWorkspaceStore.getState().setCurrentWorkspace(workspace);
    }

    async getDefaultWorkspace(): Promise<Workspace | null> {
        if (!this.defaultWorkspace) {
            const workspace = await AsyncStorage.getItem('defaultWorkspace');
            if (workspace) {
                this.defaultWorkspace = JSON.parse(workspace);
            }
        }
        return this.defaultWorkspace;
    }

    async setUserId(userId: string | null): Promise<void> {
        this.userId = userId;
        if (userId) {
            await AsyncStorage.setItem('userId', userId);
        } else {
            await AsyncStorage.removeItem('userId');
        }
    }

    async getUserId(): Promise<string> {
        if (!this.userId) {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                throw new Error('No user ID found');
            }
            this.userId = userId;
        }
        return this.userId;
    }

    async clear(): Promise<void> {
        this.defaultWorkspace = null;
        this.userId = null;
        await AsyncStorage.clear();
        useWorkspaceStore.getState().setCurrentWorkspace(null);
    }
}

const Config = ConfigService.getInstance();
export default Config;

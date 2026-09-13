import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import Auth from '../utils/auth';

// A previous version of this file also exported an AuthContext/
// AuthProvider pair (tracking auth state under yet a *third* AsyncStorage
// key, 'authToken') that was never mounted anywhere in the app -- dead
// code that also didn't match how login/logout actually work. Removed;
// Auth (src/utils/auth.ts) + the Zustand stores it syncs into are the
// single source of truth for auth/workspace state.
export function useAuth() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const signOut = useCallback(async () => {
        try {
            setIsLoading(true);
            await Auth.logout();
            router.replace('/(auth)/login');
        } catch (error) {
            console.error('Error signing out:', error);
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    return {
        signOut,
        isLoading,
    };
}

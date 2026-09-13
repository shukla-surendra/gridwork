import { create } from 'zustand';

// Purely reactive UI state -- NOT the source of truth for persistence.
// src/utils/auth.ts's Auth singleton is the only thing that touches
// AsyncStorage (under the 'access_token' key); it calls setToken() here
// after every login/logout so screens can subscribe to auth state
// reactively without each one re-implementing AsyncStorage reads. This
// used to have its own signOut() that removed a *different* AsyncStorage
// key ('token') than the one actually used for the session
// ('access_token' -- see auth.ts) -- tapping "Sign Out" cleared a key
// nothing read, so the session silently survived. Auth.logout() is the
// only place that should ever clear storage now.
interface AuthState {
    token: string | null;
    setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    setToken: (token: string | null) => set({ token }),
}));

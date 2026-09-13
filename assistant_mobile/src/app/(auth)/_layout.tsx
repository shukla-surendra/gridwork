import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import Auth from '@/utils/auth';

export default function AuthLayout() {
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const loggedIn = await Auth.loggedIn();
            if (loggedIn) {
                router.replace('/(tabs)');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    };

    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        />
    );
} 
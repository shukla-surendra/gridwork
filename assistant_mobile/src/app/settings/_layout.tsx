import { Stack } from 'expo-router';

export default function SettingsLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#fff',
                },
                headerTintColor: '#000',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: 'Settings',
                }}
            />
            <Stack.Screen
                name="assistant"
                options={{
                    title: 'Assistant',
                }}
            />
            <Stack.Screen
                name="theme"
                options={{
                    title: 'Theme',
                }}
            />
            <Stack.Screen
                name="privacy"
                options={{
                    title: 'Privacy',
                }}
            />
            <Stack.Screen
                name="workspace"
                options={{
                    title: 'Workspace',
                }}
            />
        </Stack>
    );
} 
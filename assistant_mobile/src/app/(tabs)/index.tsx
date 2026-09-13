import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import Auth from '../../utils/auth';

export default function HomeScreen() {
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const isLoggedIn = await Auth.loggedIn();
            if (!isLoggedIn) {
                router.replace('/(auth)/login');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            router.replace('/(auth)/login');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to Assistant.AI</Text>
            <Text style={styles.subtitle}>Your Personal Assistant</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
});

import { StyleSheet } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Link } from 'expo-router';

export default function NotFoundScreen() {
    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title">Oops!</ThemedText>
            <ThemedText style={styles.subtitle}>
                This screen doesn't exist.
            </ThemedText>
            <Link href="/" asChild>
                <ThemedText type="link" style={styles.link}>
                    Go to home screen!
                </ThemedText>
            </Link>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    subtitle: {
        marginTop: 10,
        marginBottom: 20,
    },
    link: {
        marginTop: 15,
        paddingVertical: 15,
    },
});

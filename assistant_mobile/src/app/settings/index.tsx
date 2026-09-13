import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColor } from '../../hooks/useThemeColor';

export default function SettingsScreen() {
    const router = useRouter();
    const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
    const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
    const cardColor = useThemeColor({ light: '#f0f0f0', dark: '#1C1C1E' }, 'background');
    const primaryColor = '#007AFF';

    const settings = [
        { title: 'Assistant', route: '/settings/assistant' as const },
        { title: 'Theme', route: '/settings/theme' as const },
        { title: 'Privacy', route: '/settings/privacy' as const },
        { title: 'Workspace', route: '/settings/workspace' as const },
    ];

    return (
        <View style={[styles.container, { backgroundColor }]}>
            {settings.map((setting) => (
                <TouchableOpacity
                    key={setting.title}
                    style={[styles.card, { backgroundColor: cardColor }]}
                    onPress={() => router.push(setting.route)}
                >
                    <Text style={[styles.title, { color: textColor }]}>{setting.title}</Text>
                    <Text style={[styles.arrow, { color: primaryColor }]}>→</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 8, marginBottom: 16 },
    title: { fontSize: 16 },
    arrow: { fontSize: 16 },
}); 
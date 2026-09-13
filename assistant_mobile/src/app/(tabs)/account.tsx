import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useThemeColor } from '../../hooks/useThemeColor';
import Auth from '../../utils/auth';

export default function AccountScreen() {
    const router = useRouter();
    const { signOut } = useAuth();
    const [profile, setProfile] = useState<{ first_name: string; last_name: string; email: string } | null>(null);
    const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
    const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
    const borderColor = useThemeColor({ light: '#f0f0f0', dark: '#38383A' }, 'border');

    useEffect(() => {
        Auth.getProfile().then(setProfile);
    }, []);

    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                            router.replace('/(auth)/login');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to sign out');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <View style={[styles.profileHeader, { borderBottomColor: borderColor }]}>
                <View style={styles.avatarContainer}>
                    <Ionicons name="person-circle" size={80} color="#007AFF" />
                </View>
                <Text style={[styles.userName, { color: textColor }]}>
                    {profile ? `${profile.first_name} ${profile.last_name}` : 'Loading...'}
                </Text>
                <Text style={[styles.userEmail, { color: textColor }]}>{profile?.email ?? ''}</Text>
            </View>

            <View style={styles.section}>
                <TouchableOpacity
                    style={[styles.menuItem, { borderBottomColor: borderColor }]}
                    onPress={() => router.push('/settings/workspace')}
                >
                    <Ionicons name="business-outline" size={24} color="#007AFF" />
                    <Text style={[styles.menuItemText, { color: textColor }]}>Workspaces</Text>
                    <Ionicons name="chevron-forward" size={24} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.menuItem, { borderBottomColor: borderColor }]}
                    onPress={() => router.push('/settings')}
                >
                    <Ionicons name="settings-outline" size={24} color="#007AFF" />
                    <Text style={[styles.menuItemText, { color: textColor }]}>Settings</Text>
                    <Ionicons name="chevron-forward" size={24} color="#666" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
                style={[styles.signOutButton, { 
                    backgroundColor,
                    borderTopColor: borderColor 
                }]} 
                onPress={handleSignOut}
            >
                <Ionicons name="log-out-outline" size={24} color="#ff3b30" />
                <Text style={[styles.signOutText, { color: '#ff3b30' }]}>Sign Out</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    profileHeader: {
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    avatarContainer: {
        marginBottom: 10,
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    userEmail: {
        fontSize: 16,
    },
    section: {
        marginTop: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
    },
    menuItemText: {
        flex: 1,
        fontSize: 16,
        marginLeft: 15,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        marginTop: 20,
        borderTopWidth: 1,
    },
    signOutText: {
        fontSize: 16,
        marginLeft: 10,
        fontWeight: '600',
    },
}); 
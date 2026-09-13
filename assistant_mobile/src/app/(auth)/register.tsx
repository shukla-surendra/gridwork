import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import userService from '../../services/userService';
import { useThemeColor } from '../../hooks/useThemeColor';

export default function RegisterScreen() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
    const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
    const borderColor = useThemeColor({ light: '#f0f0f0', dark: '#38383A' }, 'border');

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        const { email, password, confirmPassword, firstName, lastName } = formData;

        if (!email || !password || !confirmPassword || !firstName || !lastName) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters long');
            return;
        }

        setLoading(true);
        try {
            await userService.register({
                email,
                password,
                first_name: firstName,
                last_name: lastName,
            });
            Alert.alert(
                'Success',
                'Registration successful! Please login with your credentials.',
                [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
            );
        } catch (error: any) {
            console.error('Registration error:', error);
            Alert.alert(
                'Error',
                error.response?.data?.detail || 'Registration failed'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor }]}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color={textColor} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: textColor }]}>Create Account</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.nameContainer}>
                        <View style={[styles.inputContainer, { borderColor, flex: 1, marginRight: 10 }]}>
                            <TextInput
                                style={[styles.input, { color: textColor }]}
                                placeholder="First Name"
                                placeholderTextColor="#999"
                                value={formData.firstName}
                                onChangeText={(value) => handleChange('firstName', value)}
                                autoCapitalize="words"
                                editable={!loading}
                            />
                        </View>
                        <View style={[styles.inputContainer, { borderColor, flex: 1, marginLeft: 10 }]}>
                            <TextInput
                                style={[styles.input, { color: textColor }]}
                                placeholder="Last Name"
                                placeholderTextColor="#999"
                                value={formData.lastName}
                                onChangeText={(value) => handleChange('lastName', value)}
                                autoCapitalize="words"
                                editable={!loading}
                            />
                        </View>
                    </View>

                    <View style={[styles.inputContainer, { borderColor }]}>
                        <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: textColor }]}
                            placeholder="Email"
                            placeholderTextColor="#999"
                            value={formData.email}
                            onChangeText={(value) => handleChange('email', value)}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!loading}
                        />
                    </View>

                    <View style={[styles.inputContainer, { borderColor }]}>
                        <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: textColor }]}
                            placeholder="Password"
                            placeholderTextColor="#999"
                            value={formData.password}
                            onChangeText={(value) => handleChange('password', value)}
                            secureTextEntry={!showPassword}
                            editable={!loading}
                        />
                        <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#666"
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.inputContainer, { borderColor }]}>
                        <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: textColor }]}
                            placeholder="Confirm Password"
                            placeholderTextColor="#999"
                            value={formData.confirmPassword}
                            onChangeText={(value) => handleChange('confirmPassword', value)}
                            secureTextEntry={!showPassword}
                            editable={!loading}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Create Account</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.loginContainer}>
                        <Text style={[styles.loginText, { color: textColor }]}>
                            Already have an account?{' '}
                        </Text>
                        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                            <Text style={styles.loginLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    backButton: {
        marginRight: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    formContainer: {
        flex: 1,
    },
    nameContainer: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 15,
        backgroundColor: '#f8f8f8',
    },
    inputIcon: {
        marginLeft: 15,
    },
    input: {
        flex: 1,
        height: 50,
        paddingHorizontal: 15,
        fontSize: 16,
    },
    eyeIcon: {
        padding: 15,
    },
    button: {
        backgroundColor: '#007AFF',
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    buttonDisabled: {
        backgroundColor: '#81b0ff',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    loginText: {
        fontSize: 14,
    },
    loginLink: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '600',
    },
}); 
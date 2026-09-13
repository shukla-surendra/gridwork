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
import { useThemeColor } from '../../hooks/useThemeColor';
import Auth from '../../utils/auth';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [demoLoading, setDemoLoading] = useState(false);

    const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
    const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
    const borderColor = useThemeColor({ light: '#f0f0f0', dark: '#38383A' }, 'border');
    const inputBgColor = useThemeColor({ light: '#f8f8f8', dark: '#1c1c1e' }, 'background');
    const iconColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            await Auth.login(email, password);
            router.replace('/(tabs)');
        } catch (error: any) {
            console.error('Login error:', error);
            Alert.alert(
                'Login Failed',
                error.message || 'Invalid email or password'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleTryDemo = async () => {
        setDemoLoading(true);
        try {
            await Auth.loginDemo();
            router.replace('/(tabs)');
        } catch (error: any) {
            console.error('Demo login error:', error);
            Alert.alert('Could not start demo', error.message || 'Please try again');
        } finally {
            setDemoLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor }]}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.logoContainer}>
                    <Text style={[styles.logoText, { color: textColor }]}>Assistant.AI</Text>
                    <Text style={[styles.subtitle, { color: textColor }]}>Your Personal Assistant</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={[styles.inputContainer, { borderColor, backgroundColor: inputBgColor }]}>
                        <Ionicons name="mail-outline" size={20} color={iconColor} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: textColor }]}
                            placeholder="Email"
                            placeholderTextColor={iconColor}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!loading}
                        />
                    </View>

                    <View style={[styles.inputContainer, { borderColor, backgroundColor: inputBgColor }]}>
                        <Ionicons name="lock-closed-outline" size={20} color={iconColor} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: textColor }]}
                            placeholder="Password"
                            placeholderTextColor={iconColor}
                            value={password}
                            onChangeText={setPassword}
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
                                color={iconColor}
                            />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.forgotPassword, { borderColor }]}
                        onPress={() => router.push('/(auth)/forgot-password')}
                    >
                        <Text style={[styles.forgotPasswordText, { color: textColor }]}>
                            Forgot Password?
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.dividerContainer}>
                        <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
                        <Text style={[styles.dividerText, { color: iconColor }]}>or</Text>
                        <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
                    </View>

                    <TouchableOpacity
                        style={[styles.demoButton, { borderColor }, demoLoading && styles.buttonDisabled]}
                        onPress={handleTryDemo}
                        disabled={loading || demoLoading}
                    >
                        {demoLoading ? (
                            <ActivityIndicator color="#007AFF" />
                        ) : (
                            <>
                                <Ionicons name="rocket-outline" size={18} color="#007AFF" style={styles.demoButtonIcon} />
                                <Text style={styles.demoButtonText}>Try Now (Demo)</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.signUpContainer}>
                        <Text style={[styles.signUpText, { color: textColor }]}>
                            Don't have an account?{' '}
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                            <Text style={styles.signUpLink}>Sign Up</Text>
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
    logoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
    },
    formContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 15,
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
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 20,
    },
    forgotPasswordText: {
        fontSize: 14,
    },
    button: {
        backgroundColor: '#007AFF',
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonDisabled: {
        backgroundColor: '#81b0ff',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 12,
        fontSize: 13,
    },
    demoButton: {
        flexDirection: 'row',
        borderWidth: 1,
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    demoButtonIcon: {
        marginRight: 8,
    },
    demoButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
    signUpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signUpText: {
        fontSize: 14,
    },
    signUpLink: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '600',
    },
}); 
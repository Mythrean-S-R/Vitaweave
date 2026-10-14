import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
// @ts-ignore
import { Users, Mail, Lock, ChevronRight, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { signInWithEmail, signUpWithEmail, completeRoleLogin, loginDemoRole } from '../lib/auth';
import { isDevModeEnabled } from '../lib/devMode';

export default function AshaLoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const devMode = isDevModeEnabled();

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password.');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                if (!name) {
                    Alert.alert('Error', 'Please enter your name for registration.');
                    setLoading(false);
                    return;
                }
                const { error } = await signUpWithEmail(email, password, name, 'asha');
                if (error) throw error;
                Alert.alert('Success', 'Account created! Please log in.');
                setIsSignUp(false);
            } else {
                const { error } = await signInWithEmail(email, password);
                if (error) throw error;
                await completeRoleLogin('asha');
                router.replace('/(asha)');
            }
        } catch (error: any) {
            if (devMode && (error.message?.includes('URL is required') || error.message?.includes('Network request failed'))) {
                Alert.alert(
                    'Development Mode',
                    'Supabase not connected. Proceeding with mock login for local demo.',
                    [{
                        text: 'Proceed', onPress: async () => {
                            await loginDemoRole('asha');
                            router.replace('/(asha)');
                        },
                    }]
                );
            } else {
                Alert.alert('Authentication Failed', error.message ?? 'Login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        await loginDemoRole('asha');
        router.replace('/(asha)');
    };

    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <ArrowLeft size={20} color="#d97706" />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.header}>
                    <View style={styles.iconCircle}>
                        <Users size={36} color="#d97706" />
                    </View>
                    <Text style={styles.title}>ASHA Portal</Text>
                    <Text style={styles.subtitle}>{isSignUp ? 'Register as Health Worker' : 'Welcome Back'}</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.form}>

                    {isSignUp && (
                        <View style={styles.inputWrapper}>
                            <Users size={20} color="#94a3b8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Full Name"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        </View>
                    )}

                    <View style={styles.inputWrapper}>
                        <Mail size={20} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <Lock size={20} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, (!email || !password) && styles.buttonDisabled]}
                        onPress={handleAuth}
                        disabled={loading || !email || !password}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.buttonText}>
                                    {isSignUp ? 'Create Account' : 'Login securely'}
                                </Text>
                                <ChevronRight size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.changeBtn} onPress={() => setIsSignUp(!isSignUp)}>
                        <Text style={styles.changeText}>
                            {isSignUp ? 'Already have an account? Log in' : 'Need an account? Register'}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                {devMode && (
                    <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                        <Text style={styles.skipText}>Skip for now (Dev Demo)</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fffbeb' },
    scroll: {
        padding: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 48,
        paddingBottom: 40,
    },
    backBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24,
    },
    backText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#d97706' },
    header: { alignItems: 'center', marginBottom: 32 },
    iconCircle: {
        width: 90, height: 90, borderRadius: 28,
        backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center',
        marginBottom: 16, borderWidth: 2, borderColor: '#fde68a',
        shadowColor: '#d97706', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
    },
    title: { fontFamily: 'Inter-Bold', fontSize: 30, color: '#d97706', marginBottom: 4 },
    subtitle: { fontFamily: 'Inter-Medium', fontSize: 16, color: '#64748b' },
    form: { width: '100%' },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 14, borderWidth: 2, borderColor: '#fde68a',
        paddingHorizontal: 16, height: 56, marginBottom: 16,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 16, color: '#0f172a' },
    button: {
        backgroundColor: '#d97706', borderRadius: 14, height: 56,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
        shadowColor: '#d97706', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
        marginTop: 8,
    },
    buttonDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0 },
    buttonText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#fff' },
    changeBtn: { marginTop: 20, alignSelf: 'center' },
    changeText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#d97706' },
    skipBtn: { marginTop: 32, alignSelf: 'center' },
    skipText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#94a3b8', textDecorationLine: 'underline' },
});

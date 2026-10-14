import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
// @ts-ignore
import { Calendar, Activity, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { addDashboardTask } from '../../lib/api';
import { Colors, Fonts } from '../_constants/theme';
import type { TaskPriority } from '../_constants/data';

export default function AddTaskScreen() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('routine');
    const [iconType, setIconType] = useState<string>('calendar');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!title || !subtitle) {
            Alert.alert('Missing Fields', 'Please fill in Title and Subtitle.');
            return;
        }

        setLoading(true);
        try {
            const newTask = {
                title,
                subtitle,
                priority,
                icon: iconType,
            };

            const { error } = await addDashboardTask(newTask);

            if (error) throw error;

            Alert.alert('Success', 'Task added successfully.');
            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save task.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.headerBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create New Task</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                    <Text style={styles.sectionTitle}>Task Details</Text>

                    <View style={styles.inputWrapper}>
                        <Activity size={20} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Task Title (e.g. Call Sunita Devi)"
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Task Subtitle / Description"
                            value={subtitle}
                            onChangeText={setSubtitle}
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Priority</Text>
                    <View style={styles.row}>
                        {['routine', 'today', 'urgent'].map((p) => (
                            <TouchableOpacity
                                key={p}
                                style={[styles.pill, priority === p && styles.pillActive]}
                                onPress={() => setPriority(p as TaskPriority)}>
                                <Text style={[styles.pillText, priority === p && styles.pillTextActive]}>
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Type</Text>
                    <View style={styles.row}>
                        {['calendar', 'activity', 'heart'].map((t) => (
                            <TouchableOpacity
                                key={t}
                                style={[styles.pill, iconType === t && styles.pillActive]}
                                onPress={() => setIconType(t)}>
                                <Text style={[styles.pillText, iconType === t && styles.pillTextActive]}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                </Animated.View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.button, (!title || !subtitle) && styles.buttonDisabled]}
                    onPress={handleSave}
                    disabled={loading || !title || !subtitle}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Save Task</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    headerBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 16, backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.textPrimary },
    scroll: { padding: 24, paddingBottom: 40 },
    sectionTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textSecondary, marginBottom: 16 },
    row: { flexDirection: 'row', gap: 10 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0',
        paddingHorizontal: 16, height: 56, marginBottom: 16,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontFamily: Fonts.regular, fontSize: 16, color: '#0f172a' },
    pill: {
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
        backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: 'transparent',
    },
    pillActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    pillText: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textSecondary },
    pillTextActive: { color: Colors.primaryDark, fontFamily: Fonts.bold },
    footer: {
        padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    button: {
        backgroundColor: Colors.primary, borderRadius: 14, height: 56,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    },
    buttonDisabled: { backgroundColor: '#94a3b8' },
    buttonText: { fontFamily: Fonts.bold, fontSize: 16, color: '#fff' },
});

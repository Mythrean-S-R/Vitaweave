import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
// @ts-ignore
import { UserPlus, User, Hash, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { addPatient } from '../../lib/api';
import { mapPatientToDbInsert } from '../../lib/patientMapper';
import { supabase } from '../../lib/supabase';
import { newLocalId } from '../../lib/db/database';
import { getStoredUserId } from '../../lib/authGuard';

export default function DoctorAddPatientScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [condition, setCondition] = useState('');
    const [gender, setGender] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!name || !age || !condition) {
            Alert.alert('Missing Fields', 'Please fill in Name, Age, and Primary Condition.');
            return;
        }

        setLoading(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const storedId = await getStoredUserId();
            const doctorId = userData?.user?.id || storedId || undefined;

            const newPatientData = mapPatientToDbInsert(
                {
                    name,
                    age: parseInt(age, 10),
                    condition,
                    phone,
                    image: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
                    status: 'Active',
                    riskLevel: 'Medium',
                },
                {
                    id: newLocalId(),
                    gender: gender || 'Not Specified',
                    assigned_doctor_id: doctorId,
                }
            );

            const { error } = await addPatient(newPatientData);

            if (error) throw error;

            Alert.alert('Success', 'Patient registered successfully.');
            router.back();
        } catch (error: any) {
            console.error('Registration error:', error);
            
            // Handle specific error types
            if (error.message?.includes('Network request failed')) {
                Alert.alert(
                    'Network Error', 
                    'Unable to connect to the server. Please check your internet connection and try again.',
                    [{ text: 'OK' }]
                );
            } else if (error.message?.includes('duplicate key')) {
                Alert.alert(
                    'Duplicate Entry', 
                    'A patient with this information already exists.',
                    [{ text: 'OK' }]
                );
            } else if (error.message?.includes('permission')) {
                Alert.alert(
                    'Permission Denied', 
                    'You do not have permission to register patients. Please contact your administrator.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert(
                    'Registration Failed', 
                    error.message || 'An unexpected error occurred while registering the patient. Please try again.',
                    [{ text: 'OK' }]
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.headerBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <ArrowLeft size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Register New Patient</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                    <Text style={styles.sectionTitle}>Basic Information</Text>

                    <View style={styles.inputWrapper}>
                        <User size={20} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputWrapper, { flex: 1, marginRight: 12 }]}>
                            <Hash size={20} color="#94a3b8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Age"
                                value={age}
                                onChangeText={setAge}
                                keyboardType="number-pad"
                                maxLength={3}
                            />
                        </View>
                        <View style={[styles.inputWrapper, { flex: 1 }]}>
                            <TextInput
                                style={styles.input}
                                placeholder="Gender"
                                value={gender}
                                onChangeText={setGender}
                            />
                        </View>
                    </View>

                    <View style={styles.inputWrapper}>
                        <User size={20} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number (Optional)"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Medical Details</Text>

                    <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                        <AlertTriangle size={20} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { height: 76, textAlignVertical: 'top' }]}
                            placeholder="Primary Condition (e.g., Hypertension, Pregnancy)"
                            value={condition}
                            onChangeText={setCondition}
                            multiline
                        />
                    </View>

                </Animated.View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.button, (!name || !age || !condition) && styles.buttonDisabled]}
                    onPress={handleSave}
                    disabled={loading || !name || !age || !condition}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Register & Create Record</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f8fafc' },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#0f172a' },
    scroll: { padding: 24, paddingBottom: 40 },
    sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#64748b', marginBottom: 16 },
    row: { flexDirection: 'row' },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0',
        paddingHorizontal: 16, height: 56, marginBottom: 16,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 16, color: '#0f172a' },
    footer: {
        padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
    },
    button: {
        backgroundColor: '#0891b2', borderRadius: 14, height: 56,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        shadowColor: '#0891b2', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    buttonDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0 },
    buttonText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#fff' },
});
